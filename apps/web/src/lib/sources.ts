/** What a source chip needs to know about a source. */
export interface SourceLink {
  url: string;
  title: string | null;
}

/** Source id → link data, built once from the `/api/sources` list and passed to {@link SourceChips}. */
export type SourceIndex = ReadonlyMap<string, SourceLink>;

/** Display prefix per source-id prefix. */
const PREFIX: ReadonlyArray<readonly [string, string]> = [
  ["yt:", "YouTube "],
  ["web:", ""],
];

/**
 * Short label for a source id: "web:eloboost24-gladiator" →
 * "eloboost24-gladiator", "yt:dQw4w9WgXcQ" → "YouTube dQw4w9WgXcQ".
 *
 * @param id - a `<site>:<key>` source id
 * @returns the label; an id with an unknown prefix is returned unchanged
 */
export function sourceLabel(id: string): string {
  const match = PREFIX.find(([p]) => id.startsWith(p));
  return match ? match[1] + id.slice(match[0].length) : id;
}

/**
 * Indexes a source list by id.
 *
 * @param rows - sources as `/api/sources` returns them
 * @returns a map from source id to its URL and title
 */
export function indexSources(
  rows: ReadonlyArray<{ id: string; url: string; title?: string | null }>,
): SourceIndex {
  return new Map(rows.map((r) => [r.id, { url: r.url, title: r.title ?? null }]));
}

/**
 * A short label for a research record, for a chip or a select: its number
 * and the classes it covers ("001-gladiator-build" covering gladiator →
 * "001 Gladiator").
 *
 * @param slug - the record's slug
 * @param records - the loaded records, each with the classes it covers
 * @param labels - class → its label
 * @returns the label; the number alone when the record isn't known or
 *   covers no class, and the slug when it has no number
 */
export function recordLabel(
  slug: string,
  records: ReadonlyArray<{ slug: string; classes: readonly string[] }>,
  labels: Readonly<Record<string, string>>,
): string {
  const number = /^\d+/.exec(slug)?.[0] ?? slug;
  const classes = records.find((r) => r.slug === slug)?.classes ?? [];
  const named = classes.map((c) => labels[c] ?? c);
  return named.length ? `${number} ${named.join(", ")}` : number;
}

/** An index with no sources, for use before `/api/sources` has loaded. */
export const EMPTY_SOURCES: SourceIndex = new Map();
