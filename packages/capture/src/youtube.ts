/**
 * YouTube watch pages and searches, from the page HTML: a port of the
 * retired `ytv.py` (the raw watch page plus a text digest of its title,
 * channel, dates, description and top comments) and `ytall.py` (raw search
 * result pages and the videos and Shorts they list).
 *
 * @module
 */
import type { CaptureContext } from "./context";
import { exists, logCapture, writeText } from "./context";
import type { HttpOptions } from "./http";
import { DESKTOP_UA, HttpClient } from "./http";
import { pyGet, pyQuote, pyRepr, pyStr } from "./text";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The pause between videos, in milliseconds. */
export const YT_DELAY_MS = 500;

/** A comment of a digest: author, text and like count. */
export type YtComment = readonly [author: string, text: string, likes: string];

/** One video or Short a search page lists: id, title, channel, published, views. */
export type YtHit = readonly [
  id: string,
  title: string,
  channel: string,
  published: string,
  views: string,
];

/**
 * Builds a YouTube client: desktop Chrome, English first, and the consent
 * cookie that skips the EU consent page.
 *
 * @param overrides - hooks for tests (fetch, sleep, log)
 * @returns the client
 */
export function youtubeClient(overrides: Partial<HttpOptions> = {}): HttpClient {
  return new HttpClient({
    userAgent: DESKTOP_UA,
    headers: { "Accept-Language": "en-US,en;q=0.9" },
    cookies: { "youtube.com": { CONSENT: "YES+1" } },
    delayMs: YT_DELAY_MS,
    ...overrides,
  });
}

/**
 * Extracts a JSON object a watch page assigns to a global, as `ytv.py`'s
 * `J` did: the first `var NAME = {...};` or `window["NAME"] = {...};` on
 * one line, followed by `var ` or `</script>`.
 *
 * @param html - the page
 * @param name - the global, e.g. `ytInitialPlayerResponse`
 * @returns the parsed object, or `{}` when the page doesn't assign it
 * @throws if the matched text isn't JSON
 */
export function pageGlobal(html: string, name: string): Record<string, unknown> {
  const re = new RegExp(`(?:var |window\\[")${name}"?\\]? = (\\{[^\\n]*?\\});(?:var |</script>)`);
  const match = re.exec(html);
  return match ? (JSON.parse(match[1]!) as Record<string, unknown>) : {};
}

/**
 * Collects every value stored under `key` anywhere in parsed JSON, depth
 * first in key order, descending into matched values too.
 *
 * @param value - parsed JSON
 * @param key - the key to look for
 * @param out - the list to append to
 * @returns `out`
 */
export function findKey(value: unknown, key: string, out: unknown[] = []): unknown[] {
  if (Array.isArray(value)) {
    for (const item of value) findKey(item, key, out);
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === key) out.push(v);
      findKey(v, key, out);
    }
  }
  return out;
}

/**
 * Finds the continuation token of a watch page's comment section.
 *
 * @param data - the page's `ytInitialData`
 * @returns the token of the last `comment-item-section`, or `null`
 */
export function commentToken(data: unknown): string | null {
  let token: string | null = null;
  for (const section of findKey(data, "itemSectionRenderer")) {
    if (pyGet(section, "sectionIdentifier") !== "comment-item-section") continue;
    const tokens = findKey(section, "token");
    token = tokens.length > 0 ? String(tokens[0]) : null;
  }
  return token;
}

/**
 * Reads the comments an innertube `next` answer carries.
 *
 * @param body - the parsed answer
 * @returns each comment's author, text and like count, in order
 */
export function parseCommentPayloads(body: unknown): YtComment[] {
  return findKey(body, "commentEntityPayload").map((m) => {
    const props = pyGet(m, "properties", {});
    const author = pyGet(m, "author", {});
    return [
      pyStr(pyGet(author, "displayName", "")),
      pyStr(pyGet(pyGet(props, "content", {}), "content", "")),
      pyStr(pyGet(pyGet(m, "toolbar", {}), "likeCountNotliked", "")),
    ] as const;
  });
}

/**
 * Fetches a watch page's top comments through innertube's `next` endpoint.
 *
 * @param context - the run
 * @param html - the watch page
 * @param data - its `ytInitialData`
 * @returns the comments; `[]` when the page carries no API key or comment token
 * @throws if the page has a key but no client version, or the call fails
 */
