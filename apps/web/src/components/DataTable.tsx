import type { Key, ReactNode } from "react";

/** One column of a {@link DataTable}. */
export interface Column<T> {
  /** Header cell content. */
  header: ReactNode;
  /** Renders the row's cell. */
  cell: (row: T) => ReactNode;
  /**
   * Class for the column's `<td>`s; `"n"` sets mono, tabular, no-wrap
   * numbers, and `"wide"` gives the cell a line of its own when a stacked
   * table reflows on a phone.
   */
  className?: string;
}

/** A text filter whose value the caller owns (e.g. bound to a typed search param). */
export interface TableFilter<T> {
  /** The current query; rows whose text contains it (case-insensitive, trimmed) are kept. */
  value: string;
  /** Called with the new query on every edit. The table keeps no filter state of its own. */
  onChange: (value: string) => void;
  /** The row's searchable text. */
  text: (row: T) => string;
  /** Placeholder and accessible name of the search box; defaults to "Filter". */
  placeholder?: string;
}

/** A select filter whose value the caller owns. */
export interface TableSelect<T> {
  /** The select's accessible name, e.g. "Deck". */
  name: string;
  /** The label of the "all" option (value ""), e.g. "All decks". */
  label: string;
  /** `[value, label]` pairs. */
  options: ReadonlyArray<readonly [value: string, label: string]>;
  /** The selected value; "" means all. */
  value: string;
  /** Called with the new value on change. */
  onChange: (value: string) => void;
  /**
   * Keeps a row for a non-empty value. Omit it when the caller already
   * filters `rows` by this value (e.g. server-side via a query param).
   */
  test?: (row: T, value: string) => boolean;
}

/** Props for {@link DataTable}. */
export interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  rows: readonly T[];
  /** A stable React key per row. */
  rowKey: (row: T, index: number) => Key;
  /** Shows a search box above the table and filters rows by it. */
  filter?: TableFilter<T>;
  /** Shows a select next to the search box. */
  select?: TableSelect<T>;
  /** Further selects after `select`; a row must pass every one. */
  selects?: ReadonlyArray<TableSelect<T>>;
  /** Message when `rows` is empty; defaults to "Nothing to show." */
  empty?: ReactNode;
  /**
   * How the table fits a phone: `scroll` (the default) scrolls sideways
   * inside its box with the first column pinned; `stack` reflows each row
   * into a block whose cells carry their column's name.
   */
  layout?: "scroll" | "stack";
}

/**
 * Keeps the rows whose text contains the query, case-insensitively.
 *
 * @param rows - the rows to filter
 * @param query - the query; surrounding whitespace is ignored, and an empty
 *   query keeps every row
 * @param text - a row's searchable text
 * @returns the kept rows, in input order
 */
export function filterRows<T>(rows: readonly T[], query: string, text: (row: T) => string): T[] {
  const q = query.trim().toLowerCase();
  return q ? rows.filter((r) => text(r).toLowerCase().includes(q)) : [...rows];
}

/**
 * Keeps the rows every filter keeps.
 *
 * @param rows - the rows to filter
 * @param filter - the text filter, when there is one
 * @param select - the select filter, when there is one; without a `test` it keeps every row
 * @param selects - further select filters, each applied like `select`
 * @returns the kept rows, in input order
 */
export function applyFilters<T>(
  rows: readonly T[],
  filter: TableFilter<T> | undefined,
  select: TableSelect<T> | undefined,
  selects: ReadonlyArray<TableSelect<T>> = [],
): T[] {
  let kept = filter ? filterRows(rows, filter.value, filter.text) : [...rows];
  for (const s of [...(select ? [select] : []), ...selects]) {
    if (!s.test || !s.value) continue;
    const { test, value } = s;
    kept = kept.filter((r) => test(r, value));
  }
  return kept;
}

/** Props for {@link TableTools}. */
export interface TableToolsProps<T> {
  filter?: TableFilter<T>;
  select?: TableSelect<T>;
  /** Further selects after `select`. */
  selects?: ReadonlyArray<TableSelect<T>>;
}

/**
 * The search box and selects above a filtered list; renders nothing without any.
 *
 * @param props - the text filter and the selects, each optional
 * @returns the tools row, or null
 */
export function TableTools<T>({ filter, select, selects = [] }: TableToolsProps<T>) {
  const allSelects = [...(select ? [select] : []), ...selects];
  if (!filter && allSelects.length === 0) return null;
  const placeholder = filter?.placeholder ?? "Filter";
  return (
    <div className="tools">
      {filter && (
        <input
          type="search"
          placeholder={placeholder}
          aria-label={placeholder}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
        />
      )}
      {allSelects.map((s) => (
        <select
          key={s.name}
          aria-label={s.name}
          value={s.value}
          onChange={(e) => s.onChange(e.target.value)}
        >
          <option value="">{s.label}</option>
          {s.options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}

/**
 * A table with optional controlled text and select filters. With no rows it
 * shows `empty`; when the filters exclude every row it says "Nothing matches."
 *
 * @param props - the columns, rows, filters, empty state and phone layout
 * @returns the tools and the table, or the empty state
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  filter,
  select,
  selects,
  empty,
  layout = "scroll",
}: DataTableProps<T>) {
  const kept = applyFilters(rows, filter, select, selects);
  const message = rows.length === 0 ? (empty ?? "Nothing to show.") : "Nothing matches.";

  return (
    <>
      <TableTools filter={filter} select={select} selects={selects} />
      <div className="tablewrap">
        <table className={layout}>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kept.length ? (
              kept.map((row, i) => (
                <tr key={rowKey(row, i)}>
                  {columns.map((c, j) => (
                    <td
                      key={j}
                      className={c.className}
                      data-label={typeof c.header === "string" ? c.header : undefined}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="muted">
                  {message}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
