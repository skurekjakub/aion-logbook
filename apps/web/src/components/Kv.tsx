import type { ReactNode } from "react";
import { Fragment } from "react";

/** One row of a {@link Kv} list: a label and its content. */
export type KvRow = readonly [label: string, content: ReactNode];

/** Props for {@link Kv}. */
export interface KvProps {
  /** Rows in display order; labels must be unique. */
  rows: readonly KvRow[];
}

/**
 * Reports whether a row's content is worth showing: not null, a boolean, empty or whitespace-only text, or an empty array.
 *
 * @param v - the row's content
 * @returns `true` if the row should render
 */
function hasContent(v: ReactNode): boolean {
  if (v == null || v === false || v === true) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * A label → content definition list. Rows with empty content are dropped.
 *
 * @param props - the rows
 * @returns the definition list
 */
export function Kv({ rows }: KvProps) {
  return (
    <dl className="kv">
      {rows
        .filter(([, v]) => hasContent(v))
        .map(([k, v]) => (
          <Fragment key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </Fragment>
        ))}
    </dl>
  );
}