export async function fetchTopComments(
  context: CaptureContext,
  html: string,
  data: unknown,
): Promise<YtComment[]> {
  const key = /"INNERTUBE_API_KEY":"([^"]+)"/.exec(html);
  const version = /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(html);
  if (!key) return [];
  const token = commentToken(data);
  if (!token) return [];
  if (!version) throw new Error("the page has no INNERTUBE_CLIENT_VERSION");
  const response = await context.http.send(
    `https://www.youtube.com/youtubei/v1/next?key=${key[1]}`,
    {
      json: {
        context: { client: { clientName: "WEB", clientVersion: version[1], hl: "ko" } },
        continuation: token,
      },
      timeoutMs: 30_000,
    },
  );
  return parseCommentPayloads(JSON.parse(await response.text()));
}

/**
 * Formats a watch page's digest, byte for byte as `ytv.py` wrote it. Its
 * `captions` field is always `[]`: `ytv.py` read the tracks from the
 * default list it passed to its key search, never from the page, and the
 * port keeps the format.
 *
 * @param vid - the video id
 * @param html - the watch page
 * @param comments - its top comments, or one `["ERR", message, ""]` entry
 * @returns the digest text
 * @throws if the page's embedded JSON doesn't parse
 */
export function renderDigest(vid: string, html: string, comments: readonly YtComment[]): string {
  const player = pageGlobal(html, "ytInitialPlayerResponse");
  const details = pyGet(player, "videoDetails", {});
  const micro = pyGet(pyGet(player, "microformat", {}), "playerMicroformatRenderer", {});
  /**
   * Prints a field as ytv.py's f-string did.
   *
   * @param from - the parsed object
   * @param key - the field
   * @returns its `str()`, `None` when absent
   */
  const field = (from: unknown, key: string) => pyStr(pyGet(from, key));
  let text =
    `# ${field(details, "title")}\n- url: https://www.youtube.com/watch?v=${vid}\n` +
    `- channel: ${field(details, "author")}\n- published: ${field(micro, "publishDate")}\n` +
    `- views: ${field(details, "viewCount")}\n- length_s: ${field(details, "lengthSeconds")}\n` +
    `- captions: ${pyRepr([])}\n\n## Description\n${field(details, "shortDescription")}\n\n` +
    `## Top comments (${comments.length})\n`;
  for (const [author, body, likes] of comments) text += `- ${author} [${likes}]: ${body}\n`;
  return text;
}

/**
 * Captures each video's watch page as `<outdir>/yt-<id>.html` and its
 * digest as `<outdir>/yt-<id>.txt`, each with its ledger line. A saved page
 * is reused rather than fetched again; a video whose digest exists is
 * skipped. A failed comment fetch goes into the digest as an `ERR` line.
 *
 * @param context - the run
 * @param outdir - the record-relative folder, under `evidence/`
 * @param vids - the video ids
 * @returns each digest's text, in order
 * @throws if a watch page doesn't load, or a file's ledger line can't be written
 */
export async function youtubeWatch(
  context: CaptureContext,
  outdir: string,
  vids: readonly string[],
): Promise<string[]> {
  const digests: string[] = [];
  for (const vid of vids) {
    const pagePath = `${outdir}/yt-${vid}.html`;
    const digestPath = `${outdir}/yt-${vid}.txt`;
    const url = `https://www.youtube.com/watch?v=${vid}`;
    if (exists(context, digestPath)) {
      context.log(`skip ${vid}: ${digestPath} exists`);
      continue;
    }
    let html: string;
    if (exists(context, pagePath)) {
      html = readFileSync(join(context.recordDir, pagePath), "utf-8");
    } else {
      const response = await context.http.get(`${url}&hl=ko`, { timeoutMs: 30_000 });
      if (!response) throw new Error(`${url} did not answer 200`);
      const at = context.now();
      html = await response.text();
      writeText(context, pagePath, html);
      logCapture(context, pagePath, `${url}&hl=ko`, at);
    }
    let comments: YtComment[];
    try {
      comments = await fetchTopComments(context, html, pageGlobal(html, "ytInitialData"));
    } catch (err) {
      comments = [["ERR", (err as Error).message, ""]];
    }
    const at = context.now();
    const digest = renderDigest(vid, html, comments);
    writeText(context, digestPath, digest);
    logCapture(context, digestPath, url, at);
    digests.push(digest);
    await context.http.pause();
  }
  return digests;
}

