import { and, count, eq, getColumns, isNotNull, notInArray } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import type { Db } from "../db/client";
import type { RowOf, TableKey } from "../registry";
import { recordColumnOf, REGISTRY } from "../registry";
import { resetIds } from "./sequence";

/** Rows per multi-row insert, well under SQLite's bound-parameter limit for any registered table. */
const LOAD_CHUNK = 500;

/**
 * Whole-table operations over every registered table, by snapshot name:
 * what snapshots, restores and replace imports need, without a method per
 * table.
 */
export interface TablesRepo {
  /**
   * Returns every row of `key`, sorted ascending by its primary key (numbers
   * numerically, text by code unit, composite keys column by column),
   * independent of any list order.
   *
   * @param key - the table's snapshot name
   */
  dump<K extends TableKey>(key: K): RowOf<K>[];
  /**
   * Inserts `rows` into `key` as they are, ids included.
   *
   * @param key - the table's snapshot name
   * @param rows - full rows; `[]` inserts nothing
   * @throws if a row breaks a constraint (a taken id, a missing foreign key)
   */
  load<K extends TableKey>(key: K, rows: readonly RowOf<K>[]): void;
  /**
   * Returns the number of rows in `key`.
   *
   * @param key - the table's snapshot name
   */
  count(key: TableKey): number;
  /**
   * Deletes every row of `key` and resets its id counter, so the next
   * insert gets id 1.
   *
   * @param key - the table's snapshot name
   * @throws if a row of another table still references one of its rows
   */
  clear(key: TableKey): void;
  /**
   * Returns the number of rows of `key` that research record `slug` owns.
   *
   * @param key - the table's snapshot name
   * @param slug - the record's slug
   * @throws `Error` if no record owns `key`'s rows (see `recordColumnOf`)
   */
  countOwned(key: TableKey, slug: string): number;
  /**
   * Returns the primary keys, as strings, of the rows of `key` that record
   * `slug` owns: the entity ids its citations are stored under.
   *
   * @param key - the table's snapshot name; its primary key is one column
   * @param slug - the record's slug
   * @throws `Error` if no record owns `key`'s rows
   */
  ownedIds(key: TableKey, slug: string): string[];
  /**
   * Maps each row of `key` that a research record owns to that record.
   *
   * @param key - the table's snapshot name; its primary key is one column
   * @returns primary key, as a string (the entity id its citations are
   *   stored under) → the owning record's slug; rows no record owns are absent
   * @throws `Error` if no record owns `key`'s rows
   */
  owners(key: TableKey): Map<string, string>;
  /**
   * Deletes the rows of `key` that record `slug` owns, except those a row
   * of another table still references through a foreign key that neither
   * cascades nor nulls. Rows that cascade from a deleted row go with it.
   *
   * @param key - the table's snapshot name
   * @param slug - the record's slug
   * @returns the number of rows deleted
   * @throws `Error` if no record owns `key`'s rows
   */
  clearOwned(key: TableKey, slug: string): number;
  /**
   * Restarts the id counter of `key`, so its next insert gets one past the
   * highest id left (1 when the table is empty).
   *
   * @param key - the table's snapshot name
   */
  restartIds(key: TableKey): void;
}

/**
 * Returns the JS keys of `table`'s primary-key columns, in key order.
 *
 * @param table - the table
 * @returns the single primary-key column, or a composite key's columns
 */
function primaryKey(table: SQLiteTable): string[] {
  const columns = Object.entries(getColumns(table)) as Array<[string, SQLiteColumn]>;
  /**
   * Returns the JS key of one of `table`'s columns.
   *
   * @param column - a column of `table`
   * @returns its JS key
   */
  const keyOf = (column: SQLiteColumn) => columns.find(([, c]) => c === column)![0];
  const composite = getTableConfig(table).primaryKeys[0];
  if (composite) return composite.columns.map(keyOf);
  return columns.filter(([, column]) => column.primary).map(([key]) => key);
}

/**
 * Builds a comparator that orders two rows by the columns in `key`, in order.
 *
 * @param key - the columns' JS keys, most significant first
 * @returns a comparator returning negative, zero or positive, as for `Array.prototype.sort`
 */
function compareBy(key: readonly string[]) {
  return (a: Record<string, unknown>, b: Record<string, unknown>): number => {
    for (const column of key) {
      const x = a[column];
      const y = b[column];
      const order =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x) < String(y)
            ? -1
            : String(x) > String(y)
              ? 1
              : 0;
      if (order !== 0) return order;
    }
    return 0;
  };
}

