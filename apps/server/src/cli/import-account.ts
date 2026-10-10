/**
 * Loads the character's snapshots from `account/` (or `AION_ACCOUNT`) into
 * `config.dbPath`. Run via `pnpm import:account [<file> ...] [--all]
 * [--replace]`: with no file it loads the latest snapshot
 * (`snapshots/<id>.json`) and its roadmap (`roadmap-<id>.json`); with
 * files (relative to the repo root or absolute), those; with `--all`,
 * every snapshot. A snapshot already loaded is skipped, or refused when
 * named, unless `--replace`. Prints what it loaded and skipped, the rows
 * inserted per table and any warnings; exits 1 with the `ImportError`
 * message (file and reason) on a failed import, writing nothing, and 2 on
 * an unknown flag.
 */
import { resolve } from "node:path";
import { accountDir, dbPath, repoRoot } from "../config";
import { openDb } from "../db/client";
import { ImportError } from "../errors";
import { importAccount } from "../importers/account";
import { createStore } from "../repos";

/** The flags the command takes. */
const FLAGS = ["--all", "--replace"];

const args = process.argv.slice(2);
const unknown = args.filter((arg) => arg.startsWith("-") && !FLAGS.includes(arg));
if (unknown.length > 0) {
  console.error(`unknown flag ${unknown.join(", ")}`);
  console.error("usage: pnpm import:account [<file> ...] [--all] [--replace]");
  process.exit(2);
}
const files = args.filter((arg) => !arg.startsWith("-")).map((file) => resolve(repoRoot, file));

try {
  const store = createStore(openDb(dbPath));
  const result = importAccount(store, accountDir, {
    all: args.includes("--all"),
    replace: args.includes("--replace"),
    files,
  });
  console.log(`imported ${accountDir} into ${dbPath}`);
  console.log(`snapshots: ${result.snapshots.join(", ") || "(none)"}`);
  if (result.skipped.length > 0) {
    console.log(`skipped, already loaded: ${result.skipped.join(", ")}`);
  }
  const rows = Object.entries(result.counts).map(([table, count]) => `${table} ${count}`);
  console.log(`rows inserted: ${rows.join(", ")}`);
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
} catch (err) {
  if (err instanceof ImportError) console.error(err.message);
  else console.error(`import failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
