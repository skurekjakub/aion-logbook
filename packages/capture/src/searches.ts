/**
 * A research record's saved searches, `searches.json` at the record's
 * root: what a refresh round reruns before its discovery searches. Each
 * entry names where it runs and what to run there, why it exists, the
 * round that added it, and the last round it found something (a search
 * that finds nothing keeps that date and is never deleted).
 *
 * @module
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isoDate } from "@aion/schema";
import { z } from "zod";

/** The file's name, at the record folder's root. */
export const SEARCHES_FILE = "searches.json";

/** Where a saved search runs. */
export const SEARCH_KIND = ["youtube", "web"] as const;
/** Where a saved search runs. */
export type SearchKind = (typeof SEARCH_KIND)[number];

/** What every saved search carries besides what to run. */
const common = {
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "expected a lowercase slug"),
  why: z.string().min(1),
  added: isoDate,
  lastHit: isoDate.nullable(),
};

/** A YouTube search (`pnpm capture youtube search`). */
const youtubeQuery = z.strictObject({
  ...common,
  kind: z.literal("youtube"),
  query: z.string().min(1),
});

/** A YouTube channel's uploads, by its handle. */
const youtubeChannel = z.strictObject({
  ...common,
  kind: z.literal("youtube"),
  channel: z.string().regex(/^@\S+$/, "expected a channel handle, @name"),
});

/** A web page, captured whole every round. */
const webPage = z.strictObject({ ...common, kind: z.literal("web"), url: z.url() });

/** One saved search. Its last hit, when it has one, is no earlier than the round that added it. */
export const savedSearch = z
  .union([youtubeQuery, youtubeChannel, webPage])
  .refine((s) => s.lastHit === null || s.lastHit >= s.added, {
    message: "lastHit can't be before added",
    path: ["lastHit"],
  });
/** Output of {@link savedSearch}. */
export type SavedSearch = z.output<typeof savedSearch>;

/** A record's `searches.json`: its saved searches, each id once. */
export const searchesFile = z.array(savedSearch).superRefine((searches, ctx) => {
  const seen = new Set<string>();
  searches.forEach((search, index) => {
    if (seen.has(search.id)) {
      ctx.addIssue({ code: "custom", message: `duplicate id "${search.id}"`, path: [index, "id"] });
    }
    seen.add(search.id);
  });
});

/**
 * Reads and validates a record's saved searches.
 *
 * @param recordDir - absolute path to the record folder
 * @returns the searches, or `null` when the record has no `searches.json`
 * @throws `SyntaxError` when the file isn't JSON, and `ZodError` when it
 *   isn't a valid search list
 */
export function readSearches(recordDir: string): SavedSearch[] | null {
  const file = join(recordDir, SEARCHES_FILE);
  if (!existsSync(file)) return null;
  return searchesFile.parse(JSON.parse(readFileSync(file, "utf-8")));
}

/** A README heading a refresh round adds: `## Refresh YYYY-MM-DD`. */
const REFRESH_HEADING = /^## Refresh (\d{4}-\d{2}-\d{2})\b/gm;

/**
 * Lists the rounds a record has run: its first, the day its
 * `import.json` says it started, and each round a `## Refresh <date>`
 * section of its README records.
 *
 * @param recordDir - absolute path to the record folder
 * @returns the rounds' dates, sorted
 * @throws `Error` when the record has no `import.json` or no README, and
 *   `SyntaxError` when `import.json` isn't JSON
 */
export function recordRounds(recordDir: string): string[] {
  const manifest = JSON.parse(readFileSync(join(recordDir, "import.json"), "utf-8")) as {
    record?: { startedAt?: unknown };
  };
  const readme = readFileSync(join(recordDir, "README.md"), "utf-8");
  const rounds = new Set([...readme.matchAll(REFRESH_HEADING)].map((match) => match[1]!));
  const started = manifest.record?.startedAt;
  if (typeof started === "string") rounds.add(started);
  return [...rounds].sort();
}

/**
 * Checks that each saved search was added in, and last found something in,
 * a round the record ran.
 *
 * @param searches - the record's saved searches
 * @param rounds - the record's rounds (see {@link recordRounds})
 * @returns one line per date that isn't a round, naming the search; empty when every date is
 */
export function searchRoundProblems(
  searches: readonly SavedSearch[],
  rounds: readonly string[],
): string[] {
  const ran = new Set(rounds);
  return searches.flatMap((search) =>
    (["added", "lastHit"] as const).flatMap((field) => {
      const date = search[field];
      return date === null || ran.has(date)
        ? []
        : [`${search.id}: ${field} ${date} isn't a round the record ran`];
    }),
  );
}
