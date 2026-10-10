import { getTableName, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Db } from "../db/client";

/**
 * Resets the AUTOINCREMENT id counter of each of `tables`, so that once a
 * table is empty its next insert gets id 1, as in a fresh database. A table
 * with no AUTOINCREMENT column has no counter, and resetting it does
 * nothing.
 *
 * @param db - database or transaction handle
 * @param tables - the tables whose counters to reset
 */
export function resetIds(db: Db, ...tables: SQLiteTable[]): void {
  if (tables.length === 0) return;
  const names = tables.map((table) => sql`${getTableName(table)}`);
  db.run(sql`DELETE FROM sqlite_sequence WHERE name IN (${sql.join(names, sql`, `)})`);
}
