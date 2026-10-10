import type { ReactNode } from "react";
import { Clamp } from "./Clamp";

/** Props for {@link PageHeader}. */
export interface PageHeaderProps {
  /** A tag after the title, e.g. the mode's Korean name; omitted when null. */
  context: ReactNode;
  /** The `<h1>`. */
  title: string;
  /** The lede under the title: text (none when empty; clamped when long), or an error box in its place. */
  lede: ReactNode;
  /** Label → value figures for the stamp; rows with a null or empty value are dropped. */
  stats: ReadonlyArray<readonly [label: string, value: string | number | null | undefined]>;
}

/**
 * The page header: the title with its tag, the lede cut to two lines (it
 * expands on demand), and the stat stamp on the right.
 *
 * @param props - the title's tag, the title, the lede and the stats
 * @returns the header
 */
export function PageHeader({ context, title, lede, stats }: PageHeaderProps) {
  const shown = stats.filter(([, v]) => v != null && v !== "");
  return (
    <header className="top">
      <div className="page-title-block">
        <h1>
          {title}
          {context != null ? <span className="title-tag">{context}</span> : null}
        </h1>
        {typeof lede !== "string" ? (
          lede
        ) : lede.trim() ? (
          <p className="lede">
            <Clamp lines={2}>{lede}</Clamp>
          </p>
        ) : null}
      </div>
      {shown.length ? (
        <div className="stamp">
          {shown.map(([k, v]) => (
            <div key={k}>
              <span className="label">{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      ) : null}
    </header>
  );
}
