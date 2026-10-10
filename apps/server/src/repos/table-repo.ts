import type { InferInsertModel, InferSelectModel, SQL } from "drizzle-orm";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Db } from "../db/client";
import { ConflictError } from "../errors";
import type { OrderKey } from "../registry";
import { resetIds } from "./sequence";

/** A drizzle SQLite table with an `id` primary key column, an integer or a text slug. */
type IdTable = SQLiteTable & { id: SQLiteColumn };

/** A row's `id`: an integer for a table that numbers its rows, a slug for one keyed by name. */
export type RowId = number | string;

/**
 * Translates a declared list order into drizzle `ORDER BY` terms.
 *
 * @param table - the table the columns belong to
 * @param keys - the order, most significant first; a `nullsLast` key sorts
 *   by `<column> is null` before the column itself, and a `rank` key by
 *   the value's place in `rank` instead of the value
 * @returns the terms, for {@link createTableRepo}'s `orderBy`
 * @throws `Error` naming the column if `table` has no such column
 */
export function orderTerms<T extends SQLiteTable>(
  table: T,
  keys: readonly OrderKey<InferSelectModel<T>>[],
): (SQL | SQLiteColumn)[] {
  return keys.flatMap((key) => {
    const {
      column,
      desc: descending,
      nullsLast,
      rank,
    } = typeof key === "string" ? { column: key } : key;
    const col = (table as unknown as Record<string, SQLiteColumn | undefined>)[column];
    if (!col) throw new Error(`table has no column "${column}"`);
    const ranked = rank
      ? sql`case ${col} ${sql.join(
          rank.map((value, index) => sql`when ${value} then ${index}`),
          sql` `,
        )} else ${rank.length} end`
      : col;
    const term = descending ? desc(ranked) : asc(ranked);
    return nullsLast ? [sql`${col} is null`, term] : [term];
  });
}

/**
 * Generic CRUD operations over a table with an `id` primary key.
 *
 * @typeParam Row - the shape of a selected row
 * @typeParam Insert - the shape accepted by `insert`
 */
export interface TableRepo<Row, Insert> {
  /** Returns every row, in the repo's configured order. */
  list(): Row[];
  /**
   * Returns the row with `id`, or `undefined` if there is none.
   *
   * @param id - the row's primary key
   * @returns the matching row, or `undefined` if `id` doesn't exist
   */
  get(id: RowId): Row | undefined;
  /**
   * Inserts a row.
   *
   * @throws {ConflictError} if `values` duplicates a unique index's columns
   * @throws if `values` violates another constraint (a foreign key, or a
   *   NOT NULL column)
   */
  insert(values: Insert): Row;
  /**
   * Updates the row with `id`, merging in `patch`.
   *
   * @returns the updated row, or `undefined` if `id` doesn't exist
   * @throws {ConflictError} if the patch duplicates a unique index's columns
   * @throws if the patch violates another constraint
   */
  update(id: RowId, patch: Partial<Insert>): Row | undefined;
  /**
   * Deletes the row with `id`.
   *
   * @param id - the row's primary key
   * @returns `true` if a row was deleted, `false` if `id` didn't exist
   * @throws {ConflictError} if a row of another table still references it
   */
  remove(id: RowId): boolean;
  /** Returns the number of rows in the table. */
  count(): number;
  /** Deletes every row in the table and resets its id counter, so the next insert gets id 1. */
  clear(): void;
}

/**
 * Runs a write, turning SQLite's unique-constraint failure into a
 * {@link ConflictError} that names the constrained columns, and a foreign
 * key failure into one that says the row is still referenced.
 *
 * @param write - the write
 * @returns what `write` returns
 * @throws {ConflictError} if `write` breaks a unique index or a foreign key
 * @throws whatever else `write` throws, unchanged
 */
function asConflict<T>(write: () => T): T {
  try {
    return write();
  } catch (err) {
    // drizzle wraps the driver's error, so the SQLite message may be on `cause`.
    for (let e: unknown = err; e instanceof Error; e = e.cause) {
      const unique = /UNIQUE constraint failed: (.+)$/.exec(e.message);
      if (unique) throw new ConflictError(`duplicate ${unique[1]}`);
      if (e.message.includes("FOREIGN KEY constraint failed")) {
        throw new ConflictError("a row of another table still references it");
      }
    }
    throw err;
  }
}

/**
 * Builds a {@link TableRepo} for a table with an `id` primary key.
 *
 * @param db - database or transaction handle
 * @param table - the drizzle table
 * @param orderBy - list order; defaults to ascending `id`
 * @returns the repo; `get`/`update` return `undefined` for an unknown id
 */
export function createTableRepo<T extends IdTable>(
  db: Db,
  table: T,
  orderBy: (SQL | SQLiteColumn)[] = [asc(table.id)],
): TableRepo<InferSelectModel<T>, InferInsertModel<T>> {
  type Row = InferSelectModel<T>;
  const base = table as SQLiteTable;
  return {
    /** @inheritdoc */
    list: () =>
      db
        .select()
        .from(base)
        .orderBy(...orderBy)
        .all() as Row[],
    /** @inheritdoc */
    get: (id) => db.select().from(base).where(eq(table.id, id)).get() as Row | undefined,
    /** @inheritdoc */
    insert: (values) =>
      asConflict(
        () =>
          db
            .insert(base)
            .values(values as InferInsertModel<SQLiteTable>)
            .returning()
            .get() as Row,
      ),
    /** @inheritdoc */
    update: (id, patch) =>
      asConflict(
        () =>
          db
            .update(base)
            .set(patch as Partial<InferInsertModel<SQLiteTable>>)
            .where(eq(table.id, id))
            .returning()
            .get() as Row | undefined,
      ),
    /** @inheritdoc */
    remove: (id) =>
      asConflict(
        () => db.delete(base).where(eq(table.id, id)).returning({ id: table.id }).all().length > 0,
      ),
    /** @inheritdoc */
    count: () => db.select({ n: count() }).from(base).get()!.n,
    /** @inheritdoc */
    clear: () => {
      db.delete(base).run();
      resetIds(db, base);
    },
  };
}
