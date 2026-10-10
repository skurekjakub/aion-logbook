/**
 * The character's roadmap, derived at request time from a snapshot and
 * the build it follows, with the curated items (`account/roadmap-<id>.json`)
 * after the derived ones. Spec § 8 of
 * `docs/superpowers/specs/2026-10-10-aion-logbook-design.md`.
 *
 * @module
 */
import type { AccountPriority } from "@aion/schema";
import { ACCOUNT_PRIORITY } from "@aion/schema";
import type { Store } from "../repos";
import type { AccountRoadmapItemRow } from "../repos/account";
import type { AccountService, AccountSnapshotView } from "./account";
import type { BuildService, BuildView } from "./builds";
import { mentionsName } from "./names";

/** How many skills below target, highest rank first, are due now; the rest are next. */
const NOW_SKILLS = 3;

/** One roadmap item: what to do, why, against which research, and whether it was derived. */
export interface RoadmapItem {
  /** Its place in the roadmap, 1 first. */
  rank: number;
  /** When it is due. */
  priority: AccountPriority;
  /** What it touches: `skills`, `stigmas`, `macro`, or a curated area. */
  area: string;
  /** What to do, verb first. */
  action: string;
  /** Why, in a line. */
  why: string;
  /** The research it follows: a record, and a row of it when one applies. */
  refs: Array<{ record: string; id?: string | undefined }>;
  /** `true` when derived from the snapshot and the build; `false` for a curated item. */
  derived: boolean;
}

/** The roadmap ranked against one snapshot. */
export interface AccountRoadmap {
  /** The snapshot it is ranked against, or `null` when none is loaded. */
  snapshotId: string | null;
  /**
   * The snapshot the curated items were ranked against: `snapshotId` itself,
   * an older one, or `null` when no snapshot up to it has curated items.
   */
  curatedFrom: string | null;
  /** Its items, by rank: the derived ones, then the curated ones. */
  items: RoadmapItem[];
}

/** Read access to the roadmap. */
export interface RoadmapService {
  /**
   * Returns the roadmap ranked against a snapshot.
   *
   * @param choice - `snapshot` names the snapshot; the latest when omitted
   * @throws {NotFoundError} if `choice.snapshot` names a snapshot that isn't loaded
   */
  roadmap(choice?: { snapshot?: string | undefined }): AccountRoadmap;
}

/**
 * What a derived item is about: the skills it names, or the macro chain it
 * builds, rebuilds or binds.
 */
interface Subject {
  /** The names a curated item would call it by: a skill's, or a chain's. */
  names: string[];
  /** The macro chain's id, which a curated item's `refs` may name. */
  id?: string;
}

/** A derived item before it is ranked, with its subject. */
type Unranked = Omit<RoadmapItem, "rank"> & { subject: Subject };

/** A ranked derived item, with its subject. */
type Derived = RoadmapItem & { subject: Subject };

/**
 * Reports whether a macro chain as read has exactly a build chain's steps.
 *
 * @param read - the chain as read
 * @param wanted - the build's chain
 * @returns `true` when the steps resolve to the same skills in the same order
 */
function sameSteps(
  read: AccountSnapshotView["macros"][number],
  wanted: BuildView["macros"][number],
): boolean {
  const have = [...read.steps].sort((a, b) => a.position - b.position).map((s) => s.skillId);
  const want = [...wanted.steps].sort((a, b) => a.position - b.position).map((s) => s.skill.id);
  return have.length === want.length && have.every((id, i) => id === want[i]);
}

/**
 * Lists the build's skills the snapshot holds below their target level, in
 * rank order; the first {@link NOW_SKILLS} are due now, the rest next. A
 * skill the snapshot doesn't hold, or holds without a level, is skipped.
 *
 * @param snapshot - the snapshot
 * @param build - the build it follows
 * @param refs - the build's refs
 * @returns the items
 */
function skillItems(
  snapshot: AccountSnapshotView,
  build: BuildView,
  refs: RoadmapItem["refs"],
): Unranked[] {
  const below = [...build.skills]
    .sort((a, b) => a.rank - b.rank)
    .flatMap((target) => {
      const level = snapshot.skills.find((s) => s.skillId === target.skill.id)?.level;
      return level != null && level < target.targetLevel ? [{ target, level }] : [];
    });
  return below.map(({ target, level }, i) => ({
    priority: i < NOW_SKILLS ? "now" : "next",
    area: "skills",
    action: `${target.skill.name} ${level} → ${target.targetLevel}`,
    why: target.why,
    refs,
    derived: true,
    subject: { names: [target.skill.name] },
  }));
}

