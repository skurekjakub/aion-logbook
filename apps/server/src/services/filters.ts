import type { AnyFilters as Filters, AnyListFilter } from "../registry";

/** The classes each research record covers, by record slug. */
export type RecordCoverage = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Builds the test one filter value puts every view through.
 *
 * @param match - the filter's declared match
 * @param value - the requested value
 * @param coverage - reads the records' classes, for an `equalsOrCovered` match
 * @returns a predicate that is `true` for a view the value matches
 */
function matcher<View>(
  match: AnyListFilter["match"],
  value: string,
  coverage: () => RecordCoverage,
): (view: View) => boolean {
  /**
   * Reads one column of a view.
   *
   * @param view - the view
   * @param column - the column's key
   * @returns the column's value
   */
  const field = (view: View, column: string) => (view as Record<string, unknown>)[column];
  if ("equals" in match) {
    return (view) => {
      const stored = field(view, match.equals);
      return typeof stored === "number" ? stored === Number(value) : stored === value;
    };
  }
  if ("equalsOrCovered" in match) {
    const covered = coverage();
    return (view) => {
      const stored = field(view, match.equalsOrCovered);
      if (stored != null) return stored === value;
      const record = field(view, "recordSlug");
      return typeof record !== "string" || covered.get(record)?.has(value) === true;
    };
  }
  if ("includes" in match) {
    return (view) => (field(view, match.includes) as unknown[]).includes(value);
  }
  const wanted = value === "true";
  return (view) => (field(view, match.isNull) == null) === wanted;
}

/**
 * Keeps the views that every given filter value matches, as each filter's
 * declared match says (see the registry's `FilterMatch`).
 *
 * @param views - the views, in list order
 * @param filters - the type's declared list filters, by query param name
 * @param values - the requested values, by the same names; an absent or
 *   `undefined` value doesn't filter
 * @param coverage - reads the classes each research record covers, called
 *   only when an `equalsOrCovered` filter is given a value; without it, no
 *   record covers any class
 * @returns the matching views, in their original order
 */
export function applyFilters<View>(
  views: View[],
  filters: Filters | undefined,
  values: Readonly<Record<string, string | undefined>> | undefined,
  coverage: () => RecordCoverage = () => new Map(),
): View[] {
  const tests = Object.entries(filters ?? {}).flatMap(([name, { match }]) => {
    const value = values?.[name];
    return value === undefined ? [] : [matcher<View>(match, value, coverage)];
  });
  return tests.length === 0 ? views : views.filter((view) => tests.every((test) => test(view)));
}
