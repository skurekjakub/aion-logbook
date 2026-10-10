/**
 * Pure helpers for the build pages: which build a page shows, how a
 * build's targets compare with the character as read, the stigma slot
 * track and a skill's badge initials. `/api` rows fit these shapes as they are.
 *
 * @module
 */
import { isCurrent } from "./obsolete";
import type { Lifecycle } from "./obsolete";

/** What a build is for, as the API names it. */
export type Purpose = "leveling" | "pve" | "pvp";

/** Each purpose's label. */
export const PURPOSE_LABEL: Readonly<Record<Purpose, string>> = {
  leveling: "Leveling",
  pve: "PvE",
  pvp: "PvP",
};

/**
 * The character levels the global client opens a stigma slot at. A build
 * that slots a stigma at another level adds that slot to the track.
 */
export const STIGMA_SLOTS: readonly number[] = [22, 27, 32, 37];

/**
 * Picks the build a page shows: the one the address names when it is
 * listed, else the first current build, else the first build.
 *
 * @param builds - the class's builds, in list order
 * @param id - the build id the address names, if any
 * @returns the build, or undefined when there are none
 */
export function pickBuild<T extends Lifecycle & { id: string }>(
  builds: readonly T[],
  id: string | undefined,
): T | undefined {
  return builds.find((b) => b.id === id) ?? builds.find(isCurrent) ?? builds[0];
}

/** The character as one class's build pages read it. */
export interface CharacterReading {
  /** The character's level. */
  level: number;
  /** Skill id → its level as read (`null` when the level wasn't read). */
  skills: ReadonlyMap<string, number | null>;
  /**
   * Stigma slot level → the skill id slotted there, or `null` for a slot
   * read empty. A slot whose stigma didn't resolve to a skill is left out,
   * since nothing can be said about it.
   */
  stigmas: ReadonlyMap<number, string | null>;
}

/** The parts of a character snapshot {@link readCharacter} reads. */
export interface SnapshotShape {
  class: string;
  level: number;
  skills: ReadonlyArray<{ skillId: string | null; level: number | null }>;
  /** Each stigma slot: `name` is `null` for an empty slot, `skillId` when the name resolved. */
  stigmas: ReadonlyArray<{ slotLevel: number; name: string | null; skillId: string | null }>;
}

/**
 * Reads a snapshot for one class's pages: nothing when the character plays
 * another class, since its levels say nothing about this class's builds.
 *
 * @param snapshot - the latest snapshot, or null when none is loaded
 * @param cls - the class whose pages ask
 * @returns the reading, or null without a snapshot of that class
 */
export function readCharacter(
  snapshot: SnapshotShape | null,
  cls: string,
): CharacterReading | null {
  if (!snapshot || snapshot.class !== cls) return null;
  const skills = new Map<string, number | null>();
  for (const s of snapshot.skills) if (s.skillId) skills.set(s.skillId, s.level);
  const stigmas = new Map<number, string | null>();
  for (const s of snapshot.stigmas) {
    if (s.name === null) stigmas.set(s.slotLevel, null);
    else if (s.skillId) stigmas.set(s.slotLevel, s.skillId);
  }
  return { level: snapshot.level, skills, stigmas };
}

/** How a skill's level compares with its target: below it, at or past it, or not read. */
export type LevelState = "up" | "done" | "unknown";

/**
 * Compares a skill's level as read with the build's target.
 *
 * @param target - the build's target level
 * @param current - the level as read; null or undefined when not read
 * @returns `up` below the target, `done` at or past it, `unknown` when not read
 */
export function levelState(target: number, current: number | null | undefined): LevelState {
  if (current == null) return "unknown";
  return current < target ? "up" : "done";
}

/**
 * The stigma slot track of a build: the client's slot levels plus any
 * other level the build slots at, lowest first.
 *
 * @param stigmas - the build's stigma slots
 * @returns the slot levels, distinct, ascending
 */
export function slotTrack(stigmas: ReadonlyArray<{ slotLevel: number }>): number[] {
  return [...new Set([...STIGMA_SLOTS, ...stigmas.map((s) => s.slotLevel)])].sort((a, b) => a - b);
}

/**
 * A skill's badge initials: the first letter of its first two words.
 *
 * @param name - the skill's name, e.g. `Ruinous Blow`
 * @returns e.g. `RB`; the first two letters for a one-word name; `?` for an empty one
 */
export function skillInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