/**
 * Compares the stigmas the build wants in the slots open at the snapshot's
 * level with the stigmas slotted, as sets, since a slot's position isn't
 * readable: each wanted stigma not slotted is paired, in slot order, with
 * a slotted one the build doesn't want (`Swap Y for X`), or slotted into
 * a free slot when none is left over (`Slot X`); a wanted stigma the
 * snapshot's skills don't hold is acquired first. All are due now; a
 * snapshot that read no slot gives none.
 *
 * @param snapshot - the snapshot
 * @param build - the build it follows
 * @param refs - the build's refs
 * @returns the items
 */
function stigmaItems(
  snapshot: AccountSnapshotView,
  build: BuildView,
  refs: RoadmapItem["refs"],
): Unranked[] {
  if (snapshot.stigmas.length === 0) return [];
  const wanted = [...build.stigmas]
    .sort((a, b) => a.slotLevel - b.slotLevel)
    .filter((want) => want.slotLevel <= snapshot.level);
  const slotted = [...snapshot.stigmas]
    .sort((a, b) => a.slotLevel - b.slotLevel)
    .filter((slot) => slot.name !== null);
  const missing = wanted.filter((want) => !slotted.some((s) => s.skillId === want.skill.id));
  const spare = slotted.filter((slot) => !wanted.some((w) => w.skill.id === slot.skillId));
  return missing.map((want, i): Unranked => {
    const out = spare[i]?.name;
    const owned = snapshot.skills.some((s) => s.skillId === want.skill.id);
    const name = want.skill.name;
    const action = owned
      ? out
        ? `Swap ${out} for ${name}`
        : `Slot ${name}`
      : out
        ? `Acquire ${name}, then swap it for ${out}`
        : `Acquire ${name}`;
    const subject = { names: out ? [name, out] : [name] };
    return {
      priority: "now",
      area: "stigmas",
      action,
      why: want.why,
      refs,
      derived: true,
      subject,
    };
  });
}

/**
 * Lists the build's macro chains the snapshot lacks, all due next: a chain
 * no read chain matches step for step is rebuilt over the read chain in
 * its place (unless that one matches another of the build's chains), or
 * built otherwise; a matching chain without a key is bound.
 *
 * @param snapshot - the snapshot
 * @param build - the build it follows
 * @returns the items, each referring to its chain
 */
function macroItems(snapshot: AccountSnapshotView, build: BuildView): Unranked[] {
  const matched = new Set(
    snapshot.macros.filter((read) => build.macros.some((wanted) => sameSteps(read, wanted))),
  );
  return build.macros.flatMap((wanted, i): Unranked[] => {
    const refs = build.recordSlug ? [{ record: build.recordSlug, id: wanted.id }] : [];
    const subject = { names: [wanted.name], id: wanted.id };
    const item = { priority: "next" as const, area: "macro", refs, derived: true, subject };
    const match = snapshot.macros.find((read) => sameSteps(read, wanted));
    if (match) {
      return match.key === null
        ? [{ ...item, action: `Bind the ${wanted.name} macro`, why: `Key: ${wanted.key}` }]
        : [];
    }
    const inPlace = snapshot.macros.find((read) => read.position === i + 1 && !matched.has(read));
    const action = inPlace
      ? `Rebuild ${inPlace.name} as ${wanted.name}`
      : `Build the ${wanted.name} macro`;
    return [{ ...item, action, why: wanted.why }];
  });
}

/**
 * Derives the items of {@link deriveRoadmap}, each with its subject, and
 * every skill name the snapshot and the followed build use.
 *
 * @param snapshot - the snapshot
 * @param builds - builds, in position order; those of other classes and obsolete ones are ignored
 * @returns the ranked items and the names; both empty when no current build of the class exists
 */
