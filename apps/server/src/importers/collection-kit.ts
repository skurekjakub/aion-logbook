/**
 * What a curated collection is, and the helpers that declare one: the
 * `Collection` contract the reader and writer drive, and builders for the
 * common file shapes. The collections themselves are declared in
 * `collections.ts`.
 *
 * @module
 */
import type { z } from "zod";
import { ImportError } from "../errors";
import type { ContentKey, ValuesOf } from "../registry";
import { formatIssues } from "./files";
import type { ImportManifest } from "./manifest";
import type { WriteStep } from "./steps";
import { insertCited } from "./steps";

/** What one row of a collection references, checked before anything is written. */
export interface RowRefs {
  /** The row, as an error names it: its index, or a field name. */
  row: string | number;
  /** The source ids the row cites. */
  sources: readonly string[];
}

/** What a collection's own checks can see of the record and its other collections. */
export interface CheckContext {
  /** The record's slug, from `import.json`. */
  record: string;
  /** The day the record was last updated (`meta.json`'s `updated`). */
  updated: string | undefined;
  /** The ids of the skills the record's `skills.json` lists. */
  skillIds: ReadonlySet<string>;
}

/** What a collection's rows are mapped with, besides the rows themselves. */
export interface PrepareContext {
  /** The collection file's record-relative path, as errors name it. */
  file: string;
  /** Absolute path to the record directory. */
  recordDir: string;
  /** The record's validated `import.json`. */
  manifest: ImportManifest;
  /** English summaries by source id, from the record's extractions. */
  summaries: ReadonlyMap<string, string>;
  /** The ids of the skills the record's `skills.json` lists. */
  skillIds: ReadonlySet<string>;
}

/**
 * One curated collection.
 *
 * @typeParam Parsed - the validated content of the collection's file
 */
export interface Collection<Parsed> {
  /** When true, a record's curated manifest may leave the collection out. */
  optional?: boolean;
  /**
   * Validates the collection's file.
   *
   * @param file - the file's record-relative path, as errors name it
   * @param raw - the parsed JSON
   * @throws {ImportError} naming the file (and the row) of the first failure
   */
  parse(file: string, raw: unknown): Parsed;
  /** Lists every row's source references. */
  refs(parsed: Parsed): RowRefs[];
  /**
   * Checks what the reference checks don't, after they pass.
   *
   * @param file - the file's record-relative path, as errors name it
   * @param parsed - the validated content
   * @param context - what the check can see of the record
   * @throws {ImportError} naming the file and the row
   */
  check?(file: string, parsed: Parsed, context: CheckContext): void;
  /** Lists non-fatal findings worth a human's attention. */
  warnings?(parsed: Parsed): string[];
  /**
   * Builds a check against the database as it stands once a replace has
   * cleared the record's own rows, run before any step writes.
   */
  guard?(parsed: Parsed, context: PrepareContext): WriteStep;
  /**
   * Maps the rows into write steps, doing any file lookups now, so the
   * write phase only writes.
   */
  prepare(parsed: Parsed, context: PrepareContext): WriteStep[];
}

/**
 * Declares a collection, inferring its parsed type.
 *
 * @param collection - the collection
 * @returns the same collection
 */
export function collection<Parsed>(collection: Collection<Parsed>): Collection<Parsed> {
  return collection;
}

/**
 * Checks that every value of `values` is new.
 *
 * @param file - the file, as errors name it
 * @param what - the field, as errors name it
 * @param values - the values, in file order
 * @throws {ImportError} naming the file, the index and the value of the first repeat
 */
export function assertDistinct(file: string, what: string, values: readonly string[]): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) throw new ImportError(file, index, `duplicate ${what} "${value}"`);
    seen.add(value);
  });
}

/**
 * Checks that no row was marked obsolete after the record's last update:
 * the round that marks a row obsolete updates the record, so an `obsolete`
 * block dated later names a day no round has reached.
 *
 * @param file - the file, as errors name it
 * @param rows - the collection's rows, in file order
 * @param context - the record's last update
 * @throws {ImportError} naming the file and row of the first block dated after it
 */
export function checkObsoleteDates(
  file: string,
  rows: ReadonlyArray<{ obsolete?: { since: string } | undefined }>,
  { updated }: CheckContext,
): void {
  if (updated === undefined) return;
  rows.forEach((row, index) => {
    const since = row.obsolete?.since;
    if (since !== undefined && since > updated) {
      throw new ImportError(
        file,
        index,
        `obsolete since ${since} is after the record's update of ${updated}`,
      );
    }
  });
}

/**
 * Validates every row of an array file with `schema`.
 *
 * @param file - the file's record-relative path, as errors name it
 * @param raw - the parsed JSON
 * @param schema - the schema of one row
 * @returns the validated rows, in file order
 * @throws {ImportError} naming `file` if it isn't an array, or naming
 *   `file`, the row index and every issue's path for the first bad row
 */
export function parseRows<S extends z.ZodType>(
  file: string,
  raw: unknown,
  schema: S,
): Array<z.output<S>> {
  if (!Array.isArray(raw)) throw new ImportError(file, null, "expected an array");
  return raw.map((row, index) => {
    const result = schema.safeParse(row);
    if (!result.success) throw new ImportError(file, index, formatIssues(result.error));
    return result.data;
  });
}

/**
 * Declares an optional array collection of a registered content type whose
 * rows each cite their own `sources` and map onto one row of the type.
 *
 * @param key - the content type's registry key
 * @param schema - the schema of one row
 * @param map - maps a validated row, and its index, onto the type's column values
 * @returns the collection
 */
export function citedRows<K extends ContentKey, S extends z.ZodType<{ sources: string[] }>>(
  key: K,
  schema: S,
  map: (row: z.output<S>, index: number) => ValuesOf<K>,
): Collection<Array<z.output<S>>> {
  return collection({
    optional: true,
    /** @inheritdoc */
    parse: (file, raw) => parseRows(file, raw, schema),
    /** @inheritdoc */
    refs: (rows) => rows.map((row, index) => ({ row: index, sources: row.sources })),
    /** @inheritdoc */
    prepare: (rows) => [
      insertCited(
        key,
        rows.map((row, index) => ({ values: map(row, index), sources: row.sources })),
      ),
    ],
  });
}
