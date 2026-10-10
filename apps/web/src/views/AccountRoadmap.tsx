import type { AccountItem, AccountRoadmapData } from "../api/types";
import { Clamp } from "../components/Clamp";
import { Pill } from "../components/Pill";

/** When a roadmap item is due. */
export type Priority = "now" | "next" | "later";

/** The priorities, in the order the roadmap groups them. */
const PRIORITIES: readonly Priority[] = ["now", "next", "later"];

/** Each priority's group label. */
const PRIORITY_LABEL: Record<Priority, string> = { now: "Now", next: "Next", later: "Later" };

/**
 * One reference as a quiet chip at the end of a roadmap row: the record
 * and the row it points at, in full in the tooltip.
 *
 * @param props - the reference
 * @returns the chip
 */
function RefChip({ target }: { target: AccountItem["refs"][number] }) {
  const title = [target.record, target.id].filter(Boolean).join(" · ");
  return (
    <span className="chip ref" title={title}>
      {target.id ?? target.record}
    </span>
  );
}

/**
 * Where a roadmap item came from, as a badge: `auto` when derived from the
 * snapshot and the build, `curated` when written by hand, `stale` when
 * written by hand against an older snapshot.
 *
 * @param props - whether the item was derived, and the older snapshot its curation was ranked against
 * @returns the badge
 */
function OriginBadge({ derived, staleFrom }: { derived: boolean; staleFrom: string | null }) {
  if (derived) {
    return (
      <span title="Derived from the snapshot and the build">
        <Pill kind="info">auto</Pill>
      </span>
    );
  }
  return staleFrom === null ? (
    <span title="Curated by hand">
      <Pill kind="quiet">curated</Pill>
    </span>
  ) : (
    <span title={`Curated against the ${staleFrom} snapshot`}>
      <Pill kind="warn">stale</Pill>
    </span>
  );
}

/**
 * One roadmap row: the action in a line with its area chip and origin
 * badge; beneath, the why cut to a line and the references as chips at
 * the end.
 *
 * @param props - the item, and the older snapshot the curated items were ranked against
 * @returns the row
 */
function RoadmapRow({ item, staleFrom }: { item: AccountItem; staleFrom: string | null }) {
  return (
    <li className={`road-item prio-${item.priority}`}>
      <div className="road-main">
        <span className="road-action">{item.action}</span>
        <span className="road-badges">
          <span className="chip area">{item.area}</span>
          <OriginBadge derived={item.derived} staleFrom={staleFrom} />
        </span>
      </div>
      <div className="road-foot">
        <span className="road-why">
          <Clamp lines={1} perLine={80}>
            {item.why}
          </Clamp>
        </span>
        {item.refs.length ? (
          <span className="chips refs">
            {item.refs.map((r, i) => (
              <RefChip key={`${i}-${r.record}-${r.id ?? ""}`} target={r} />
            ))}
          </span>
        ) : null}
      </div>
    </li>
  );
}

/** Props for {@link AccountRoadmap}. */
export interface AccountRoadmapProps {
  /** The roadmap: its items by rank, the snapshot they are ranked against and the curated items' source. */
  roadmap: AccountRoadmapData;
  /** The priorities to show; every priority when omitted. */
  priorities?: readonly Priority[];
}

/**
 * The roadmap: its items grouped now, next, later under coloured priority
 * badges, each item one row, by rank within its group. A group with no
 * items is left out. Curated items ranked against an older snapshot are
 * marked stale.
 *
 * @param props - the roadmap and the priorities to show
 * @returns the roadmap
 */
export function AccountRoadmap({ roadmap, priorities = PRIORITIES }: AccountRoadmapProps) {
  const { items, snapshotId, curatedFrom } = roadmap;
  const staleFrom = curatedFrom !== null && curatedFrom !== snapshotId ? curatedFrom : null;
  const groups = PRIORITIES.filter((p) => priorities.includes(p))
    .map((priority) => ({ priority, items: items.filter((i) => i.priority === priority) }))
    .filter((group) => group.items.length > 0);
  return (
    <div className="road">
      {groups.map((group) => (
        <section key={group.priority} className={`road-group prio-${group.priority}`}>
          <h4>
            <span className={`prio prio-${group.priority}`}>{PRIORITY_LABEL[group.priority]}</span>
          </h4>
          <ol>
            {group.items.map((item) => (
              <RoadmapRow key={item.rank} item={item} staleFrom={staleFrom} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
