import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { CAPTURE_APPROX } from "../enums";

/**
 * One line of a research record's capture ledger
 * (`research/<slug>/evidence/captures.jsonl`): which evidence file was
 * captured, from where, when, by what tool, and its bytes' hash. `path` is
 * relative to the record folder and unique within the record; the record
 * owns the row, so its re-import rewrites it.
 */
export const captures = sqliteTable(
  "captures",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recordSlug: text("record_slug").notNull(),
    path: text("path").notNull(),
    url: text("url"),
    capturedAt: text("captured_at").notNull(),
    approx: text("approx", { enum: CAPTURE_APPROX }),
    tool: text("tool").notNull(),
    sha256: text("sha256").notNull(),
  },
  (t) => [uniqueIndex("captures_record_slug_path_uq").on(t.recordSlug, t.path)],
);
