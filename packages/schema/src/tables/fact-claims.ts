import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { CITED_ENTITY } from "../enums";
import { sources } from "./sources";

/**
 * A research record's claim to a game fact (a row of a table no record
 * owns), one row per source the record cites for it. The fact's citations
 * are the union of its claims' sources. The record owns its claims, so its
 * re-import clears them; a fact no record claims any more goes with its
 * last claim.
 */
export const factClaims = sqliteTable(
  "fact_claims",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entity: text("entity", { enum: CITED_ENTITY }).notNull(),
    entityId: text("entity_id").notNull(),
    recordSlug: text("record_slug").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
  },
  (t) => [
    uniqueIndex("fact_claims_entity_entity_id_record_slug_source_id_uq").on(
      t.entity,
      t.entityId,
      t.recordSlug,
      t.sourceId,
    ),
    index("fact_claims_entity_entity_id_idx").on(t.entity, t.entityId),
  ],
);
