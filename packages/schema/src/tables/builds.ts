import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { BUILD_PURPOSE, CONFIDENCE } from "../enums";
import { classColumn, obsoleteColumns, recordSlugColumn } from "./columns";
import { skills } from "./skills";

/** A recommended setup for one class and purpose: skill priorities, stigmas and macro chains. */
export const builds = sqliteTable("builds", {
  id: text("id").primaryKey(),
  class: classColumn(),
  purpose: text("purpose", { enum: BUILD_PURPOSE }).notNull(),
  title: text("title").notNull(),
  why: text("why").notNull(),
  confidence: text("confidence", { enum: CONFIDENCE }).notNull(),
  position: integer("position").notNull().default(0),
  recordSlug: recordSlugColumn(),
  ...obsoleteColumns(),
});

/** A skill's place in a build's level-up priority: `rank` 1 is levelled first, up to `targetLevel`. */
export const buildSkills = sqliteTable(
  "build_skills",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    buildId: text("build_id")
      .notNull()
      .references(() => builds.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
    rank: integer("rank").notNull(),
    targetLevel: integer("target_level").notNull(),
    why: text("why").notNull(),
  },
  (t) => [unique("build_skills_rank").on(t.buildId, t.rank)],
);

/** The stigma a build slots in the slot that unlocks at `slotLevel`. */
export const buildStigmas = sqliteTable(
  "build_stigmas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    buildId: text("build_id")
      .notNull()
      .references(() => builds.id, { onDelete: "cascade" }),
    slotLevel: integer("slot_level").notNull(),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
    why: text("why").notNull(),
  },
  (t) => [unique("build_stigmas_slot").on(t.buildId, t.slotLevel)],
);
