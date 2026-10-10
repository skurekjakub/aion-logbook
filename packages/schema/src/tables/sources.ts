import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { SOURCE_SITE } from "../enums";
import { recordSlugColumn } from "./columns";

/**
 * A citable source: a web page or a YouTube video the research draws on.
 * `id` is a `<site>:<key>` string, e.g. `yt:dQw4w9WgXcQ`. Records share
 * sources: `recordSlug` is the first record that loaded it.
 */
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  site: text("site", { enum: SOURCE_SITE }).notNull(),
  url: text("url").notNull(),
  title: text("title"),
  titleEn: text("title_en"),
  date: text("date"),
  relevance: integer("relevance"),
  note: text("note"),
  summaryEn: text("summary_en"),
  capturePath: text("capture_path"),
  recordSlug: recordSlugColumn(),
});
