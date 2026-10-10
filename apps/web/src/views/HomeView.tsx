import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { accountQuery, recordsQuery, roadmapQuery } from "../api/queries";
import type { AccountOverview, AccountSnapshot } from "../api/types";
import { CLASS_LABELS, classSectionsWithContent } from "../app/classes";
import { EmptyState } from "../components/EmptyState";
import { QueryResult } from "../components/QueryResult";
import { ViewHeader } from "../components/ViewHeader";
import type { Priority } from "./AccountRoadmap";
import { AccountRoadmap } from "./AccountRoadmap";

/** The roadmap priorities the home page shows; the rest wait on the character page. */
const DUE: readonly Priority[] = ["now", "next"];

/**
 * The character card: name, class (linking to its builds when a record
 * covers it), level and gear score as badges, and when it was read.
 *
 * @param props - the snapshot and the classes with builds
 * @returns the card
 */
function CharacterCard({
  snapshot,
  covered,
}: {
  snapshot: AccountSnapshot;
  covered: ReadonlySet<string>;
}) {
  const label = CLASS_LABELS[snapshot.class];
  return (
    <section className="card char-card" aria-labelledby="char-name">
      <div className="char-top">
        <h3 id="char-name">{snapshot.character}</h3>
        <span className="char-level mono">Lv {snapshot.level}</span>
      </div>
      <div className="char-facts">
        {covered.has(snapshot.class) ? (
          <Link to="/$class" params={{ class: snapshot.class }} className="class-chip">
            {label}
          </Link>
        ) : (
          <span className="class-chip">{label}</span>
        )}
        {snapshot.gearScore != null ? (
          <span className="chip" title="Gear score">
            GS {snapshot.gearScore}
          </span>
        ) : null}
        {snapshot.server ? <span className="chip">{snapshot.server}</span> : null}
        <span className="muted char-read">
          Read <time dateTime={snapshot.capturedAt}>{snapshot.id}</time>
        </span>
      </div>
    </section>
  );
}

/**
 * What to do now and next, from the roadmap ranked against the latest
 * snapshot: derived and curated items alike.
 *
 * @returns the section
 */
function HomeNext() {
  const roadmap = useQuery(roadmapQuery());
  return (
    <section className="home-next" aria-labelledby="home-next">
      <div className="acct-section-head">
        <h3 id="home-next">Do next</h3>
        <Link to="/account" className="more-link">
          Full roadmap
        </Link>
      </div>
      <QueryResult query={roadmap} resource="roadmap">
        {({ items }) =>
          items.some((item) => DUE.includes(item.priority)) ? (
            <AccountRoadmap items={items} priorities={DUE} />
          ) : (
            <EmptyState>Nothing due now or next.</EmptyState>
          )
        }
      </QueryResult>
    </section>
  );
}

/**
 * The home page's body: the character card and what to do now and next,
 * or how to load a character when none is.
 *
 * @param props - the character overview and the classes with builds
 * @returns the body
 */
function HomeBody({ data, covered }: { data: AccountOverview; covered: ReadonlySet<string> }) {
  const { snapshot } = data;
  if (!snapshot) {
    return (
      <EmptyState>
        No character snapshot yet. Run <span className="mono">pnpm import:account</span>.
      </EmptyState>
    );
  }
  return (
    <>
      <CharacterCard snapshot={snapshot} covered={covered} />
      <HomeNext />
    </>
  );
}

/**
 * The home page: the character as last read and what to do next.
 *
 * @returns the view
 */
export function HomeView() {
  const account = useQuery(accountQuery());
  const covered = new Set(
    classSectionsWithContent(useQuery(recordsQuery()).data ?? []).map((s) => s.cls),
  );
  return (
    <>
      <ViewHeader
        title="Your character"
        lede={["As last read from the client.", "Do these next."]}
      />
      <QueryResult query={account} resource="character">
        {(data) => <HomeBody data={data} covered={covered} />}
      </QueryResult>
    </>
  );
}
