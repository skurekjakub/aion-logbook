import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { builds } from "./builds";
import { skills } from "./skills";

/**
 * One chain in the game's built-in macro editor, bound to `key`, with the
 * editor's step delay. `position` orders a build's chains as curated.
 */
export const macros = sqliteTable("macros", {
  id: text("id").primaryKey(),
  buildId: text("build_id")
    .notNull()
    .references(() => builds.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  name: text("name").notNull(),
  key: text("key").notNull(),
  delayMs: integer("delay_ms").notNull(),
  why: text("why").notNull(),
});

/** A step of a macro chain; `position` 1 is the editor's first slot. */
export const macroSteps = sqliteTable(
  "macro_steps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    macroId: text("macro_id")
      .notNull()
      .references(() => macros.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id),
    note: text("note"),
  },
  (t) => [unique("macro_steps_position").on(t.macroId, t.position)],
);
