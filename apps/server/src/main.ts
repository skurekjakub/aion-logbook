/**
 * Serves the data API: opens (and migrates) `config.dbPath`, builds the app
 * over it and listens on `config.port`, logging the URL once listening. When
 * the database file doesn't exist yet, it is created and seeded from
 * `config.snapshotPath` first. When it does exist, it is compared with the
 * snapshot, and a warning naming what differs and the fix is logged when
 * they differ; the database is never reseeded or deleted here, since after
 * an import it is the source of truth until exported. Run via `pnpm dev`
 * (with the web app), `pnpm dev:server` (watch mode) or
 * `pnpm --filter @aion/server start`. Exits with the underlying error if
 * the database can't be opened, the snapshot can't be restored, or the port
 * is taken.
 */
import { existsSync, readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { dbPath, port, snapshotPath } from "./config";
import { openDb } from "./db/client";
import { createStore } from "./repos";
import { createServices } from "./services";
import type { Snapshot } from "./services/export";
import { restoreSnapshot } from "./services/export";
import { driftWarning, snapshotDrift } from "./services/snapshot-drift";

/**
 * Reads and parses the committed snapshot.
 *
 * @returns the snapshot
 * @throws if the file is missing or isn't JSON
 */
function readSnapshot(): Snapshot {
  return JSON.parse(readFileSync(snapshotPath, "utf-8")) as Snapshot;
}

const seed = !existsSync(dbPath);
const store = createStore(openDb(dbPath));
if (seed) {
  restoreSnapshot(store, readSnapshot());
  console.log(`seeded ${dbPath} from ${snapshotPath}`);
} else {
  try {
    const warning = driftWarning(snapshotDrift(store, readSnapshot()), { dbPath, snapshotPath });
    if (warning) console.warn(warning);
  } catch (err) {
    console.warn(`warning: couldn't compare ${dbPath} with ${snapshotPath}: ${String(err)}`);
  }
}
const app = createApp(createServices(store));

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`aion-logbook API on http://localhost:${info.port}/api (db: ${dbPath})`);
});
