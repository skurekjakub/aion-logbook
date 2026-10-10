/**
 * Fetches one character's public data from the official Aion 2 site: a
 * name search on the search host when no `characterId` is cached, then the
 * info and equipment responses. The endpoints and their parameters are
 * `research/002-character-data-source/README.md`.
 *
 * @module
 */
import { z } from "zod";

/** The search host's global character search. */
const SEARCH_URL = "https://api-search.plaync.com/aion2global/search/v2/character";

/** The official site's character endpoints. */
const SITE = "https://aion2.plaync.com/api/character";

/** The locale every request asks for. */
const LOCALE = "en-US";

/** How long one request may take before it is abandoned, in milliseconds. */
const TIMEOUT_MS = 30_000;

/** Says who is asking, so the site can tell this client apart from a browser. */
export const USER_AGENT =
  "aion-logbook-sync/1 (one character, on demand; https://github.com/skurekjakub/aion-logbook)";

/** `account/character.json`: which character the sync reads. */
export const characterFile = z.object({
  /** The character's name, exactly as the game spells it. */
  name: z.string().min(1),
  /** The official site's region, e.g. `eu`. */
  region: z.string().min(1),
  /** The server's id on the official site, e.g. `2319` for Fafnir. */
  serverId: z.number().int(),
  /** The server as the snapshot shows it, e.g. `Fafnir (EU)`. */
  server: z.string().min(1),
  /** The character's id on the official site, decoded; found by name search when absent. */
  characterId: z.string().min(1).optional(),
});
/** Output of {@link characterFile}. */
export type CharacterFile = z.output<typeof characterFile>;

/** The official responses for one character, as `toSnapshot` reads them. */
export interface CharacterData {
  /** The region the requests were made under, e.g. `eu`. */
  region: string;
  /** The character's id on the official site, decoded (`=`, not `%3D`). */
  characterId: string;
  /** The `GET /api/character/info` body: profile, stats, titles, Daevanion boards. */
  info: unknown;
  /** The `GET /api/character/equipment` body: gear, pet and wings, skills with levels. */
  equipment: unknown;
}

/** An HTTP answer: its status and body text. */
export interface HttpResponse {
  /** The status code. */
  status: number;
  /** The body, as text. */
  body: string;
}

/**
 * Sends one GET request and resolves with the answer, whatever its status.
 *
 * @param url - the full URL, query string included
 * @param headers - the request headers
 * @returns the status and body
 * @throws if no answer arrives (network failure, timeout)
 */
export type Http = (url: string, headers: Record<string, string>) => Promise<HttpResponse>;

/** A request answered with a status that isn't 2xx, after the retry a 5xx gets. */
export class HttpError extends Error {
  override name = "HttpError";

  /**
   * Builds the error.
   *
   * @param request - what was asked for, e.g. `character info`
   * @param status - the status answered
   * @param body - the body answered, cut to a line in the message
   */
  constructor(
    readonly request: string,
    readonly status: number,
    body: string,
  ) {
    super(`${request} answered ${status}: ${body.slice(0, 200).replace(/\s+/g, " ").trim()}`);
  }
}

/** The name search didn't settle on one character. */
export class CharacterMatchError extends Error {
  override name = "CharacterMatchError";
}

/** One row of the search response that the match reads. */
const searchResponse = z.object({
  list: z.array(
    z.object({ characterId: z.string().min(1), name: z.string(), serverId: z.number().int() }),
  ),
});

/**
 * Sends a request through `fetch` with a timeout.
 *
 * @param url - the full URL
 * @param headers - the request headers
 * @returns the status and body text
 * @throws if no answer arrives within the timeout or the network fails
 */
export const fetchHttp: Http = async (url, headers) => {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: res.status, body: await res.text() };
};

/**
 * GETs a JSON body: a 5xx is retried once, any other non-2xx fails at once.
 *
 * @param http - the HTTP door
 * @param request - what is asked for, as errors name it
 * @param url - the full URL
 * @returns the parsed body
 * @throws {HttpError} on a non-2xx answer, or when the body isn't JSON
 */
