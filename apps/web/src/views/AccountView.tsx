import { useQuery } from "@tanstack/react-query";
import { accountQuery, roadmapQuery } from "../api/queries";
import type { AccountMacro, AccountOverview, AccountSkill, AccountSnapshot } from "../api/types";
import { CLASS_LABELS } from "../app/classes";
import type { Column } from "../components/DataTable";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Pill } from "../components/Pill";
import { QueryResult } from "../components/QueryResult";
import { SkillChip } from "../components/SkillChip";
import { ViewHeader } from "../components/ViewHeader";
import { optionalText } from "../lib/search";
import { AccountRoadmap } from "./AccountRoadmap";

/** The character view's search params: the snapshot to show, by id. */
export interface AccountSearch {
  snapshot?: string;
}

/**
 * Reads the character view's search params.
 *
 * @param search - the router's decoded query values
 * @returns the snapshot id, dropped when empty
 */
export function validateAccountSearch(search: Record<string, unknown>): AccountSearch {
  return { snapshot: optionalText(search.snapshot) };
}

/** Props for {@link AccountView}. */
export interface AccountViewProps {
  /** The snapshot asked for; the latest when omitted. */
  search: AccountSearch;
  /** Applies a change to the search params. */
  onSearch: (patch: Partial<AccountSearch>) => void;
}

/**
 * A skill as read, as a chip: flagged unresolved when the name matched no
 * loaded skill.
 *
 * @param props - the name as read and the skill id it resolved to, if any
 * @returns the chip
 */
function ReadName({ name, skillId }: { name: string; skillId: string | null }) {
  return <SkillChip skill={{ name }} unresolved={skillId === null} />;
}

const SKILL_COLUMNS: Column<AccountSkill>[] = [
  {
    header: "Skill",
    cell: (s) => <ReadName name={s.name} skillId={s.skillId} />,
    className: "wide",
  },
  { header: "Level", cell: (s) => (s.level == null ? "–" : `Lv ${s.level}`), className: "n" },
  { header: "Hotbar", cell: (s) => s.slot ?? "", className: "n" },
];

/**
 * A macro chain as the client's editor holds it: its key (an "unbound"
 * badge when it has none), then its steps in the editor's order.
 *
 * @param props - the chain
 * @returns the chain
 */
function ReadMacro({ macro }: { macro: AccountMacro }) {
  return (
    <article className="card macro">
      <div className="macro-head">
        <h4>{macro.name}</h4>
        <span className="macro-key">
          <span className="label">Key</span>
          {macro.key === null ? <Pill kind="warn">unbound</Pill> : <kbd>{macro.key}</kbd>}
        </span>
      </div>
      <ol className="macro-steps" aria-label={`${macro.name} steps`}>
        {[...macro.steps]
          .sort((a, b) => a.position - b.position)
          .map((step) => (
            <li key={step.position}>
              <span className="step-no mono" aria-hidden="true">
                {step.position}
              </span>
              <ReadName name={step.name} skillId={step.skillId} />
            </li>
          ))}
      </ol>
    </article>
  );
}

/** Props for {@link Picker}. */
interface PickerProps {
  /** The loaded snapshots, oldest first. */
  entries: AccountOverview["snapshots"];
  /** The id asked for; the latest when undefined. */
  value: string | undefined;
  /**
   * Shows another snapshot.
   *
   * @param id - the id picked; undefined for the latest
   */
  onPick(id: string | undefined): void;
}

/**
 * The snapshot picker, shown when more than one snapshot is loaded; the
 * latest is the default.
 *
 * @param props - the loaded snapshots, the one asked for, and the setter
 * @returns the select, or null with one or none loaded
 */
