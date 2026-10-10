/**
 * Loads a research record into `config.dbPath`, next to any records already
 * there. Run via `pnpm import:record <slug> [--replace]`, where `<slug>`
 * names a directory under `research/`. Prints the rows inserted per table
 * and any warnings. Without `--replace` it refuses a record that is already
 * loaded; with it, it clears that record's rows first. Exits 1 with the
 * `ImportError` message (file, row and reason) on a failed import, with
 * `import failed: <message>` and no stack trace on any other error, or with
 * a usage line when no slug is given; nothing is written in any case.
 */
import { join } from "node:path";
import { dbPath, researchDir } from "../config";
import { openDb } from "../db/client";
import { ImportError } from "../errors";
import { importRecord } from "../importers/import-record";
import { createStore } from "../repos";

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const slug = args.find((arg) => !arg.startsWith("--"));
if (!slug) {
  console.error("usage: pnpm import:record <slug> [--replace]");
  process.exit(1);
}

try {
  const store = createStore(openDb(dbPath));
  const { counts, warnings } = importRecord(store, join(researchDir, slug), { replace });
  console.log(`imported research/${slug} into ${dbPath}`);
  for (const [table, count] of Object.entries(counts)) console.log(`${table}: ${count}`);
  for (const warning of warnings) console.warn(`warning: ${warning}`);
} catch (err) {
  if (err instanceof ImportError) console.error(err.message);
  else console.error(`import failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
