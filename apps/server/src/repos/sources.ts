import type { SourceRow, SourceSite } from "@aion/schema";
import { sources } from "@aion/schema";
import type { InferInsertModel } from "drizzle-orm";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client";

/** Insert payload for {@link SourcesRepo.insert}. */
export type SourceInsert = InferInsertModel<typeof sources>;

/** CRUD and lookups over the `sources` table, keyed by its text `id`. */
export interface SourcesRepo {
  /**
   * Lists sources, dated newest first with null dates last, then by `id`.
   *
   * @param site - restrict the list to this site, when given
   */
  list(site?: SourceSite): SourceRow[];
  /**
   * Returns the source with `id`, or `undefined` if there is none.
   *
   * @param id - the source's `<site>:<key>` id
   * @returns the matching row, or `undefined` if `id` doesn't exist
   */
  get(id: string): SourceRow | undefined;
  /**
   * Inserts a source.
   *
   * @throws if `id` already exists or a NOT NULL column is missing
   */
  insert(row: SourceInsert): SourceRow;
  /**
   * Updates the source with `id`, merging in `patch`.
   *
   * @returns the updated row, or `undefined` if `id` doesn't exist
   */
  update(id: string, patch: Partial<SourceInsert>): SourceRow | undefined;
  /**
   * Deletes the source with `id`.
   *
   * @param id - the source's `<site>:<key>` id
   * @returns `true` if a row was deleted, `false` if `id` didn't exist
   */
  remove(id: string): boolean;
  /**
   * Returns the ids in `ids` that don't exist in `sources`.
   *
   * @param ids - candidate source ids
   * @returns the absent ids, in their input order; `[]` if `ids` is empty
   *   or every id exists
   */
  missing(ids: string[]): string[];
  /** Returns the number of sources. */
  count(): number;
}

/**
 * Builds a {@link SourcesRepo}.
 *
 * @param db - database or transaction handle
 * @returns the repo
 */
export function createSourcesRepo(db: Db): SourcesRepo {
  return {
    /** @inheritdoc */
    list: (site) => {
      const query = db.select().from(sources).$dynamic();
      return (site ? query.where(eq(sources.site, site)) : query)
        .orderBy(desc(sources.date), asc(sources.id))
        .all();
    },
    /** @inheritdoc */
    get: (id) => db.select().from(sources).where(eq(sources.id, id)).get(),
    /** @inheritdoc */
    insert: (row) => db.insert(sources).values(row).returning().get(),
    /** @inheritdoc */
    update: (id, patch) =>
      db.update(sources).set(patch).where(eq(sources.id, id)).returning().get(),
    /** @inheritdoc */
    remove: (id) =>
      db.delete(sources).where(eq(sources.id, id)).returning({ id: sources.id }).all().length > 0,
    /** @inheritdoc */
    missing: (ids) => {
      if (ids.length === 0) return [];
      const found = new Set(
        db
          .select({ id: sources.id })
          .from(sources)
          .where(inArray(sources.id, ids))
          .all()
          .map((r) => r.id),
      );
      return ids.filter((id) => !found.has(id));
    },
    /** @inheritdoc */
    count: () => db.select({ n: count() }).from(sources).get()!.n,
  };
}
