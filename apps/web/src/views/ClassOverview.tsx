import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useSourceIndex } from "../api/hooks";
import { buildsQuery, recommendationsQuery, recordQuery, takeawaysQuery } from "../api/queries";
import type { Build, Recommendation, Takeaway } from "../api/types";
import type { ClassSection } from "../app/classes";
import { MACROS_TOPIC } from "../app/classes";
import { Clamp } from "../components/Clamp";
import { ConfidencePill } from "../components/ConfidencePill";
import { EmptyState } from "../components/EmptyState";
import { ObsoleteNotice } from "../components/ObsoleteNotice";
import { ObsoleteSection } from "../components/ObsoleteSection";
import { Pill } from "../components/Pill";
import { QueryResult } from "../components/QueryResult";
import { SourceChips } from "../components/SourceChips";
import { ViewHeader } from "../components/ViewHeader";
import { PURPOSE_LABEL } from "../lib/builds";
import { splitObsolete } from "../lib/obsolete";
import type { SourceIndex } from "../lib/sources";
import { leadSentence } from "../lib/verdict";
import { MechanicsView } from "./MechanicsView";

/** The topics the overview's mechanics leave to another view. */
const SHOWN_ELSEWHERE: ReadonlySet<string> = new Set([MACROS_TOPIC]);

/**
 * One build as a card: its purpose and confidence first, its title, its
 * why cut to two lines, the build pages as links, and its sources at the foot.
 *
 * @param props - the build, its class and the source index
 * @returns the card
 */
function BuildCard({ build, cls, sources }: { build: Build; cls: string; sources: SourceIndex }) {
  const params = { class: cls };
  const search = { build: build.id };
  return (
    <article className="card build-card" id={`build-${build.id}`}>
      <div className="build-card-top">
        <span className="chip purpose">{PURPOSE_LABEL[build.purpose]}</span>
        <ConfidencePill confidence={build.confidence} />
      </div>
      <h3>{build.title}</h3>
      <div className="build-why">
        <Clamp lines={2}>{build.why}</Clamp>
      </div>
      <nav className="build-pages" aria-label={`${build.title} pages`}>
        <Link to="/$class/skills" params={params} search={search}>
          Skills
        </Link>
        <Link to="/$class/stigmas" params={params} search={search}>
          Stigmas
        </Link>
        <Link to="/$class/macros" params={params} search={search}>
          Macros
        </Link>
      </nav>
      <div className="card-foot">
        <SourceChips ids={build.sources} sources={sources} />
      </div>
    </article>
  );
}

/**
 * The ranked takeaways as one ruled list: each lead sentence in full, the
 * rest cut to a line, the sources at the end; nothing when there are none.
 *
 * @param props - the takeaways and the source index
 * @returns the list, or null
 */
function Takeaways({ rows, sources }: { rows: readonly Takeaway[]; sources: SourceIndex }) {
  if (!rows.length) return null;
  return (
    <section aria-labelledby="takeaways-title" className="takeaways">
      <h3 id="takeaways-title">Takeaways</h3>
      <ol className="take findings">
        {rows.map((t) => {
          const { lead, rest } = leadSentence(t.text);
          const more = [rest, t.detail ?? ""].filter((s) => s.trim()).join(" ");
          return (
            <li key={t.id}>
              <div className="finding">
                <div className="lead">{lead}</div>
                {more ? (
                  <div className="muted">
                    <Clamp lines={1}>{more}</Clamp>
                  </div>
                ) : null}
              </div>
              <SourceChips ids={t.sources} sources={sources} max={2} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * The record's advice for the character, as a to-do card: each
 * recommendation's changes as bullets, its summary cut to one line, its
 * sources last; nothing when there is none.
 *
 * @param props - the recommendations and the source index
 * @returns the card, or null
 */
function ForYou({ rows, sources }: { rows: readonly Recommendation[]; sources: SourceIndex }) {
  if (!rows.length) return null;
  return (
    <section className="card account" aria-labelledby="for-you-title">
      <h3 id="for-you-title">For your character</h3>
      {rows.map((r) => (
        <div key={r.id} className="advice">
          {r.changes.length ? (
            <ul className="todo">
              {r.changes.map((c, i) => (
                <li key={i}>
                  <Clamp lines={1}>{c}</Clamp>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="advice-foot">
            <div className="muted">
              <Clamp lines={1}>{r.summary}</Clamp>
            </div>
            <SourceChips ids={r.sources} sources={sources} max={2} />
          </div>
        </div>
      ))}
    </section>
  );
}

/**
 * A class's landing page: the record's caveat, the current builds as
 * cards, the takeaways, the mechanics, the advice for the character, and
 * the obsolete builds folded at the end. Each block loads on its own, so
 * one failed resource doesn't blank the others.
 *
 * @param props - the class
 * @returns the overview
 */
export function ClassOverview({ section }: { section: ClassSection }) {
  const sources = useSourceIndex();
  // The root route reports a failed record; here the caveat is simply left out.
  const caveat = useQuery({
    ...recordQuery(section.recordSlug ?? ""),
    select: (r) => r.caveat,
    enabled: section.recordSlug != null,
  }).data;
  const builds = useQuery(buildsQuery(section.cls));
  const takeaways = useQuery(takeawaysQuery(section.cls));
  const recommendations = useQuery(recommendationsQuery(section.recordSlug));
  const copy = section.copy.overview;
  return (
    <>
      {caveat ? (
        <div className="callout caveat" role="note">
          <Pill kind="warn">caveat</Pill>
          <span className="callout-body">
            <Clamp lines={1}>{caveat}</Clamp>
          </span>
        </div>
      ) : null}
      <ViewHeader title={copy.title} lede={copy.lede} />
      <QueryResult query={builds} resource="builds">
        {(rows) => {
          const { current, obsolete } = splitObsolete(rows);
          return (
            <>
              {current.length ? (
                <div className="grid g3 builds">
                  {current.map((b) => (
                    <BuildCard key={b.id} build={b} cls={section.cls} sources={sources} />
                  ))}
                </div>
              ) : (
                <EmptyState>No current builds recorded yet.</EmptyState>
              )}
              <ObsoleteSection id="obsolete-builds" latest={obsolete[0]?.obsoleteSince ?? null}>
                {obsolete.map((b) => (
                  <div key={b.id} className="obsolete-item">
                    <ObsoleteNotice
                      subject={b.title}
                      since={b.obsoleteSince!}
                      reason={b.obsoleteReason}
                      sources={b.obsoleteSources}
                      sourceIndex={sources}
                    />
                    <BuildCard build={b} cls={section.cls} sources={sources} />
                  </div>
                ))}
              </ObsoleteSection>
            </>
          );
        }}
      </QueryResult>
      <QueryResult query={takeaways} resource="takeaways">
        {(rows) => <Takeaways rows={rows} sources={sources} />}
      </QueryResult>
      <MechanicsView cls={section.cls} hidden={SHOWN_ELSEWHERE} />
      <QueryResult query={recommendations} resource="recommendations">
        {(rows) => <ForYou rows={rows} sources={sources} />}
      </QueryResult>
    </>
  );
}
