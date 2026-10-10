import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

/** Props for {@link ObsoleteSection}. */
export interface ObsoleteSectionProps {
  /** The section's element id, which a contents list links to. */
  id: string;
  /** The most recent `obsoleteSince` among its items; null renders nothing. */
  latest: string | null;
  /**
   * The element id the address names, e.g. `deck-<id>`: when an item in
   * the section has it, the section opens and scrolls it into view.
   */
  reveal?: string;
  /** The obsolete items, the most recently obsoleted first. */
  children: ReactNode;
}

/**
 * The collapsed section that ends a list page with its obsolete items,
 * dated by the latest of them. It opens when the address names an item
 * inside it and never closes itself: the reader may follow a link out of
 * it, or collapse it by hand, and the next address naming an item inside
 * it opens it again.
 *
 * @param props - the id, the latest date, the id the address names, and the items
 * @returns the section, or null when there is nothing obsolete
 */
export function ObsoleteSection({ id, latest, reveal, children }: ObsoleteSectionProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const section = ref.current;
    if (!section || !reveal) return;
    const target = [...section.querySelectorAll("[id]")].find((el) => el.id === reveal);
    if (!target) return;
    section.open = true;
    // `scrollIntoView` is absent where there is no layout, as under jsdom.
    if (typeof target.scrollIntoView === "function") target.scrollIntoView();
  }, [reveal, latest]);
  if (latest === null) return null;
  return (
    <details className="obsolete" id={id} ref={ref}>
      <summary>
        <span className="label">Obsolete</span> <span className="muted">· latest {latest}</span>
      </summary>
      <div className="obsolete-body">{children}</div>
    </details>
  );
}
