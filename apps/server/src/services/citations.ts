import { UnknownRefsError } from "../errors";
import type { Repos } from "../repos";

/** A row with the source ids that back it. */
export type Cited<Row> = Row & { sources: string[] };

/**
 * Verifies that every id in `ids` is a known source.
 *
 * @param repos - repos to check against
 * @param ids - candidate source ids
 * @throws {UnknownRefsError} naming every id in `ids` that doesn't exist,
 *   `kind` `"sources"`
 */
export function assertSourcesExist(repos: Repos, ids: string[]): void {
  const missing = repos.sources.missing(ids);
  if (missing.length > 0) throw new UnknownRefsError("sources", missing);
}
