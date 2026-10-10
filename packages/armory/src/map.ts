/**
 * Maps the official site's public character data onto an
 * `aion-account-snapshot/1` document. What the site doesn't publish
 * (macros, hotbar slots, stigma slot positions) comes from the previous
 * snapshot; what is missing or can't be settled goes to `unread[]`.
 * The field map is `research/002-character-data-source/README.md`.
 *
 * @module
 */
import type { AccountSnapshotFile, GameClass } from "@aion/schema";
import { CLASS, accountSnapshotFile } from "@aion/schema";
import { z } from "zod";

/** The official data doesn't fit the snapshot: a required field is missing or has the wrong shape. */
export class MapError extends Error {
  override name = "MapError";
}

/**
 * The unlock levels of the global client's stigma slots
 * (`research/001-cleric-build/curated/timeline.json`, global launch).
 */
export const STIGMA_SLOT_LEVELS = [22, 27, 32, 37] as const;

/** The note on stigma slot positions, which the site doesn't publish. */
export const SLOT_NOTE =
  "Stigma slot levels: not published; kept from the last read, new ones fill open slots in list order";

/** The note when macros and hotbar slots come from an earlier snapshot. */
const CARRIED_NOTE = "Macros, hotbar slots: carried from the last game read";

/** The note when no earlier snapshot holds macros or hotbar slots. */
const NEVER_READ_NOTE = "Macros, hotbar slots: not published, never read in game";

/**
 * The note for a nullable character field the official data left out.
 *
 * @param subject - the field as the note names it, e.g. `Item level`
 * @returns the note
 */
const missingNote = (subject: string) => `${subject}: missing from official data`;

/** The subjects of the notes this module writes; an earlier snapshot's notes on them are dropped. */
const OWN_SUBJECTS = ["Stigma slot levels", "Macros, hotbar slots", "Item level", "Server"];

/** One row of `skill.skillList` in the equipment response. */
const skillRow = z.object({
  name: z.string().min(1),
  category: z.string(),
  skillLevel: z.number().int(),
  acquired: z.number().int(),
  equip: z.number().int(),
});

/** The fields of the official responses the snapshot reads; anything else is ignored. */
const characterData = z.object({
  region: z.string().min(1),
  info: z.object({
    profile: z.object({
      characterName: z.string().min(1),
      className: z.string().min(1),
      characterLevel: z.number().int().min(1),
      serverName: z.string().min(1).nullish(),
    }),
    stat: z
      .object({ statList: z.array(z.object({ type: z.string(), value: z.number() })).nullish() })
      .nullish(),
  }),
  equipment: z.object({ skill: z.object({ skillList: z.array(skillRow) }) }),
});

/** A skill row as the official data lists it. */
type SkillRow = z.output<typeof skillRow>;

/**
 * Parses the official responses down to the fields the snapshot reads.
 *
 * @param raw - what `fetchCharacter` returned
 * @returns the parsed fields
 * @throws {MapError} naming every field that is missing or has the wrong shape
 */
function parse(raw: unknown): z.output<typeof characterData> {
  const result = characterData.safeParse(raw);
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new MapError(`official data doesn't fit the snapshot: ${issues.join("; ")}`);
}

/**
 * Resolves the official class name to a logbook class.
 *
 * @param className - `profile.className`, e.g. `Cleric`
 * @returns the class
 * @throws {MapError} if the logbook has no such class
 */
function classOf(className: string): GameClass {
  const cls = CLASS.find((c) => c === className.toLowerCase());
  if (cls === undefined) throw new MapError(`unknown class ${className}`);
  return cls;
}

/**
 * The subject of an `unread[]` note: the text before its first colon.
 *
 * @param note - the note
 * @returns its subject, or the whole note when it has no colon
 */
function subjectOf(note: string): string {
  const at = note.indexOf(":");
  return at === -1 ? note : note.slice(0, at);
}

/**
 * Places the equipped stigmas into the slots open at `level`: a stigma
 * that sat in an open slot in the previous snapshot keeps it; the rest
 * fill the remaining open slots in list order, those with points before
 * those at level 0. Locked slots stay empty.
 *
 * @param equipped - the equipped stigma rows, in list order
 * @param level - the character's level
 * @param previous - the previous snapshot's slots, `[]` without one
 * @returns every slot by level, and the stigmas that found no open slot
 */
