import type { CaptureRow } from "@aion/schema";
import { captures } from "@aion/schema";
import type { InferInsertModel } from "drizzle-orm";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../db/client";

/** Insert payload for {@link CapturesRepo.insertMany}. */
export type CaptureInsert = InferInsertModel<typeof captures>;

/** The capture-ledger lines of every loaded record. */
export interface CapturesRepo {
  /**
   * Lists every capture, ordered by record, then path.
   *
   * @returns the rows
   */
  list(): CaptureRow[];
  /**
   * Returns one record's capture of one path.
   *
   * @param recordSlug - the record's slug
   * @param path - the capture's record-relative path, e.g. `evidence/dc/1.md`
   * @returns the row, or `undefined` when the record's ledger doesn't list the path
   */
  byPath(recordSlug: string, path: string): CaptureRow | undefined;
  /**
   * Inserts every row in `rows`.
   *
   * @param rows - the ledger lines to insert; `[]` inserts nothing
   * @throws if a row repeats a record's path or misses a NOT NULL column
   */
  insertMany(rows: CaptureInsert[]): void;
}

/**
 * Builds a {@link CapturesRepo}.
 *
 * @param db - database or transaction handle
 * @returns the repo
 */
export function createCapturesRepo(db: Db): CapturesRepo {
  return {
    /** @inheritdoc */
    list: () =>
      db.select().from(captures).orderBy(asc(captures.recordSlug), asc(captures.path)).all(),
    /** @inheritdoc */
    byPath: (recordSlug, path) =>
      db
        .select()
        .from(captures)
        .where(and(eq(captures.recordSlug, recordSlug), eq(captures.path, path)))
        .get(),
    /** @inheritdoc */
    insertMany: (rows) => {
      if (rows.length > 0) db.insert(captures).values(rows).run();
    },
  };
}
