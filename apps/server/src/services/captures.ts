import type { CaptureRow } from "@aion/schema";
import type { FiltersOf } from "../registry";
import { REGISTRY } from "../registry";
import type { Repos, Store } from "../repos";
import { applyFilters } from "./filters";

/** What a source shows of its evidence capture's ledger line. */
export interface CaptureStamp {
  /** When the capture was taken, ISO 8601 with an offset. */
  capturedAt: string;
  /** What took it. */
  tool: string;
  /** How a backfilled time was found; `null` for a time recorded at capture. */
  approx: CaptureRow["approx"];
}

/** Read access to the loaded records' capture ledgers. */
export interface CapturesService {
  /**
   * Lists captures, ordered by record, then path.
   *
   * @param filter - the registry's list filters for captures, each applied
   *   when given: `record` keeps one record's, `path` one record-relative path
   */
  list(filter?: FiltersOf<"captures">): CaptureRow[];
}

/**
 * Maps each capture to its repo-relative path, the form a source's
 * `capturePath` takes.
 *
 * @param repos - the repos to read
 * @returns `research/<record>/<path>` → the capture's stamp
 */
export function captureStamps(repos: Repos): Map<string, CaptureStamp> {
  return new Map(
    repos.captures
      .list()
      .map((row) => [
        `research/${row.recordSlug}/${row.path}`,
        { capturedAt: row.capturedAt, tool: row.tool, approx: row.approx },
      ]),
  );
}

/**
 * Looks up the capture a source's `capturePath` names.
 *
 * @param repos - the repos to read
 * @param capturePath - a repo-relative path, `research/<record>/<path>`
 * @returns the capture's stamp, or `null` when the path isn't a record's or
 *   its record's ledger doesn't list it
 */
export function captureStamp(repos: Repos, capturePath: string): CaptureStamp | null {
  const match = /^research\/([^/]+)\/(.+)$/.exec(capturePath);
  if (!match) return null;
  const row = repos.captures.byPath(match[1]!, match[2]!);
  return row ? { capturedAt: row.capturedAt, tool: row.tool, approx: row.approx } : null;
}

/**
 * Builds a {@link CapturesService} over `store`.
 *
 * @param store - the store to read through
 * @returns the service
 */
export function createCapturesService(store: Store): CapturesService {
  return {
    /** @inheritdoc */
    list: (filter) => applyFilters(store.repos.captures.list(), REGISTRY.captures.filters, filter),
  };
}
