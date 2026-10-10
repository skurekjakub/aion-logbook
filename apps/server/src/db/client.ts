import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrationsFolder } from "@aion/schema/migrations";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

/**
 * The database handle used throughout the server: a synchronous drizzle
 * SQLite database, widened so it also accepts a transaction handle (both
 * shapes extend `BaseSQLiteDatabase<"sync", ...>`).
 */
export type Db = BaseSQLiteDatabase<"sync", unknown>;

/**
 * Opens a SQLite database and migrates it to the latest schema.
 *
 * Creates the parent directory of `file` if it doesn't exist (skipped for
 * `:memory:`). Enables foreign key enforcement, and WAL journaling for
 * on-disk databases (skipped for `:memory:`, which has no journal file).
 *
 * @param file - filesystem path to the SQLite database, or `:memory:` for
 *   an ephemeral, process-local database
 * @returns a migrated `Db` instance
 * @throws if the parent directory can't be created, the file can't be
 *   opened, or a migration fails to apply
 */
export function openDb(file: string): Db {
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }
  const client = new DatabaseSync(file, { enableForeignKeyConstraints: true });
  if (file !== ":memory:") {
    client.exec("PRAGMA journal_mode = WAL;");
  }
  const db = drizzle({ client });
  migrate(db, { migrationsFolder });
  return db;
}
