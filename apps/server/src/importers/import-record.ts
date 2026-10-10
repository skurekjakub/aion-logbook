import type { Store } from "../repos";
import { readRecord } from "./read-record";
import type { ImportCounts } from "./write-record";
import { writeRecord } from "./write-record";

export type { ImportCounts } from "./write-record";

/** What {@link importRecord} wrote, plus anything worth a human's attention. */
export interface ImportResult {
  /** Rows the import inserted, per registered table. */
  counts: ImportCounts;
  /**
   * Non-fatal findings: glossary lookup keys that more than one entry
   * claims, and shared rows (sources, glossary entries, skills) another
   * record already loaded in a different version.
   */
  warnings: string[];
}

/** Options for {@link importRecord}. */
export interface ImportOptions {
  /** Clear the rows the record owns first, instead of refusing a record that is already loaded. */
  replace?: boolean;
}

/**
 * Loads a research record into the database, next to any other records:
 * its curated collections (see `collections.ts`), each row with its
 * citations, and its capture ledger when the manifest names it. Sources
 * get their English summary from the record's extractions when the curated
 * row has none. Every row it writes is owned by the record. Sources,
 * glossary entries and skills can be shared: the first record to load one
 * owns it, and a later record keeps that row.
 *
 * Everything is read and checked before anything is written (`readRecord`),
 * and every write happens in one transaction (`writeRecord`): a failure
 * leaves the database as it was.
 *
 * @param store - the store to load into
 * @param recordDir - absolute path to the record directory (the one
 *   holding `import.json`)
 * @param opts - `replace: true` clears the rows the record owns first; in
 *   a database holding only this record, the result matches a fresh
 *   import, ids included
 * @returns rows inserted per table, and non-fatal warnings
 * @throws {ImportError} naming the file and row, if a file is missing or
 *   malformed, a row fails its schema or cites a source the record doesn't
 *   curate, a build names a skill neither the record nor the database has,
 *   a build or macro id is already loaded by another record, or the
 *   capture ledger has a bad line or disagrees with the evidence on disk
 * @throws {ImportError} `"record <slug> is already loaded; pass --replace
 *   to load it again"` if the record owns rows and `replace` isn't set
 */
export function importRecord(
  store: Store,
  recordDir: string,
  opts: ImportOptions = {},
): ImportResult {
  const plan = readRecord(recordDir);
  const { counts, warnings } = writeRecord(store, plan, opts.replace ?? false);
  return { counts, warnings: [...plan.warnings, ...warnings] };
}
