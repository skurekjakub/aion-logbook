import type { CaptureLine } from "@aion/schema";
import {
  describeProblem,
  LEDGER_FILE,
  LedgerError,
  readLedger,
  verifyLedger,
} from "@aion/capture/ledger";
import { z } from "zod";
import { ImportError } from "../errors";
import type { WriteStep } from "./steps";

/**
 * The `ledger` block of `import.json`: the record's capture ledger, which
 * lives at a fixed place in its evidence folder.
 */
export const ledgerSpec = z.strictObject({ file: z.literal(LEDGER_FILE) });

/** Output of {@link ledgerSpec}. */
export type LedgerSpec = z.output<typeof ledgerSpec>;

/**
 * Reads a record's capture ledger and checks it against the evidence on
 * disk (see `verifyLedger`): every evidence file has exactly one line,
 * every line's file exists unless it's local-only media, and every present
 * file matches its hash.
 *
 * @param recordDir - absolute path to the record directory
 * @returns the ledger's lines, in file order
 * @throws {ImportError} naming the ledger and line of a line that isn't
 *   JSON or fails the line schema
 * @throws {ImportError} naming the ledger and listing every problem, if the
 *   ledger and the evidence disagree
 */
export function readCaptures(recordDir: string): CaptureLine[] {
  let lines: CaptureLine[];
  try {
    lines = readLedger(recordDir).map((entry) => entry.line);
  } catch (err) {
    if (err instanceof LedgerError) {
      throw new ImportError(LEDGER_FILE, err.line, err.detail);
    }
    throw err;
  }
  const problems = verifyLedger(recordDir);
  if (problems.length > 0) {
    throw new ImportError(
      LEDGER_FILE,
      problems[0]!.lineNo,
      `the ledger doesn't match the evidence: ${problems.map(describeProblem).join("; ")}`,
    );
  }
  return lines;
}

/**
 * A step inserting a record's capture-ledger lines, each owned by the record.
 *
 * @param lines - the validated lines
 * @returns the step
 */
export function insertCaptures(lines: readonly CaptureLine[]): WriteStep {
  return (repos, { record }) => {
    repos.captures.insertMany(
      lines.map((line) => ({
        recordSlug: record,
        path: line.path,
        url: line.url,
        capturedAt: line.captured_at,
        approx: line.approx ?? null,
        tool: line.tool,
        sha256: line.sha256,
      })),
    );
  };
}
