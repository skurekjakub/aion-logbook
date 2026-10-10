/**
 * Compares two snapshots of the character: whether anything but the read
 * time differs, and what did, one line per change, for the sync's commit
 * message.
 *
 * @module
 */
import { isDeepStrictEqual } from "node:util";
import type { AccountSnapshotFile } from "@aion/schema";

/**
 * Reports whether two snapshots hold the same character, whenever each was read.
 *
 * @param a - one snapshot
 * @param b - the other
 * @returns `true` when they differ in `capturedAt` at most
 */
export function sameSnapshot(a: AccountSnapshotFile, b: AccountSnapshotFile): boolean {
  return isDeepStrictEqual({ ...a, capturedAt: "" }, { ...b, capturedAt: "" });
}

/**
 * Formats a nullable value for a change line.
 *
 * @param value - the value
 * @returns it as text, `–` for `null`
 */
const show = (value: string | number | null | undefined) => (value == null ? "–" : String(value));

/**
 * Lists what changed from one snapshot to the next: the character's level,
 * gear score and server, each skill's level (a skill new to the list
 * included), and each stigma slot.
 *
 * @param before - the earlier snapshot
 * @param after - the later snapshot
 * @returns one line per change, e.g. `Bolt 9 → 10`; `[]` when none of those changed
 */
export function describeChanges(before: AccountSnapshotFile, after: AccountSnapshotFile): string[] {
  const lines: string[] = [];
  const fields = ["level", "gearScore", "server"] as const;
  for (const field of fields) {
    if (before.character[field] !== after.character[field]) {
      lines.push(`${field} ${show(before.character[field])} → ${show(after.character[field])}`);
    }
  }
  const levels = new Map(before.skills.map((skill) => [skill.name, skill.level]));
  for (const skill of after.skills) {
    const was = levels.get(skill.name);
    if (!levels.has(skill.name)) lines.push(`${skill.name} new at ${show(skill.level)}`);
    else if (was !== skill.level) lines.push(`${skill.name} ${show(was)} → ${show(skill.level)}`);
  }
  const slots = new Map(before.stigmas.map((slot) => [slot.slotLevel, slot.name]));
  for (const slot of after.stigmas) {
    const was = slots.get(slot.slotLevel) ?? null;
    if (was !== slot.name) {
      lines.push(`stigma slot ${slot.slotLevel}: ${show(was)} → ${show(slot.name)}`);
    }
  }
  return lines;
}