function placeStigmas(
  equipped: readonly SkillRow[],
  level: number,
  previous: AccountSnapshotFile["stigmas"],
): { stigmas: AccountSnapshotFile["stigmas"]; overflow: string[] } {
  const open = STIGMA_SLOT_LEVELS.filter((slotLevel) => slotLevel <= level);
  const slots = new Map<number, string>();
  const kept = new Set<string>();
  for (const { slotLevel, name } of previous) {
    if (name === null || !open.some((o) => o === slotLevel)) continue;
    if (equipped.some((row) => row.name === name)) {
      slots.set(slotLevel, name);
      kept.add(name);
    }
  }
  const rest = equipped.filter((row) => !kept.has(row.name));
  const ordered = [
    ...rest.filter((row) => row.skillLevel > 0),
    ...rest.filter((row) => row.skillLevel <= 0),
  ];
  const free = open.filter((slotLevel) => !slots.has(slotLevel));
  const overflow: string[] = [];
  for (const row of ordered) {
    const slotLevel = free.shift();
    if (slotLevel === undefined) overflow.push(row.name);
    else slots.set(slotLevel, row.name);
  }
  return {
    stigmas: STIGMA_SLOT_LEVELS.map((slotLevel) => ({
      slotLevel,
      name: slots.get(slotLevel) ?? null,
    })),
    overflow,
  };
}

/**
 * Maps the official character data to an `aion-account-snapshot/1`
 * document: name, class, level, item level as `gearScore` and server from
 * the info response; every acquired skill and stigma with its level from
 * the equipment response; the equipped stigmas placed into the open slots.
 * Macros and hotbar slots carry over from `previous`, and so do its
 * `unread[]` notes on anything this mapping doesn't decide.
 *
 * @param raw - the character data as `fetchCharacter` returns it
 * @param previous - the latest snapshot before this one, or `null`
 * @param capturedAt - when the data was fetched, ISO 8601 with offset
 * @returns the snapshot
 * @throws {MapError} if a required field (name, class, level, skill list)
 *   is missing or has the wrong shape, or the class is unknown
 */
export function toSnapshot(
  raw: unknown,
  previous: AccountSnapshotFile | null,
  capturedAt: string,
): AccountSnapshotFile {
  const { region, info, equipment } = parse(raw);
  const { profile } = info;
  const level = profile.characterLevel;
  const rows = equipment.skill.skillList.filter((row) => row.acquired === 1);
  const stigmaRows = rows.filter((row) => row.category === "Dp");
  const slotOf = new Map(previous?.skills.map((skill) => [skill.name, skill.slot]) ?? []);
  const { stigmas, overflow } = placeStigmas(
    stigmaRows.filter((row) => row.equip === 1),
    level,
    previous?.stigmas ?? [],
  );

  const itemLevel = info.stat?.statList?.find((row) => row.type === "ItemLevel")?.value;
  const gearScore = itemLevel === undefined ? null : Math.round(itemLevel);
  const server = profile.serverName ? `${profile.serverName} (${region.toUpperCase()})` : null;

  const earlier = previous?.unread ?? [];
  const stigmaNames = new Set(stigmaRows.map((row) => row.name));
  const own = [
    SLOT_NOTE,
    ...overflow.map(
      (name) =>
        earlier.find((note) => subjectOf(note) === name) ??
        `${name}: equipped in official data, no open slot`,
    ),
    ...(gearScore === null ? [missingNote("Item level")] : []),
    ...(server === null ? [missingNote("Server")] : []),
    previous ? CARRIED_NOTE : NEVER_READ_NOTE,
  ];
  const carried = earlier.filter((note) => {
    const subject = subjectOf(note);
    return !OWN_SUBJECTS.includes(subject) && !stigmaNames.has(subject);
  });

  return accountSnapshotFile.parse({
    schema: "aion-account-snapshot/1",
    capturedAt,
    character: {
      name: profile.characterName,
      class: classOf(profile.className),
      level,
      gearScore,
      server,
    },
    skills: rows.map((row) => ({
      name: row.name,
      level: row.skillLevel,
      slot: slotOf.get(row.name) ?? null,
    })),
    stigmas,
    macros: previous?.macros ?? [],
    screens: [],
    unread: [...new Set([...own, ...carried])],
  });
}
