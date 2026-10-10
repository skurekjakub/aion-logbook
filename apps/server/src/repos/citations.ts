import type { CitationRow, CitedEntity } from "@aion/schema";
import { citations } from "@aion/schema";
import { and, count, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client";
import { resetIds } from "./sequence";

/** Ids per `IN (...)` list, well under SQLite's bound-parameter limit. */
const ID_CHUNK = 500;

/** Links from cited entities (skills, builds, mechanics, …) to the sources that back them. */
export interface CitationsRepo {
  /**
   * Groups the sources cited by each of `entityIds` for `entity`.
   *
   * @param entity - the cited entity kind
   * @param entityIds - entity ids to look up
   * @returns a map from entity id to its sorted, deduplicated source ids;
   *   entity ids with no citations are absent from the map; `entityIds`
   *   of `[]` returns an empty map
   */
  sourcesFor(entity: CitedEntity, entityIds: string[]): Map<string, string[]>;
  /**
   * Replaces every citation for `(entity, entityId)` with `sourceIds`.
   *
   * @param entity - the cited entity kind
   * @param entityId - the specific entity's id
   * @param sourceIds - the sources to cite; duplicates are removed
   * @throws if any `sourceIds` entry doesn't exist in `sources`
   */
  replace(entity: CitedEntity, entityId: string, sourceIds: string[]): void;
  /**
   * Deletes every citation for `(entity, entityId)`.
   *
   * @param entity - the cited entity kind
   * @param entityId - the specific entity's id
   */
  removeAll(entity: CitedEntity, entityId: string): void;
  /**
   * Deletes every citation of each of `entityIds` for `entity`.
   *
   * @param entity - the cited entity kind
   * @param entityIds - the entities' ids; `[]` deletes nothing
   */
  removeFor(entity: CitedEntity, entityIds: readonly string[]): void;
  /** Returns how many citations reference `sourceId`, across every entity. */
  countForSource(sourceId: string): number;
  /** Returns the total number of citations. */
  count(): number;
  /** Deletes every citation and resets the citation id counter. */
  clear(): void;
  /** Returns every citation row. */
  all(): CitationRow[];
}

/**
 * Builds a {@link CitationsRepo}.
 *
 * @param db - database or transaction handle
 * @returns the repo
 */
export function createCitationsRepo(db: Db): CitationsRepo {
  return {
    /** @inheritdoc */
    sourcesFor: (entity, entityIds) => {
      const result = new Map<string, string[]>();
      if (entityIds.length === 0) return result;
      const rows = db
        .select({ entityId: citations.entityId, sourceId: citations.sourceId })
        .from(citations)
        .where(and(eq(citations.entity, entity), inArray(citations.entityId, entityIds)))
        .all();
      for (const row of rows) {
        const list = result.get(row.entityId);
        if (list) list.push(row.sourceId);
        else result.set(row.entityId, [row.sourceId]);
      }
      for (const list of result.values()) list.sort();
      return result;
    },
    /** @inheritdoc */
    replace: (entity, entityId, sourceIds) => {
      db.delete(citations)
        .where(and(eq(citations.entity, entity), eq(citations.entityId, entityId)))
        .run();
      const distinct = [...new Set(sourceIds)];
      if (distinct.length > 0) {
        db.insert(citations)
          .values(distinct.map((sourceId) => ({ entity, entityId, sourceId })))
          .run();
      }
    },
    /** @inheritdoc */
    removeAll: (entity, entityId) => {
      db.delete(citations)
        .where(and(eq(citations.entity, entity), eq(citations.entityId, entityId)))
        .run();
    },
    /** @inheritdoc */
    removeFor: (entity, entityIds) => {
      for (let start = 0; start < entityIds.length; start += ID_CHUNK) {
        const ids = entityIds.slice(start, start + ID_CHUNK);
        db.delete(citations)
          .where(and(eq(citations.entity, entity), inArray(citations.entityId, ids)))
          .run();
      }
    },
    /** @inheritdoc */
    countForSource: (sourceId) =>
      db.select({ n: count() }).from(citations).where(eq(citations.sourceId, sourceId)).get()!.n,
    /** @inheritdoc */
    count: () => db.select({ n: count() }).from(citations).get()!.n,
    /** @inheritdoc */
    clear: () => {
      db.delete(citations).run();
      resetIds(db, citations);
    },
    /** @inheritdoc */
    all: () => db.select().from(citations).all(),
  };
}