function derive(
  snapshot: AccountSnapshotView,
  builds: readonly BuildView[],
): { items: Derived[]; names: string[] } {
  const build = builds.find((b) => b.class === snapshot.class && b.obsoleteSince === null);
  if (!build) return { items: [], names: [] };
  const refs = build.recordSlug ? [{ record: build.recordSlug, id: build.id }] : [];
  const items = [
    ...skillItems(snapshot, build, refs),
    ...stigmaItems(snapshot, build, refs),
    ...macroItems(snapshot, build),
  ];
  const names = [
    ...snapshot.skills.map((s) => s.name),
    ...build.skills.map((s) => s.skill.name),
    ...build.stigmas.map((s) => s.skill.name),
    ...build.macros.flatMap((m) => m.steps.map((s) => s.skill.name)),
  ];
  // `sort` is stable, so items of one priority keep the order the rules listed them in.
  const ranked = items
    .sort((a, b) => ACCOUNT_PRIORITY.indexOf(a.priority) - ACCOUNT_PRIORITY.indexOf(b.priority))
    .map((item, i) => ({ rank: i + 1, ...item }));
  return { items: ranked, names: [...new Set(names)] };
}

/**
 * Derives the roadmap from a snapshot and the builds of its class: the
 * first current build of the snapshot's class (in `builds` order) is
 * followed, and its skills below target, its open stigma slots that are
 * empty or hold another stigma, and its macro chains the snapshot lacks
 * become items, ordered now before next and ranked from 1.
 *
 * @param snapshot - the snapshot
 * @param builds - builds, in position order; those of other classes and obsolete ones are ignored
 * @returns the derived items; `[]` when no current build of the class exists
 */
export function deriveRoadmap(
  snapshot: AccountSnapshotView,
  builds: readonly BuildView[],
): RoadmapItem[] {
  return derive(snapshot, builds).items.map(({ subject: _subject, ...item }) => item);
}

/**
 * Reports whether a curated item is about what a derived item is about:
 * both in one area, and the curated item names the derived item's macro
 * chain in its `refs`, or names one of its subject's names in its action
 * (see {@link mentionsName}), or has the same action.
 *
 * @param row - the curated item
 * @param item - the derived item
 * @param names - every skill name in play, to tell a longer name apart
 * @returns `true` when both items are about the same skill, stigma or chain
 */
function sameSubject(row: AccountRoadmapItemRow, item: Derived, names: readonly string[]): boolean {
  if (row.area !== item.area) return false;
  if (row.action === item.action) return true;
  const { id } = item.subject;
  if (id !== undefined && row.refs.some((ref) => ref.id === id)) return true;
  return item.subject.names.some((name) => mentionsName(row.action, name, names));
}

/**
 * Builds a {@link RoadmapService}. The curated items come from the latest
 * snapshot, up to the one ranked against, that has any. When they were
 * ranked against that very snapshot, they win every area they cover and
 * the derived items fill only the areas they leave; when they come from
 * an older snapshot, every derived item stays and a curated item about
 * the same skill, stigma or macro chain as a derived item of its area is
 * dropped. Curated items follow the derived ones.
 *
 * @param store - the store to read curated items through
 * @param account - the account service, for the snapshot
 * @param builds - the build service, for the builds
 * @returns the service
 */
export function createRoadmapService(
  store: Store,
  account: AccountService,
  builds: BuildService,
): RoadmapService {
  return {
    /** @inheritdoc */
    roadmap: (choice = {}) => {
      const { snapshot, snapshots } = account.overview(choice);
      if (!snapshot) return { snapshotId: null, curatedFrom: null, items: [] };
      let curated: AccountRoadmapItemRow[] = [];
      let curatedFrom: string | null = null;
      for (const entry of snapshots.filter((e) => e.id <= snapshot.id).reverse()) {
        curated = store.repos.account.roadmap(entry.id);
        if (curated.length > 0) {
          curatedFrom = entry.id;
          break;
        }
      }
      const fresh = curatedFrom === snapshot.id;
      const covered = new Set(fresh ? curated.map((row) => row.area) : []);
      const { items: all, names } = derive(snapshot, builds.list({ class: snapshot.class }));
      const kept = all.filter((item) => !covered.has(item.area));
      const derived = kept.map(({ subject: _subject, ...item }, i) => ({ ...item, rank: i + 1 }));
      const items = [
        ...derived,
        ...curated
          .filter((row) => fresh || !kept.some((item) => sameSubject(row, item, names)))
          .map((row, i) => ({
            rank: derived.length + i + 1,
            priority: row.priority,
            area: row.area,
            action: row.action,
            why: row.why,
            refs: row.refs,
            derived: false,
          })),
      ];
      return { snapshotId: snapshot.id, curatedFrom, items };
    },
  };
}
