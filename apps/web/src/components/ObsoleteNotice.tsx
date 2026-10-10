import type { ReactNode } from "react";
import type { SourceIndex } from "../lib/sources";
import { Clamp } from "./Clamp";
import { Pill } from "./Pill";
import { SourceChips } from "./SourceChips";

/** Props for {@link ObsoleteNotice}. */
export interface ObsoleteNoticeProps {
  /** Since when the item is obsolete, `YYYY-MM-DD`. */
  since: string;
  /** Why; null renders no reason. */
  reason: string | null;
  /** The ids of the sources that say why. */
  sources: readonly string[];
  /** Id → URL/title for the source chips. */
  sourceIndex: SourceIndex;
  /** What superseded the item, e.g. a link to the deck that did. */
  superseded?: ReactNode;
  /** Names the item, where the notice stands apart from it: "<subject> is obsolete since …". */
  subject?: string;
}

/**
 * The line that heads an obsolete item, verdict first: a grey "obsolete
 * since" pill, then why (cut to one line), what superseded it, and the
 * sources that say so at the end.
 *
 * @param props - the date, the reason, its sources, the source index, the successor and the item's name
 * @returns the notice
 */
export function ObsoleteNotice({
  since,
  reason,
  sources,
  sourceIndex,
  superseded,
  subject,
}: ObsoleteNoticeProps) {
  return (
    <div className="obsolete-notice" role="note">
      <Pill kind="obsolete">
        {subject ? `${subject} is obsolete since ${since}` : `Obsolete since ${since}`}
      </Pill>
      <span className="obsolete-why">
        {/* The colon reads the pill and the reason as one sentence to a screen reader. */}
        {reason ? <span className="vh">: </span> : null}
        {reason ? (
          <span className="obsolete-reason">
            <Clamp lines={1}>{reason}</Clamp>
          </span>
        ) : null}
        {superseded ? <span className="superseded"> Superseded by {superseded}.</span> : null}
      </span>
      {sources.length ? " " : null}
      <SourceChips ids={sources} sources={sourceIndex} max={2} />
    </div>
  );
}
