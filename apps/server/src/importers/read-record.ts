import { join } from "node:path";
import { ImportError } from "../errors";
import type {
  CheckContext,
  Collection,
  CollectionName,
  ParsedCollections,
  PrepareContext,
} from "./collections";
import { COLLECTIONS, curatedManifest } from "./collections";
import { loadSummaries } from "./extractions";
import { parseFile, readJson } from "./files";
import { insertCaptures, readCaptures } from "./ledger";
import { readManifest } from "./manifest";
import type { WriteStep } from "./steps";

/** A research record read, validated and mapped: everything its import checks and writes, in order. */
export interface RecordPlan {
  /** The record's slug, from its `import.json`. */
  slug: string;
  /**
   * Checks against the database as it stands once a replace has cleared
   * the record's own rows, run before any step.
   */
  guards: WriteStep[];
  /** The writes, in order: the curated collections, then the capture ledger. */
  steps: WriteStep[];
  /** Non-fatal findings, such as contested glossary lookup keys. */
  warnings: string[];
}

/** Every listed collection's parsed content, and its record-relative file path. */
interface CuratedFiles {
  parsed: Partial<ParsedCollections>;
  files: Partial<Record<CollectionName, string>>;
}

/** The collections in write order, typed for generic iteration. */
const ORDERED = Object.entries(COLLECTIONS) as Array<[CollectionName, Collection<unknown>]>;

/**
 * Reads and validates every collection the curated directory's
 * `manifest.json` lists.
 *
 * @param recordDir - absolute path to the research record directory
 * @param curatedDir - the curated directory, relative to `recordDir`
 * @returns each listed collection's parsed content and file path
 * @throws {ImportError} naming the file (and row) of the first failure
 */
function readCollections(recordDir: string, curatedDir: string): CuratedFiles {
  const manifestFile = `${curatedDir}/manifest.json`;
  const { collections } = parseFile(
    manifestFile,
    readJson(recordDir, manifestFile),
    curatedManifest,
  );
  const result: CuratedFiles = { parsed: {}, files: {} };
  for (const [name, collection] of ORDERED) {
    const listed = collections[name];
    if (listed === undefined) continue;
    const file = `${curatedDir}/${listed}`;
    result.files[name] = file;
    (result.parsed as Record<string, unknown>)[name] = collection.parse(
      file,
      readJson(recordDir, file),
    );
  }
  return result;
}

/**
 * Checks, before anything is written, that every cited source id is one of
 * the record's curated sources, then runs each collection's own checks.
 *
 * @param curated - every listed collection's parsed content and file path
 * @param context - the record and what the checks can see of it
 * @throws {ImportError} naming the file and row of the first bad reference
 */
function checkCollections({ parsed, files }: CuratedFiles, context: CheckContext): void {
  const known = new Set((parsed.sources ?? []).map((source) => source.id));
  for (const [name, collection] of ORDERED) {
    if (parsed[name] === undefined) continue;
    for (const ref of collection.refs(parsed[name])) {
      const unknown = [...new Set(ref.sources.filter((id) => !known.has(id)))];
      if (unknown.length > 0) {
        throw new ImportError(files[name]!, ref.row, `unknown source ids: ${unknown.join(", ")}`);
      }
    }
  }
  for (const [name, collection] of ORDERED) {
    if (parsed[name] !== undefined) collection.check?.(files[name]!, parsed[name], context);
  }
}

/**
 * Reads a research record without writing anything: its `import.json`, its
 * curated collections, its extractions' summaries and its capture ledger.
 * Every file is validated and every reference to the record's own files
 * checked, and every row is mapped into a write step; the checks that need
 * the database become guards.
 *
 * @param recordDir - absolute path to the record directory (the one
 *   holding `import.json`)
 * @returns the record's slug, its guards and write steps in order, and warnings
 * @throws {ImportError} naming the file and row, if a file is missing or
 *   malformed, a row fails its schema or cites a source the record doesn't
 *   curate, two builds share a macro id, or the ledger disagrees with the
 *   evidence on disk
 */
export function readRecord(recordDir: string): RecordPlan {
  const manifest = readManifest(recordDir);
  const curated = readCollections(recordDir, manifest.curated);
  const skillIds = new Set((curated.parsed.skills ?? []).map((skill) => skill.id));
  checkCollections(curated, {
    record: manifest.record.slug,
    updated: curated.parsed.meta?.updated,
    skillIds,
  });
  const { parsed } = curated;
  const extractions =
    manifest.extractions === undefined
      ? []
      : typeof manifest.extractions === "string"
        ? [manifest.extractions]
        : manifest.extractions;
  const summaries = loadSummaries(extractions.map((dir) => join(recordDir, dir)));

  const guards: WriteStep[] = [];
  const steps: WriteStep[] = [];
  const warnings: string[] = [];
  for (const [name, collection] of ORDERED) {
    if (parsed[name] === undefined) continue;
    const context: PrepareContext = {
      file: curated.files[name]!,
      recordDir,
      manifest,
      summaries,
      skillIds,
    };
    const guard = collection.guard?.(parsed[name], context);
    if (guard) guards.push(guard);
    steps.push(...collection.prepare(parsed[name], context));
    warnings.push(...(collection.warnings?.(parsed[name]) ?? []));
  }
  if (manifest.ledger !== undefined) steps.push(insertCaptures(readCaptures(recordDir)));
  return { slug: manifest.record.slug, guards, steps, warnings };
}
