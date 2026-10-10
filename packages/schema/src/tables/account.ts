import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { ACCOUNT_PRIORITY } from "../enums";
import { classColumn } from "./columns";

/** The character as read from the live client on one day (`id` is the `YYYY-MM-DD` snapshot date). */
export const accountSnapshots = sqliteTable("account_snapshots", {
  id: text("id").primaryKey(),
  capturedAt: text("captured_at").notNull(),
  character: text("character").notNull(),
  class: classColumn(),
  level: integer("level").notNull(),
  gearScore: integer("gear_score"),
  server: text("server"),
  unread: text("unread", { mode: "json" }).$type<string[]>().notNull(),
});

/** A skill's level and hotbar slot in a snapshot; `skillName` is as read, `skillId` when it resolved. */
export const accountSkills = sqliteTable("account_skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  snapshotId: text("snapshot_id")
    .notNull()
    .references(() => accountSnapshots.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  skillId: text("skill_id"),
  level: integer("level"),
  slot: text("slot"),
});

/**
 * The stigma slot that unlocks at `slotLevel` in a snapshot: `skillName` as
 * read (`null` for an empty slot), `skillId` when it resolved.
 */
export const accountStigmas = sqliteTable(
  "account_stigmas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => accountSnapshots.id, { onDelete: "cascade" }),
    slotLevel: integer("slot_level").notNull(),
    skillName: text("skill_name"),
    skillId: text("skill_id"),
  },
  (t) => [unique("account_stigmas_slot").on(t.snapshotId, t.slotLevel)],
);

/**
 * A built-in macro chain as read in a snapshot, `position` 1 being the
 * editor's first chain; `key` is `null` when no key is bound.
 */
export const accountMacros = sqliteTable(
  "account_macros",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => accountSnapshots.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    key: text("key"),
  },
  (t) => [unique("account_macros_position").on(t.snapshotId, t.position)],
);

/** A step of a snapshot's macro chain; `position` 1 is the editor's first slot. */
export const accountMacroSteps = sqliteTable(
  "account_macro_steps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    macroId: integer("macro_id")
      .notNull()
      .references(() => accountMacros.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    skillName: text("skill_name").notNull(),
    skillId: text("skill_id"),
  },
  (t) => [unique("account_macro_steps_position").on(t.macroId, t.position)],
);

/** A next action for the character, ranked, against the research. */
export const accountRoadmapItems = sqliteTable("account_roadmap_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  snapshotId: text("snapshot_id")
    .notNull()
    .references(() => accountSnapshots.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  priority: text("priority", { enum: ACCOUNT_PRIORITY }).notNull(),
  area: text("area").notNull(),
  action: text("action").notNull(),
  why: text("why").notNull(),
  refs: text("refs", { mode: "json" }).$type<{ record: string; id?: string }[]>().notNull(),
});
