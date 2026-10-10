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
 * is taken. The sync button runs the sync's CLI in the repo root, which
 * commits and pushes what changed.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { dbPath, port, repoRoot, snapshotPath } from "./config";
import { openDb } from "./db/client";
import { createStore } from "./repos";
import { createServices } from "./services";
import type { Snapshot } from "./services/export";
import { restoreSnapshot } from "./services/export";
import { driftWarning, snapshotDrift } from "./services/snapshot-drift";
import type { SyncRun } from "./services/sync";
import { localSyncService } from "./services/sync";

/** How long a sync may run before it is killed, in milliseconds. */
const SYNC_TIMEOUT_MS = 5 * 60_000;

/**
 * Runs the sync's CLI (`pnpm sync` without pnpm's own error lines) in the
 * repo root, through a shell so Windows finds tsx's `.cmd` shim. Stdin is
 * closed and git may not prompt, so a push that wants credentials fails
 * instead of waiting; a run past {@link SYNC_TIMEOUT_MS} is killed.
 *
 * @returns its exit code and output once it exits
 * @throws if the shell can't be started
 */
function runPnpmSync(): Promise<SyncRun> {
  return new Promise((resolve, reject) => {
    const child = spawn("tsx packages/armory/src/cli.ts", {
      cwd: repoRoot,
      shell: true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: SYNC_TIMEOUT_MS,
      env: {
        ...process.env,
        PATH: `${join(repoRoot, "node_modules", ".bin")}${delimiter}${process.env.PATH ?? ""}`,
        GIT_TERMINAL_PROMPT: "0",
      },
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) output += `\nsync killed (${signal}) after ${SYNC_TIMEOUT_MS / 60_000} minutes`;
      resolve({ code: code ?? 1, output });
    });
  });
}

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
const app = createApp(createServices(store, localSyncService(runPnpmSync)));

// Bound to this machine alone: the sync button commits and pushes.
serve({ fetch: app.fetch, port, hostname: "localhost" }, (info) => {
  console.log(`aion-logbook API on http://localhost:${info.port}/api (db: ${dbPath})`);
});
