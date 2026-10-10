/**
 * The obsolete lifecycle in the web app: telling current recommendation
 * rows from obsolete ones. `/api` rows fit these shapes as they are.
 *
 * @module
 */

/**
 * A row with the obsolete lifecycle: `obsoleteSince` is unset or null while
 * it is current; an obsolete row says why and cites the sources that say so.
 */
export interface Lifecycle {
  obsoleteSince?: string | null;
  obsoleteReason?: string | null;
  obsoleteSources?: readonly string[];
}

/**
 * Reports whether a row is a current recommendation.
 *
 * @param row - the row
 * @returns `true` when it has no `obsoleteSince`
 */
export function isCurrent(row: Lifecycle): boolean {
  return row.obsoleteSince == null;
}

/**
 * Orders obsolete rows the most recently obsoleted first.
 *
 * @param a - a row
 * @param b - another row
 * @returns a negative number when `a` became obsolete after `b`
 */
function bySinceDesc(a: Lifecycle, b: Lifecycle): number {
  return (b.obsoleteSince ?? "").localeCompare(a.obsoleteSince ?? "");
}

/**
 * Splits rows into the current ones, in their order, and the obsolete ones,
 * the most recently obsoleted first (ties keep their order).
 *
 * @param rows - the rows, in list order
 * @returns `current` and `obsolete`
 */
export function splitObsolete<T extends Lifecycle>(
  rows: readonly T[],
): { current: T[]; obsolete: T[] } {
  return {
    current: rows.filter(isCurrent),
    obsolete: rows.filter((row) => !isCurrent(row)).sort(bySinceDesc),
  };
}
