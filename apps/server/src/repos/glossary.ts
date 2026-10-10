import type { GlossaryKind, GlossaryRow } from "@aion/schema";
import { glossary } from "@aion/schema";
import type { InferInsertModel } from "drizzle-orm";
import { asc, count, eq } from "drizzle-orm";
import type { Db } from "../db/client";

/** Insert/upsert payload for {@link GlossaryRepo.upsert}. */
export type GlossaryInsert = InferInsertModel<typeof glossary>;

/**
 * The Korean-to-English glossary of class, skill, stat, item and general
 * terms, keyed by its Korean form (`kr`).
 */
export interface GlossaryRepo {
  /**
   * Lists glossary entries ordered by `kr`.
   *
   * @param kind - restrict the list to this kind, when given
   */
  list(kind?: GlossaryKind): GlossaryRow[];
  /**
   * Returns the entry keyed by `kr`, or `undefined` if there is none.
   *
   * @param kr - the Korean term
   */
  get(kr: string): GlossaryRow | undefined;
  /**
   * Inserts a glossary entry, or updates it in place if its `kr` already
   * exists.
   *
   * @param row - the entry to write
   * @returns the written row
   */
  upsert(row: GlossaryInsert): GlossaryRow;
  /** Returns the number of glossary entries. */
  count(): number;
}

/**
 * Builds a {@link GlossaryRepo}.
 *
 * @param db - database or transaction handle
 * @returns the repo
 */
export function createGlossaryRepo(db: Db): GlossaryRepo {
  return {
    /** @inheritdoc */
    list: (kind) => {
      const query = db.select().from(glossary).$dynamic();
      return (kind ? query.where(eq(glossary.kind, kind)) : query).orderBy(asc(glossary.kr)).all();
    },
    /** @inheritdoc */
    get: (kr) => db.select().from(glossary).where(eq(glossary.kr, kr)).get(),
    /** @inheritdoc */
    upsert: (row) =>
      db
        .insert(glossary)
        .values(row)
        .onConflictDoUpdate({ target: glossary.kr, set: row })
        .returning()
        .get(),
    /** @inheritdoc */
    count: () => db.select({ n: count() }).from(glossary).get()!.n,
  };
}
