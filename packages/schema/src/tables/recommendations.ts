import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { recordSlugColumn } from "./columns";

/** A suggested change: a summary and the specific edits it entails. */
export const recommendations = sqliteTable("recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  summary: text("summary").notNull(),
  changes: text("changes", { mode: "json" }).$type<string[]>().notNull(),
  recordSlug: recordSlugColumn(),
});
