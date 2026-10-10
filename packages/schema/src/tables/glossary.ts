import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { GLOSSARY_KIND } from "../enums";
import { recordSlugColumn } from "./columns";

/**
 * A Korean term (a class, skill, stat, item, or general term) and its
 * English gloss. `extra` holds whatever else the record knows about it.
 * `recordSlug` is the record whose glossary it came from; a name resolver
 * asked about that record prefers its entries.
 */
export const glossary = sqliteTable("glossary", {
  kr: text("kr").primaryKey(),
  shorthand: text("shorthand", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  en: text("en"),
  kind: text("kind", { enum: GLOSSARY_KIND }).notNull(),
  extra: text("extra", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull()
    .$defaultFn(() => ({})),
  recordSlug: recordSlugColumn(),
});
