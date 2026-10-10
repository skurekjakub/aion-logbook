import type { AnyFilters as Filters, AnyListFilter } from "../registry";

/**
 * Builds the test one filter value puts every view through.
 *
 * @param match - the filter's declared match
 * @param value - the requested value
 * @returns a predicate that is `true` for a view the value matches
 */
function matcher<View>(match: AnyListFilter["match"], value: string): (view: View) => boolean {
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
  if ("equalsOrNull" in match) {
    return (view) => {
      const stored = field(view, match.equalsOrNull);
      return stored == null || stored === value;
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
 * @returns the matching views, in their original order
 */
export function applyFilters<View>(
  views: View[],
  filters: Filters | undefined,
  values: Readonly<Record<string, string | undefined>> | undefined,
): View[] {
  const tests = Object.entries(filters ?? {}).flatMap(([name, { match }]) => {
    const value = values?.[name];
    return value === undefined ? [] : [matcher<View>(match, value)];
  });
  return tests.length === 0 ? views : views.filter((view) => tests.every((test) => test(view)));
}
