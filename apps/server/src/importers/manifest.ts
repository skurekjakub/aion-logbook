import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CLASS, RECORD_STATUS, isoDate, slug } from "@aion/schema";
import { z } from "zod";
import { ImportError } from "../errors";
import { formatIssues } from "./files";
import { ledgerSpec } from "./ledger";

/**
 * Schema of a research record's `import.json`: the record row to create
 * (`classes` are the classes it covers, `[]` for one about every class),
 * where the curated dataset lives, the extractions whose English summaries
 * fill a source's `summaryEn` (one folder, or a list whose earlier
 * folders' summaries win), and the capture ledger to load. Every path is
 * relative to the record directory. An unknown key fails, at the top level
 * as in every block.
 */
export const importManifest = z.strictObject({
  record: z.strictObject({
    slug,
    question: z.string().min(1),
    status: z.enum(RECORD_STATUS),
    startedAt: isoDate,
    classes: z.array(z.enum(CLASS)),
  }),
  curated: z.string().min(1),
  extractions: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
  ledger: ledgerSpec.optional(),
});
/** Output of {@link importManifest}. */
export type ImportManifest = z.output<typeof importManifest>;

/**
 * Reads and validates a research record's `import.json`.
 *
 * @param recordDir - absolute path to the research record directory
 * @returns the validated manifest
 * @throws {ImportError} naming `import.json`, if it's missing, isn't valid
 *   JSON, or fails validation (the message lists every issue's path)
 */
export function readManifest(recordDir: string): ImportManifest {
  const file = join(recordDir, "import.json");
  if (!existsSync(file)) throw new ImportError(file, null, "file not found");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf-8"));
  } catch (err) {
    throw new ImportError(file, null, (err as Error).message);
  }
  const result = importManifest.safeParse(raw);
  if (!result.success) throw new ImportError(file, null, formatIssues(result.error));
  return result.data;
}
