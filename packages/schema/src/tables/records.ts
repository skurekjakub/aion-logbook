import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { RECORD_STATUS } from "../enums";
import { classColumn } from "./columns";

/**
 * A research record: one investigated question and the findings tied to it.
 * The classes it covers are its `record_classes` rows.
 */
export const researchRecords = sqliteTable("research_records", {
  slug: text("slug").primaryKey(),
  question: text("question").notNull(),
  status: text("status", { enum: RECORD_STATUS }).notNull(),
  startedAt: text("started_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  seasonLabel: text("season_label"),
  lede: text("lede"),
  caveat: text("caveat"),
});

/** One Aion 2 class a research record covers. */
export const recordClasses = sqliteTable(
  "record_classes",
  {
    recordSlug: text("record_slug")
      .notNull()
      .references(() => researchRecords.slug, { onDelete: "cascade" }),
    class: classColumn(),
  },
  (t) => [primaryKey({ columns: [t.recordSlug, t.class] })],
);
