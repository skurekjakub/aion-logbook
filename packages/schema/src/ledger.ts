/**
 * The capture ledger's line schema: one JSON object per line of a research
 * record's `evidence/captures.jsonl`, shared by `@aion/capture` (which
 * writes and verifies ledgers) and the server's importer (which loads them).
 *
 * @module
 */
import { z } from "zod";
import { CAPTURE_APPROX, CAPTURE_TOOL } from "./enums";

/** An ISO 8601 timestamp with seconds and an offset (`Z` or `±HH:MM`), e.g. `2026-09-27T10:39:53+02:00`. */
export const isoDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    "expected an ISO 8601 timestamp with an offset",
  );

/** A lowercase hex SHA-256 digest. */
export const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/, "expected a lowercase hex sha256");

/**
 * A path relative to a record folder, under its `evidence/` folder, with
 * `/` separators and no empty, `.` or `..` segment.
 */
export const evidencePath = z
  .string()
  .regex(
    /^evidence(\/(?!\.\.?(\/|$))[^/\\]+)+$/,
    "expected a record-relative path under evidence/",
  );

/** What took a capture: one of {@link CAPTURE_TOOL}. */
export const captureTool = z.enum(CAPTURE_TOOL);

/**
 * One line of a capture ledger. `url` is `null` for a derived file (a
 * digest, an extract, a script); `approx` is present only on a backfilled
 * line, saying how its `captured_at` was found. Unknown keys fail.
 */
export const captureLine = z.strictObject({
  path: evidencePath,
  url: z.string().min(1).nullable(),
  captured_at: isoDateTime,
  tool: captureTool,
  sha256: sha256Hex,
  approx: z.enum(CAPTURE_APPROX).optional(),
});
/** Output of {@link captureLine}. */
export type CaptureLine = z.output<typeof captureLine>;
