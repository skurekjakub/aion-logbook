/**
 * Dumps a full JSON snapshot of `config.dbPath` to `config.snapshotPath`, the
 * committed, diffable history of the data. Run via `pnpm db:export`. Prints
 * the row count written for every table.
 *
 * Refuses to run (exit 1, no write) if `dbPath` doesn't exist yet, or if the
 * resulting snapshot is entirely empty: `openDb` would otherwise silently
 * create and migrate a fresh database for a missing or misconfigured
 * `AION_DB`, and writing that empty result over the committed snapshot
 * would wipe out real history.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dbPath, snapshotPath } from "../config";
import { openDb } from "../db/client";
import { createStore } from "../repos";
import { assertSnapshotNonEmpty, exportSnapshot } from "../services/export";

if (!existsSync(dbPath)) {
  console.error(`refusing to export: no database file at ${dbPath} (check AION_DB)`);
  process.exit(1);
}

const store = createStore(openDb(dbPath));
const snapshot = exportSnapshot(store);
try {
  assertSnapshotNonEmpty(snapshot);
} catch (err) {
  console.error(`refusing to export: ${(err as Error).message}`);
  process.exit(1);
}

writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 1)}\n`);
for (const [table, rows] of Object.entries(snapshot.tables)) {
  console.log(`${table}: ${rows.length}`);
}
