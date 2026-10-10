import type { GameClass, RecordClassRow, ResearchRecordRow } from "@aion/schema";
import { recordClasses, researchRecords } from "@aion/schema";
import type { InferInsertModel } from "drizzle-orm";
import { asc, count, eq } from "drizzle-orm";
import type { Db } from "../db/client";

/** Insert/upsert payload for {@link RecordsRepo.upsert}. */
export type RecordInsert = InferInsertModel<typeof researchRecords>;

/**
 * The research records (one row per investigated question), keyed by
 * `slug`, and the classes each covers (`record_classes`).
 */
export interface RecordsRepo {
  /** Lists every research record, ordered by `slug`. */
  list(): ResearchRecordRow[];
  /**
   * Returns the record with `slug`, or `undefined` if there is none.
   *
   * @param slug - the record's slug
   */
  get(slug: string): ResearchRecordRow | undefined;
  /**
   * Inserts a research record, or updates it in place if its `slug` already
   * exists.
   *
   * @param row - the record to write
   * @returns the written row
   */
  upsert(row: RecordInsert): ResearchRecordRow;
  /** Returns the number of research records. */
  count(): number;
  /** Lists every record's covered classes, ordered by record slug then class. */
  classes(): RecordClassRow[];
  /**
   * Replaces the classes record `slug` covers with `classes`.
   *
   * @param slug - the record's slug
   * @param classes - the classes; `[]` clears them
   * @throws if `slug` isn't a research record, or a class repeats
   */
  replaceClasses(slug: string, classes: readonly GameClass[]): void;
}

/**
 * Builds a {@link RecordsRepo}.
 *
 * @param db - database or transaction handle
 * @returns the repo
 */
export function createRecordsRepo(db: Db): RecordsRepo {
  return {
    /** @inheritdoc */
    list: () => db.select().from(researchRecords).orderBy(asc(researchRecords.slug)).all(),
    /** @inheritdoc */
    get: (slug) => db.select().from(researchRecords).where(eq(researchRecords.slug, slug)).get(),
    /** @inheritdoc */
    upsert: (row) =>
      db
        .insert(researchRecords)
        .values(row)
        .onConflictDoUpdate({ target: researchRecords.slug, set: row })
        .returning()
        .get(),
    /** @inheritdoc */
    count: () => db.select({ n: count() }).from(researchRecords).get()!.n,
    /** @inheritdoc */
    classes: () =>
      db
        .select()
        .from(recordClasses)
        .orderBy(asc(recordClasses.recordSlug), asc(recordClasses.class))
        .all(),
    /** @inheritdoc */
    replaceClasses: (slug, classes) => {
      db.delete(recordClasses).where(eq(recordClasses.recordSlug, slug)).run();
      if (classes.length > 0) {
        db.insert(recordClasses)
          .values(classes.map((cls) => ({ recordSlug: slug, class: cls })))
          .run();
      }
    },
  };
}
