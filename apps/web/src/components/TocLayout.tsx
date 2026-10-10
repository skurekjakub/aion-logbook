import type { ReactNode } from "react";

/** One entry of a {@link PageToc}: the id of the element it jumps to, and its label. */
export interface TocItem {
  /** The target element's id, without `#`. */
  id: string;
  label: ReactNode;
}

/** Props for {@link TocLayout}. */
export interface TocLayoutProps {
  /** The page's sections, in page order. Fewer than two render no list. */
  items: readonly TocItem[];
  /** The page body the items point into. */
  children: ReactNode;
}

/**
 * A page body with an "On this page" list of links to its sections: a
 * sticky rail beside the body on a wide screen, a wrapped row of links above
 * it otherwise. With fewer than two items the body renders alone.
 *
 * @param props - the table of contents and the page body
 * @returns the body with its contents list
 */
export function TocLayout({ items, children }: TocLayoutProps) {
  if (items.length < 2) return <>{children}</>;
  return (
    <div className="has-toc">
      <nav className="toc" aria-label="On this page">
        <span className="toc-title">On this page</span>
        <ol>
          {items.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`}>{t.label}</a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="has-toc-body">{children}</div>
    </div>
  );
}
