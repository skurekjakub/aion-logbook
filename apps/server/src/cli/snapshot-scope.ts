/**
 * Reports which research records' rows a change to `data/snapshot.json`
 * touches, by content, against the snapshot at a git revision. Run via
 * `pnpm db:scope <rev> [<record slug> ...]`: prints each changed record
 * with its tables (a row's child rows and citations count as the row),
 * then the game-fact tables and the account tables that changed, each on
 * a line of their own, and exits 1 when a record not named among the slugs
 * changed, 2 on a usage error. A changed game fact or account table alone
 * doesn't fail it.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { repoRoot, snapshotPath } from "../config";
import type { Snapshot } from "../services/export";
import { changedAccount, changedFacts, changedRecords } from "../services/snapshot-scope";

const [rev, ...named] = process.argv.slice(2);
if (rev === undefined) {
  console.error("usage: pnpm db:scope <rev> [<record slug> ...]");
  process.exit(2);
}
const before = JSON.parse(
  execFileSync("git", ["show", `${rev}:data/snapshot.json`], {
    cwd: repoRoot,
    encoding: "utf-8",
    maxBuffer: 1 << 30,
  }),
) as Snapshot;
const after = JSON.parse(readFileSync(snapshotPath, "utf-8")) as Snapshot;
const changes = changedRecords(before, after);
for (const { record, tables } of changes) console.log(`${record}: ${tables.join(", ")}`);
const facts = changedFacts(before, after);
if (facts.length > 0) console.log(`game facts: ${facts.join(", ")}`);
const account = changedAccount(before, after);
if (account.length > 0) console.log(`account: ${account.join(", ")}`);
const unexpected = changes.filter((change) => !named.includes(change.record));
if (unexpected.length > 0) {
  console.error(
    `rows changed for records not named: ${unexpected.map((c) => c.record).join(", ")}`,
  );
  process.exit(1);
}
