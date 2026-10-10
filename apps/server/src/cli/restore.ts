/**
 * Restores `config.dbPath` from a JSON snapshot file, given as the first CLI
 * argument (default `config.snapshotPath`). Run via `pnpm db:restore
 * [file]`. `dbPath` must point at a fresh, empty database. Prints the row
 * count written for every table.
 */
import { readFileSync } from "node:fs";
import { dbPath, snapshotPath } from "../config";
import { openDb } from "../db/client";
import { createStore } from "../repos";
import type { Snapshot } from "../services/export";
import { restoreSnapshot } from "../services/export";

const file = process.argv[2] ?? snapshotPath;
const snapshot = JSON.parse(readFileSync(file, "utf-8")) as Snapshot;
const store = createStore(openDb(dbPath));
const counts = restoreSnapshot(store, snapshot);
for (const [table, count] of Object.entries(counts)) {
  console.log(`${table}: ${count}`);
}