function Picker(props: PickerProps) {
  const { entries, value } = props;
  if (entries.length < 2) return null;
  const newest = [...entries].reverse();
  // The latest's option has the empty value, so asking for it by id selects it too.
  const selected = value === undefined || value === newest[0]!.id ? "" : value;
  return (
    <label className="acct-pick">
      <span className="label">Snapshot</span>
      <select
        value={selected}
        onChange={(e) => {
          props.onPick(e.target.value || undefined);
        }}
      >
        {newest.map((entry, i) => (
          <option key={entry.id} value={i === 0 ? "" : entry.id}>
            {entry.id}
            {i === 0 ? " (latest)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The snapshot's sections: skills with levels and hotbar slots, stigmas
 * by slot, macro chains, and what the read couldn't make out.
 *
 * @param props - the snapshot
 * @returns the sections
 */
function SnapshotParts({ snapshot }: { snapshot: AccountSnapshot }) {
  return (
    <>
      <section className="acct-section" aria-labelledby="acct-skills">
        <h3 id="acct-skills">Skills</h3>
        <DataTable
          columns={SKILL_COLUMNS}
          rows={snapshot.skills}
          rowKey={(s, i) => `${i}-${s.name}`}
          empty="No skills read."
          layout="stack"
        />
      </section>
      <section className="acct-section" aria-labelledby="acct-stigmas">
        <h3 id="acct-stigmas">Stigmas</h3>
        {snapshot.stigmas.length ? (
          <ol className="stigma-slots">
            {[...snapshot.stigmas]
              .sort((a, b) => a.slotLevel - b.slotLevel)
              .map((s) => (
                <li key={s.slotLevel} className="stigma-slot">
                  <span className="slot-level mono">{s.slotLevel}</span>
                  <span className="slot-body">
                    {s.name === null ? (
                      <span className="muted">empty</span>
                    ) : (
                      <ReadName name={s.name} skillId={s.skillId} />
                    )}
                  </span>
                </li>
              ))}
          </ol>
        ) : (
          <EmptyState>No stigmas read.</EmptyState>
        )}
      </section>
      <section className="acct-section" aria-labelledby="acct-macros">
        <h3 id="acct-macros">Macro chains</h3>
        {snapshot.macros.length ? (
          <div className="grid g2">
            {snapshot.macros.map((m) => (
              <ReadMacro key={m.position} macro={m} />
            ))}
          </div>
        ) : (
          <EmptyState>No macro chains read.</EmptyState>
        )}
      </section>
      {snapshot.unread.length ? (
        <section className="acct-section" aria-labelledby="acct-unread">
          <h3 id="acct-unread">Not read</h3>
          <ul className="chips unread">
            {snapshot.unread.map((u) => (
              <li key={u} className="chip">
                {u}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/**
 * The roadmap ranked against the snapshot shown, grouped now, next, later:
 * derived and curated items alike.
 *
 * @param props - the snapshot asked for; the latest when undefined
 * @returns the section
 */
function RoadmapSection({ snapshot }: { snapshot: string | undefined }) {
  const roadmap = useQuery(roadmapQuery(snapshot));
  return (
    <section className="acct-section" aria-labelledby="acct-roadmap">
      <h3 id="acct-roadmap">Roadmap</h3>
      <QueryResult query={roadmap} resource="roadmap">
        {({ items }) =>
          items.length ? <AccountRoadmap items={items} /> : <EmptyState>No roadmap yet.</EmptyState>
        }
      </QueryResult>
    </section>
  );
}

/**
 * The character's sections: the profile, the roadmap grouped now, next,
 * later, then the snapshot's skills, stigmas and macro chains.
 *
 * @param props - the overview, the snapshot asked for and the search setter
 * @returns the sections
 */
function AccountBody({ data, search, onSearch }: { data: AccountOverview } & AccountViewProps) {
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
      <div className="acct-head">
        <dl className="acct-profile">
          <div>
            <dt>Character</dt>
            <dd>{snapshot.character}</dd>
          </div>
          <div>
            <dt>Class</dt>
            <dd>{CLASS_LABELS[snapshot.class]}</dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd className="mono">{snapshot.level}</dd>
          </div>
          {snapshot.gearScore != null ? (
            <div>
              <dt>Gear score</dt>
              <dd className="mono">{snapshot.gearScore}</dd>
            </div>
          ) : null}
          {snapshot.server ? (
            <div>
              <dt>Server</dt>
              <dd>{snapshot.server}</dd>
            </div>
          ) : null}
          <div>
            <dt>Read</dt>
            <dd className="mono" title={snapshot.capturedAt}>
              {snapshot.id}
            </dd>
          </div>
        </dl>
        <Picker
          entries={data.snapshots}
          value={search.snapshot}
          onPick={(id) => {
            onSearch({ snapshot: id });
          }}
        />
      </div>
      <RoadmapSection snapshot={search.snapshot} />
      <SnapshotParts snapshot={snapshot} />
    </>
  );
}

/**
 * The character as read from the client: the roadmap first, then the
 * skills, stigmas and macro chains of the snapshot shown (the latest
 * unless the address names one). A short empty state when none is loaded.
 *
 * @param props - the snapshot asked for, and the search setter
 * @returns the view
 */
export function AccountView({ search, onSearch }: AccountViewProps) {
  const query = useQuery(accountQuery(search.snapshot));
  return (
    <>
      <ViewHeader
        title="Character"
        lede={["What to do now, next and later.", "Skills, stigmas and macros as last read."]}
      />
      <QueryResult query={query} resource="character">
        {(data) => <AccountBody data={data} search={search} onSearch={onSearch} />}
      </QueryResult>
    </>
  );
}
