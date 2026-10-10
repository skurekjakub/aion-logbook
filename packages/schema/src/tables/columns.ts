import { text } from "drizzle-orm/sqlite-core";
import { CLASS } from "../enums";

/**
 * Builds a `class` column: the Aion 2 class a row is about.
 *
 * @returns a NOT NULL `CLASS` column
 */
export function classColumn() {
  return text("class", { enum: CLASS }).notNull();
}

/**
 * Builds a `record_slug` column: the research record whose import wrote the
 * row, which a record's re-import (`--replace`) clears and rewrites.
 *
 * @returns a nullable text column; `null` marks a row no import owns, such
 *   as one written through the API
 */
export function recordSlugColumn() {
  return text("record_slug");
}

/**
 * Builds the obsolete lifecycle's columns: since when a recommendation is
 * no longer current, and why. Both are `null` while it is current; a
 * record's import sets both together, and cites the reason under
 * `obsolescence`.
 *
 * @returns `obsoleteSince` (an ISO date) and `obsoleteReason` (text), both nullable
 */
export function obsoleteColumns() {
  return {
    obsoleteSince: text("obsolete_since"),
    obsoleteReason: text("obsolete_reason"),
  };
}