async function getJson(http: Http, request: string, url: string): Promise<unknown> {
  const headers = { Accept: "application/json", "User-Agent": USER_AGENT };
  let res = await http(url, headers);
  if (res.status >= 500) res = await http(url, headers);
  if (res.status < 200 || res.status >= 300) throw new HttpError(request, res.status, res.body);
  try {
    return JSON.parse(res.body) as unknown;
  } catch {
    throw new HttpError(request, res.status, `a body that isn't JSON: ${res.body}`);
  }
}

/**
 * Builds a URL from a base and query parameters.
 *
 * @param base - the URL without its query
 * @param params - the query parameters, in order
 * @returns the URL
 */
function withQuery(base: string, params: Record<string, string | number>): string {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]): [string, string] => [key, String(value)]),
  );
  return `${base}?${query.toString()}`;
}

/**
 * Builds the URL of one of the character endpoints.
 *
 * @param endpoint - `info` or `equipment`
 * @param character - the character's region and server
 * @param characterId - the character's id
 * @returns the URL
 */
function characterUrl(
  endpoint: "info" | "equipment",
  character: CharacterFile,
  characterId: string,
): string {
  return withQuery(`${SITE}/${endpoint}`, {
    region: character.region,
    lang: LOCALE,
    characterId,
    serverId: character.serverId,
  });
}

/**
 * Finds the character's id by name search: the highlight markup is
 * stripped, rows on other servers are dropped and the name is compared
 * case-sensitively, since the search itself matches any substring in any
 * case.
 *
 * @param character - the character to find
 * @param http - the HTTP door
 * @returns the character's id, decoded
 * @throws {CharacterMatchError} unless exactly one row matches
 * @throws {HttpError} if the search fails
 */
async function searchId(character: CharacterFile, http: Http): Promise<string> {
  const url = withQuery(SEARCH_URL, {
    keyword: character.name,
    serverId: character.serverId,
    page: 1,
    size: 40,
    region: character.region,
    localeInfo: LOCALE,
  });
  const parsed = searchResponse.safeParse(await getJson(http, "character search", url));
  if (!parsed.success) {
    throw new CharacterMatchError(
      `character search answered an unexpected shape: ${parsed.error.message}`,
    );
  }
  const matches = parsed.data.list.filter(
    (row) =>
      row.serverId === character.serverId &&
      row.name.replace(/<\/?strong>/g, "") === character.name,
  );
  const [match] = matches;
  if (matches.length !== 1 || !match) {
    const found = matches.length === 0 ? "no character" : "more than one character";
    throw new CharacterMatchError(
      `${found} named ${character.name} on server ${character.serverId} (${character.region})`,
    );
  }
  return decodeURIComponent(match.characterId);
}

/**
 * Fetches the character's public data: its id by name search when
 * `character.characterId` is absent, then the info and equipment
 * responses, one request at a time. When a cached id answers 404 (deleted,
 * moved or renamed), the name is searched once and the info asked again
 * with the id found.
 *
 * @param character - which character, from `account/character.json`
 * @param http - the HTTP door
 * @returns the responses and the id they were fetched with
 * @throws {HttpError} naming the request and status on a non-2xx answer
 *   (after one retry on a 5xx) or a body that isn't JSON
 * @throws {CharacterMatchError} if the name search doesn't settle on one character
 */
export async function fetchCharacter(character: CharacterFile, http: Http): Promise<CharacterData> {
  const cached = character.characterId;
  let characterId = cached ?? (await searchId(character, http));
  let info: unknown;
  try {
    info = await getJson(http, "character info", characterUrl("info", character, characterId));
  } catch (err) {
    if (!(err instanceof HttpError && err.status === 404 && cached !== undefined)) throw err;
    const found = await searchId(character, http);
    if (found === cached) throw err;
    characterId = found;
    info = await getJson(http, "character info", characterUrl("info", character, characterId));
  }
  const equipment = await getJson(
    http,
    "character equipment",
    characterUrl("equipment", character, characterId),
  );
  return { region: character.region, characterId, info, equipment };
}
