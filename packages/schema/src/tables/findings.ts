import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { CONFIDENCE } from "../enums";
import { optionalClassColumn, recordSlugColumn } from "./columns";

/**
 * A game mechanic writeup with an assigned confidence level. `topic` groups
 * writeups of one kind, e.g. `macros` for the macro editor's rules; `null`
 * for none. `alsoTopics` files it under further topics it bears on. `class`
 * is `null` when the writeup applies to every class.
 */
export const mechanics = sqliteTable("mechanics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  confidence: text("confidence", { enum: CONFIDENCE }).notNull(),
  class: optionalClassColumn(),
  topic: text("topic"),
  alsoTopics: text("also_topics", { mode: "json" }).$type<string[]>().notNull().default([]),
  recordSlug: recordSlugColumn(),
});

/**
 * A source of run-to-run randomness and how to mitigate it. `class` is
 * `null` when it applies to every class.
 */
export const rngFactors = sqliteTable("rng_factors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  factor: text("factor").notNull(),
  effect: text("effect").notNull(),
  mitigation: text("mitigation"),
  class: optionalClassColumn(),
  recordSlug: recordSlugColumn(),
});

/** A dated event on the meta's timeline. `class` is `null` when it concerns every class. */
export const timeline = sqliteTable("timeline", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  event: text("event").notNull(),
  class: optionalClassColumn(),
  recordSlug: recordSlugColumn(),
});

/**
 * A ranked, one-line takeaway from a research record. `class` is `null`
 * when it applies to every class.
 */
export const takeaways = sqliteTable("takeaways", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  position: integer("position").notNull(),
  text: text("text").notNull(),
  detail: text("detail"),
  class: optionalClassColumn(),
  recordSlug: recordSlugColumn(),
});
