import { useState } from "react";
import type { SourceIndex } from "../lib/sources";
import { sourceLabel } from "../lib/sources";

/** Props for {@link SourceChips}. */
export interface SourceChipsProps {
  /** Source ids to show, e.g. `["dc:76135", "nv:43653"]`. Null or empty renders nothing. */
  ids: readonly string[] | null | undefined;
  /** Id → URL/title, from one `/api/sources` query (see `useSourceIndex`). */
  sources: SourceIndex;
  /** Chips shown before the rest fold behind a "+N" button; 3 when omitted. */
  max?: number;
}

/**
 * Source ids as small, quiet chips for the end of a row. Ids found in
 * `sources` link to their URL in a new tab with the title as a tooltip; the
 * rest render as plain chips. Past `max`, the remainder folds behind a "+N"
 * button that shows them.
 *
 * @param props - the source ids, the source index, and how many to show folded
 * @returns the chips, or null when there are no ids
 */
export function SourceChips({ ids, sources, max = 3 }: SourceChipsProps) {
  const [open, setOpen] = useState(false);
  if (!ids?.length) return null;
  // Folding a single chip saves nothing, so a list one over the limit shows whole.
  const folded = !open && ids.length > max + 1;
  const shown = folded ? ids.slice(0, max) : ids;
  return (
    <span className="chips src">
      {shown.map((id) => {
        const s = sources.get(id);
        return s?.url ? (
          <a
            key={id}
            className="chip"
            href={s.url}
            target="_blank"
            rel="noopener"
            title={s.title ?? ""}
          >
            {sourceLabel(id)}
          </a>
        ) : (
          <span key={id} className="chip">
            {sourceLabel(id)}
          </span>
        );
      })}
      {folded ? (
        <button
          type="button"
          className="chip more-chips"
          aria-label={`Show ${ids.length - max} more sources`}
          onClick={() => {
            setOpen(true);
          }}
        >
          +{ids.length - max}
        </button>
      ) : null}
    </span>
  );
}
