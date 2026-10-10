import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { CITED_ENTITY } from "../enums";
import { sources } from "./sources";

/** A link from a cited entity (skill, build, mechanic, etc.) to the source that backs it. */
export const citations = sqliteTable(
  "citations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entity: text("entity", { enum: CITED_ENTITY }).notNull(),
    entityId: text("entity_id").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
  },
  (t) => [
    uniqueIndex("citations_entity_entity_id_source_id_uq").on(t.entity, t.entityId, t.sourceId),
    index("citations_entity_entity_id_idx").on(t.entity, t.entityId),
  ],
);
