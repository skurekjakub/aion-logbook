/**
 * What a scraper run writes through: the record folder, the HTTP client,
 * the clock, and the ledger. Every file a scraper writes lands under the
 * record's `evidence/` folder and gets its ledger line in the same step.
 *
 * @module
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CaptureLine } from "@aion/schema";
import type { HttpClient } from "./http";
import { appendCapture, LEDGER_FILE, LedgerError, matchesHash, readLedger } from "./ledger";
import type { OffsetAt } from "./time";
import { isoLocal } from "./time";
import { toLf } from "./text";

/** A scraper run's surroundings. */
export interface CaptureContext {
  /** Absolute path of the research record folder. */
  recordDir: string;
  /** The HTTP client the run sends through. */
  http: HttpClient;
  /** The ledger `tool` of every line the run writes, e.g. `capture:web`. */
  tool: string;
  /**
   * Reads the clock.
   *
   * @returns the current instant
   */
  now: () => Date;
  /** The UTC offset local times are written at. */
  offsetAt: OffsetAt;
  /**
   * Reports progress or a skipped item, for the terminal.
   *
   * @param message - the report
   */
  log: (message: string) => void;
}

/**
 * Reports whether a record-relative file already exists.
 *
 * @param context - the run
 * @param path - the file's record-relative path
 * @returns `true` if it's on disk
 */
export function exists(context: CaptureContext, path: string): boolean {
  return existsSync(join(context.recordDir, path));
}

/**
 * Writes a text capture with LF line endings, creating its folder.
 *
 * @param context - the run
 * @param path - the file's record-relative path
 * @param text - the content
 * @throws if the file can't be written
 */
export function writeText(context: CaptureContext, path: string, text: string): void {
  writeBytes(context, path, new TextEncoder().encode(toLf(text)));
}

/**
 * Writes a binary capture as received, creating its folder.
 *
 * @param context - the run
 * @param path - the file's record-relative path
 * @param bytes - the content
 * @throws if the file can't be written
 */
export function writeBytes(context: CaptureContext, path: string, bytes: Uint8Array): void {
  const full = join(context.recordDir, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, bytes);
}

/** A fetched file waiting to be written, with what its ledger line will say. */
export interface StagedFile {
  /** The file's record-relative path. */
  path: string;
  /** Its bytes, as they will be written. */
  bytes: Uint8Array;
  /** Where the bytes came from; `null` for a derived file. */
  url: string | null;
  /** When they were captured. */
  at: Date;
}

/**
 * Stages a text capture with LF line endings.
 *
 * @param path - the file's record-relative path
 * @param text - the content
 * @param url - where it came from, or `null` for a derived file
 * @param at - when it was captured
 * @returns the staged file
 */
export function stageText(path: string, text: string, url: string | null, at: Date): StagedFile {
  return { path, bytes: new TextEncoder().encode(toLf(text)), url, at };
}

/**
 * Reads the record's ledger as a map from path to its last line.
 *
 * @param context - the run
 * @returns every listed path's line
 * @throws {LedgerError} if the ledger can't be read
 */
function ledgerLines(context: CaptureContext): Map<string, CaptureLine> {
  return new Map(readLedger(context.recordDir).map((entry) => [entry.line.path, entry.line]));
}

/**
 * Classifies a path a scraper is about to write against the ledger and
 * the disk, touching nothing.
 *
 * @param context - the run
 * @param lines - the ledger, by path
 * @param path - the record-relative path
 * @returns `"captured"` when its ledger line matches the file on disk,
 *   `"new"` when it has neither a line nor a file
 * @throws {LedgerError} naming the path, when it has a line but the file is
 *   missing or differs from it, or the file is on disk without a line
 */
function captureState(
  context: CaptureContext,
  lines: ReadonlyMap<string, CaptureLine>,
  path: string,
): "captured" | "new" {
  const full = join(context.recordDir, path);
  const line = lines.get(path);
  if (line) {
    if (!existsSync(full)) {
      throw new LedgerError(LEDGER_FILE, null, `${path} has a ledger line but isn't on disk`);
    }
    if (!matchesHash(full, line.sha256)) {
      throw new LedgerError(LEDGER_FILE, null, `${path} differs from its ledger line; left as is`);
    }
    return "captured";
  }
  if (existsSync(full)) {
    throw new LedgerError(
      LEDGER_FILE,
      null,
      `${path} is on disk without a ledger line; log it with pnpm capture log or delete it, then rerun`,
    );
  }
  return "new";
}

/**
 * Reports whether a file is already captured: it has a ledger line and
 * its bytes on disk match it.
 *
 * @param context - the run
 * @param path - the record-relative path
 * @returns `true` when captured; `false` when it has neither a line nor a file
 * @throws {LedgerError} naming the path, when it has a line but the file is
 *   missing or differs from it, or the file is on disk without a line
 */
export function isCaptured(context: CaptureContext, path: string): boolean {
  return captureState(context, ledgerLines(context), path) === "captured";
}

/**
 * Writes a group of staged files that belong together (a post and its
 * images) and appends each one's ledger line, in order, once every file
 * of the group has been checked: a file already captured with a matching
 * hash is kept as it is and not logged again, so a rerun after an
 * interrupted one picks up where it stopped.
 *
 * @param context - the run
 * @param files - the staged files, in the order to write them
 * @returns the record-relative paths written
 * @throws {LedgerError} naming the path, before anything is written, when a
 *   file has a line but is missing or differs from it, or is on disk
 *   without a line
 * @throws if a file or its ledger line can't be written
 */
export function commitStaged(context: CaptureContext, files: readonly StagedFile[]): string[] {
  const lines = ledgerLines(context);
  const fresh = files.filter((file) => captureState(context, lines, file.path) === "new");
  for (const file of fresh) {
    writeBytes(context, file.path, file.bytes);
    logCapture(context, file.path, file.url, file.at);
  }
  return fresh.map((file) => file.path);
}

/**
 * Appends a written file's ledger line, stamped with the run's tool.
 *
 * @param context - the run
 * @param path - the file's record-relative path
 * @param url - where its bytes came from, or `null` for a derived file
 * @param at - when they were captured
 * @throws {LedgerError} if the path already has a line or the line is invalid
 */
export function logCapture(
  context: CaptureContext,
  path: string,
  url: string | null,
  at: Date,
): void {
  appendCapture(context.recordDir, path, {
    url,
    capturedAt: isoLocal(at, context.offsetAt),
    tool: context.tool,
  });
}
