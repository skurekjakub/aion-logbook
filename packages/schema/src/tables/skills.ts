import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { SKILL_KIND } from "../enums";
import { classColumn, recordSlugColumn } from "./columns";

/**
 * A class skill as the global client names it. `id` is `<class>-<slug of the name>`;
 * `unlockLevel` is the character level that grants it; stigmas are skills
 * of kind `stigma`.
 */
export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  class: classColumn(),
  name: text("name").notNull(),
  nameKr: text("name_kr"),
  kind: text("kind", { enum: SKILL_KIND }).notNull(),
  unlockLevel: integer("unlock_level").notNull(),
  cooldownSec: real("cooldown_sec"),
  summary: text("summary"),
  recordSlug: recordSlugColumn(),
});