/**
 * Returns the column of `table` named by its JS key.
 *
 * @param table - the table
 * @param name - the column's JS key
 * @returns the column
 * @throws `Error` naming the column if `table` has none by that name
 */
function columnOf(table: SQLiteTable, name: string): SQLiteColumn {
  const column = (getColumns(table) as Record<string, SQLiteColumn>)[name];
  if (!column) throw new Error(`table has no column "${name}"`);
  return column;
}

/**
 * Lists the registered foreign keys into `table` that block deleting a
 * referenced row: those that neither cascade nor set the reference to
 * null or its default.
 *
 * @param table - the referenced table
 * @returns each key's referencing column and table, and the referenced column
 */
function blockingReferences(table: SQLiteTable) {
  return Object.values(REGISTRY).flatMap(({ table: other }) =>
    getTableConfig(other as SQLiteTable).foreignKeys.flatMap((fk) => {
      const ref = fk.reference();
      const releases = ["cascade", "set null", "set default"].includes(fk.onDelete ?? "");
      if (ref.foreignTable !== table || releases) return [];
      return [{ from: ref.columns[0]!, fromTable: other, to: ref.foreignColumns[0]! }];
    }),
  );
}

/**
 * Builds a {@link TablesRepo}.
 *
 * @param db - database or transaction handle
 * @returns the repo
 */
export function createTablesRepo(db: Db): TablesRepo {
  /**
   * Returns the drizzle table registered under `key`.
   *
   * @param key - the table's snapshot name
   * @returns the table
   */
  const tableOf = (key: TableKey) => REGISTRY[key].table as SQLiteTable;
  /**
   * Returns the column of `key`'s table that names the owning research record.
   *
   * @param key - the table's snapshot name
   * @returns the owner column
   * @throws `Error` if no record owns `key`'s rows
   */
  const ownerOf = (key: TableKey) => {
    const column = recordColumnOf(key);
    if (!column) throw new Error(`no record owns the rows of ${key}`);
    return columnOf(tableOf(key), column);
  };
  return {
    /** @inheritdoc */
    dump: (key) => {
      const table = tableOf(key);
      const rows = db.select().from(table).all() as Record<string, unknown>[];
      return rows.sort(compareBy(primaryKey(table))) as RowOf<typeof key>[];
    },
    /** @inheritdoc */
    load: (key, rows) => {
      const table = tableOf(key);
      for (let start = 0; start < rows.length; start += LOAD_CHUNK) {
        db.insert(table)
          .values(rows.slice(start, start + LOAD_CHUNK))
          .run();
      }
    },
    /** @inheritdoc */
    count: (key) => db.select({ n: count() }).from(tableOf(key)).get()!.n,
    /** @inheritdoc */
    clear: (key) => {
      const table = tableOf(key);
      db.delete(table).run();
      resetIds(db, table);
    },
    /** @inheritdoc */
    countOwned: (key, slug) =>
      db
        .select({ n: count() })
        .from(tableOf(key))
        .where(eq(ownerOf(key), slug))
        .get()!.n,
    /** @inheritdoc */
    ownedIds: (key, slug) => {
      const table = tableOf(key);
      const id = columnOf(table, primaryKey(table)[0]!);
      return db
        .select({ id })
        .from(table)
        .where(eq(ownerOf(key), slug))
        .all()
        .map((row) => String(row.id));
    },
    /** @inheritdoc */
    owners: (key) => {
      const table = tableOf(key);
      const id = columnOf(table, primaryKey(table)[0]!);
      const owner = ownerOf(key);
      const rows = db.select({ id, owner }).from(table).where(isNotNull(owner)).all();
      return new Map(rows.map((row) => [String(row.id), String(row.owner)]));
    },
    /** @inheritdoc */
    clearOwned: (key, slug) => {
      const table = tableOf(key);
      const kept = blockingReferences(table).map(({ from, fromTable, to }) =>
        // A NULL in a NOT IN list makes the test NULL for every row, deleting nothing.
        notInArray(to, db.select({ ref: from }).from(fromTable).where(isNotNull(from))),
      );
      const owner = ownerOf(key);
      return db
        .delete(table)
        .where(and(eq(owner, slug), ...kept))
        .returning({ owner })
        .all().length;
    },
    /** @inheritdoc */
    restartIds: (key) => resetIds(db, tableOf(key)),
  };
}
