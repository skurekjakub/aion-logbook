import { useQuery } from "@tanstack/react-query";
import { useSourceIndex } from "../api/hooks";
import type { GameClass } from "../api/queries";
import { mechanicsQuery } from "../api/queries";
import { Clamp } from "../components/Clamp";
import { ConfidencePill } from "../components/ConfidencePill";
import { QueryResult } from "../components/QueryResult";
import { SourceChips } from "../components/SourceChips";

/**
 * The class's mechanics filed under `topic`, as their topic or one of
 * their further topics (`alsoTopics`), each as a callout: its confidence
 * first, its body cut to one line, its sources last; nothing when none
 * are filed under it.
 *
 * @param props - the class and the mechanics topic
 * @returns the notes, inside the mechanics query's loading and error states
 */
export function TopicNotes({ cls, topic }: { cls: GameClass; topic: string }) {
  const sources = useSourceIndex();
  const mechanics = useQuery(mechanicsQuery(cls));
  return (
    <QueryResult query={mechanics} resource="mechanics">
      {(rows) =>
        rows
          .filter((m) => m.topic === topic || m.alsoTopics.includes(topic))
          .map((m) => (
            <div key={m.id} className="callout">
              <ConfidencePill confidence={m.confidence} />
              <span className="callout-body">
                <Clamp lines={1}>{m.body}</Clamp>
              </span>
              <SourceChips ids={m.sources} sources={sources} max={2} />
            </div>
          ))
      }
    </QueryResult>
  );
}

/** Props for {@link MechanicsView}. */
export interface MechanicsViewProps {
  /** The class whose mechanics (and the class-wide ones of its records) to show. */
  cls: GameClass;
  /** Topics another view shows; their mechanics are left out. */
  hidden: ReadonlySet<string>;
}

/**
 * A class's mechanics writeups as cards under a "Mechanics" heading, each
 * leading with its confidence pill and title, its body cut to two lines
 * and its sources at the foot. Writeups filed under a `hidden` topic are
 * left out; nothing renders when none are left.
 *
 * @param props - the class and the topics shown elsewhere
 * @returns the section, or nothing
 */
export function MechanicsView({ cls, hidden }: MechanicsViewProps) {
  const sources = useSourceIndex();
  const mechanics = useQuery({
    ...mechanicsQuery(cls),
    select: (rows) => rows.filter((m) => m.topic == null || !hidden.has(m.topic)),
  });
  return (
    <QueryResult query={mechanics} resource="mechanics">
      {(items) =>
        items.length ? (
          <section className="mechanics" aria-labelledby="mechanics-title">
            <h3 id="mechanics-title">Mechanics</h3>
            <div className="grid g2">
              {items.map((x) => (
                <article key={x.id} className="card mech-card">
                  <div className="mech-head">
                    <ConfidencePill confidence={x.confidence} />
                    <h4>{x.title}</h4>
                  </div>
                  <div className="mech-body">
                    <Clamp lines={2}>{x.body}</Clamp>
                  </div>
                  <div className="card-foot">
                    <SourceChips ids={x.sources} sources={sources} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null
      }
    </QueryResult>
  );
}
