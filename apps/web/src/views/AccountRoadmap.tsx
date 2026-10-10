import type { AccountItem } from "../api/types";
import { Clamp } from "../components/Clamp";

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
 * One roadmap row: the action in a line with its area chip; beneath, the
 * why cut to a line and the references as chips at the end.
 *
 * @param props - the item
 * @returns the row
 */
function RoadmapRow({ item }: { item: AccountItem }) {
  return (
    <li className={`road-item prio-${item.priority}`}>
      <div className="road-main">
        <span className="road-action">{item.action}</span>
        <span className="road-badges">
          <span className="chip area">{item.area}</span>
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
  /** The roadmap's items, by rank. */
  items: readonly AccountItem[];
  /** The priorities to show; every priority when omitted. */
  priorities?: readonly Priority[];
}

/**
 * The roadmap: its items grouped now, next, later under coloured priority
 * badges, each item one row, by rank within its group. A group with no
 * items is left out.
 *
 * @param props - the items and the priorities to show
 * @returns the roadmap
 */
export function AccountRoadmap({ items, priorities = PRIORITIES }: AccountRoadmapProps) {
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
              <RoadmapRow key={item.id} item={item} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
