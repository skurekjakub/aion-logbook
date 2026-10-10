import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