/**
 * Collects the videos and Shorts a search page's `ytInitialData` lists, as
 * `ytall.py`'s `walk` did.
 *
 * @param value - parsed `ytInitialData`, or any part of it
 * @param out - the list to append to
 * @returns `out`
 */
export function searchHits(value: unknown, out: YtHit[] = []): YtHit[] {
  if (Array.isArray(value)) {
    for (const item of value) searchHits(item, out);
    return out;
  }
  if (value === null || typeof value !== "object") return out;
  const node = value as Record<string, unknown>;
  if ("videoRenderer" in node) {
    const v = node.videoRenderer;
    /**
     * Joins a text object's runs.
     *
     * @param from - an object with `runs`
     * @returns the runs' text, concatenated
     */
    const runs = (from: unknown) =>
      (pyGet(from, "runs", []) as unknown[]).map((r) => pyStr(pyGet(r, "text", ""))).join("");
    out.push([
      pyStr(pyGet(v, "videoId")),
      runs(pyGet(v, "title", {})),
      runs(pyGet(v, "ownerText", {})),
      pyStr(pyGet(pyGet(v, "publishedTimeText", {}), "simpleText", "")),
      pyStr(pyGet(pyGet(v, "viewCountText", {}), "simpleText", "")),
    ]);
  }
  for (const key of ["reelItemRenderer", "shortsLockupViewModel"]) {
    if (!(key in node)) continue;
    const json = JSON.stringify(node[key]);
    const id = /"videoId":\s*"([^"]+)"/.exec(json);
    const title = /"accessibilityText":\s*"([^"]{5,300})"/.exec(json);
    out.push([id ? id[1]! : "?", `[SHORT] ${title ? title[1]! : ""}`, "", "", ""]);
  }
  for (const child of Object.values(node)) searchHits(child, out);
  return out;
}

/**
 * Names a search page's capture as `ytall.py` did.
 *
 * @param query - the search query
 * @param newest - whether it's the upload-date-ordered page
 * @returns `ytq-<query, runs of other characters as _, 40 at most>[-new].html`
 */
export function searchFile(query: string, newest: boolean): string {
  const stem = Array.from(query.replace(/[^A-Za-z0-9가-힣一-龥]+/gu, "_"))
    .slice(0, 40)
    .join("");
  return `ytq-${stem}${newest ? "-new" : ""}.html`;
}

/**
 * Searches YouTube for each query, by relevance and by upload date, saving
 * each result page as `<outdir>/ytq-<query>[-new].html` with its ledger
 * line, and lists every video and Short found, first sighting kept. A
 * query whose page fails is reported and skipped; a page already saved is
 * read from disk.
 *
 * @param context - the run
 * @param outdir - the record-relative folder, under `evidence/`
 * @param queries - the search queries
 * @returns every hit, as tab-separated lines
 * @throws if a page's ledger line can't be written
 */
export async function youtubeSearch(
  context: CaptureContext,
  outdir: string,
  queries: readonly string[],
): Promise<string[]> {
  const seen = new Map<string, YtHit>();
  for (const query of queries) {
    for (const newest of [false, true]) {
      const url = `https://www.youtube.com/results?search_query=${pyQuote(query)}${newest ? "&sp=CAI%253D" : ""}`;
      const path = `${outdir}/${searchFile(query, newest)}`;
      let html: string;
      if (exists(context, path)) {
        html = readFileSync(join(context.recordDir, path), "utf-8");
      } else {
        const response = await context.http.get(url, { timeoutMs: 30_000 });
        if (!response) {
          context.log(`ERR ${query} ${url}`);
          continue;
        }
        const at = context.now();
        html = await response.text();
        writeText(context, path, html);
        logCapture(context, path, url, at);
      }
      const match = /var ytInitialData = (\{[^\n]*?\});<\/script>/.exec(html);
      const hits = match ? searchHits(JSON.parse(match[1]!)) : [];
      for (const hit of hits) if (!seen.has(hit[0])) seen.set(hit[0], hit);
    }
  }
  return [...seen.values()].map((hit) => hit.join("\t"));
}
