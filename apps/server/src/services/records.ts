import type { GameClass, ResearchRecordRow } from "@aion/schema";
import { CLASS } from "@aion/schema";
import { NotFoundError } from "../errors";
import type { FiltersOf } from "../registry";
import { REGISTRY } from "../registry";
import type { Repos, Store } from "../repos";
import { applyFilters } from "./filters";

/**
 * A research record as returned to callers: its row, plus the classes it
 * covers in `CLASS` order (`[]` for a record that lists none).
 */
export type RecordView = ResearchRecordRow & { classes: GameClass[] };

/** Read access to the research records: one per investigated question. */
export interface RecordsService {
  /**
   * Lists every research record, ordered by `slug`.
   *
   * @param filter - the registry's list filters for records, each applied
   *   when given: `class` keeps the records that cover that class
   */
  list(filter?: FiltersOf<"researchRecords">): RecordView[];
  /**
   * Returns the record with `slug`.
   *
   * @param slug - the record's slug
   * @throws {NotFoundError} if `slug` doesn't exist
   */
  get(slug: string): RecordView;
}

/**
 * Lists the records that cover `cls`.
 *
 * @param repos - the repos to read
 * @param cls - the class
 * @returns the records' slugs, ordered by slug
 */
export function recordsCovering(repos: Repos, cls: GameClass): string[] {
  return repos.records
    .classes()
    .filter((row) => row.class === cls)
    .map((row) => row.recordSlug);
}

/**
 * Builds the views of `rows`, attaching each record's classes.
 *
 * @param repos - the repos to read the classes from
 * @param rows - the record rows
 * @returns one view per row, in `rows` order, its classes in `CLASS` order
 */
function toViews(repos: Repos, rows: ResearchRecordRow[]): RecordView[] {
  const classes = repos.records.classes();
  return rows.map((row) => ({
    ...row,
    classes: classes
      .filter((c) => c.recordSlug === row.slug)
      .map((c) => c.class)
      .sort((a, b) => CLASS.indexOf(a) - CLASS.indexOf(b)),
  }));
}

/**
 * Builds a {@link RecordsService} over `store`.
 *
 * @param store - the store to read through
 * @returns the service
 */
export function createRecordsService(store: Store): RecordsService {
  return {
    /** @inheritdoc */
    list: (filter) => {
      const repos = store.repos;
      return applyFilters(
        toViews(repos, repos.records.list()),
        REGISTRY.researchRecords.filters,
        filter,
      );
    },
    /** @inheritdoc */
    get: (slug) => {
      const repos = store.repos;
      const row = repos.records.get(slug);
      if (!row) throw new NotFoundError("research record", slug);
      return toViews(repos, [row])[0]!;
    },
  };
}
