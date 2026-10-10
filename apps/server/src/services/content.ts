import type { CitedEntity, ObsoleteEntity } from "@aion/schema";
import { OBSOLESCENCE, isObsoleteEntity, obsolescenceKey } from "@aion/schema";
import { NotFoundError } from "../errors";
import type { AnyFilters, ContentKey, FiltersOf, RowOf, ValuesOf } from "../registry";
import { specOf } from "../registry";
import type { Repos, Store } from "../repos";
import type { RowId, TableRepo } from "../repos/table-repo";
import { assertSourcesExist } from "./citations";
import type { Cited } from "./citations";
import { applyFilters } from "./filters";
import { recordCoverage } from "./records";

/**
 * CRUD over a cited-content table: every row carries the source ids that
 * back it, and every write keeps the citation set consistent with the row.
 *
 * @typeParam Row - the shape of a selected row
 * @typeParam Values - the column values accepted on create, in full, and on
 *   update, as a partial patch
 * @typeParam View - what reads and writes return: the row with its
 *   `sources`, plus any fields the type adds
 * @typeParam Filter - the list filters, by name
 */
export interface ContentService<
  Row,
  Values,
  View = Cited<Row>,
  Filter extends object = Record<never, never>,
> {
  /**
   * Returns every view, in the table's list order.
   *
   * @param filter - the list filter values to apply, when given; an absent
   *   value doesn't filter
   */
  list(filter?: Filter): View[];
  /**
   * Returns the view of the row with `id`.
   *
   * @param id - the row's primary key
   * @throws {NotFoundError} if `id` doesn't exist
   */
  get(id: RowId): View;
  /**
   * Inserts a row and cites it.
   *
   * @param values - the column values
   * @param sources - the source ids that back the row
   * @throws {UnknownRefsError} if any `sources` id doesn't exist; no row is written
   * @throws {ConflictError} if the row's id, or a unique index's columns, are taken
   */
  create(values: Values, sources: string[]): View;
  /**
   * Updates the row with `id`, merging in `patch`.
   *
   * @param id - the row's primary key
   * @param patch - the column values to merge in
   * @param sources - when given, replaces the row's citations; when
   *   omitted, the existing citations are kept
   * @throws {NotFoundError} if `id` doesn't exist
   * @throws {UnknownRefsError} if any `sources` id doesn't exist
   */
  update(id: RowId, patch: Partial<Values>, sources?: string[]): View;
  /**
   * Deletes the row with `id`, its citations and any research record's
   * claim to it.
   *
   * @param id - the row's primary key
   * @throws {NotFoundError} if `id` doesn't exist
   * @throws {ConflictError} if a row of another table still references it;
   *   nothing is deleted
   */
  remove(id: RowId): void;
}

/** Configuration for {@link createContentService}. */
export interface ContentServiceSpec<Row extends { id: RowId }, Values> {
  /** The `CitedEntity` this table's rows are cited under. */
  entity: CitedEntity;
  /** Selects this content's table repo out of `repos`. */
  table: (repos: Repos) => TableRepo<Row, Values>;
  /** The list filters `list` applies, by name. */
  filters?: AnyFilters;
  /** The table's entity when its rows carry the obsolete lifecycle: views then carry `obsoleteSources`. */
  lifecycle?: ObsoleteEntity | undefined;
}

/**
 * Builds a {@link ContentService} over one cited-content table.
 *
 * Every write runs inside `store.transaction`: it checks the cited sources
 * exist, writes the row, then replaces its citations. An `update` without
 * `sources` keeps the row's citations. A view is the row, then `sources`
 * (its citations), then `obsoleteSources` (the sources of its obsolete
 * reason) when `spec.lifecycle` names its entity. Deleting a row deletes
 * its obsolete reason's citations with it. The obsolete lifecycle is the
 * record importer's alone: the API's inputs leave it out.
 *
 * @param store - the store to persist through
 * @param spec - the table and entity this service manages
 * @returns the service
 */
export function createContentService<
  Row extends { id: RowId },
  Values,
  View = Cited<Row>,
  Filter extends object = Record<never, never>,
>(store: Store, spec: ContentServiceSpec<Row, Values>): ContentService<Row, Values, View, Filter> {
  const { entity, table, filters, lifecycle } = spec;

  /**
   * Reads the sources that say why each of `rows` became obsolete.
   *
   * @param repos - the repos to read citations from
   * @param rows - the rows
   * @returns each row's id, as a string → its reason's sources; empty for a table without the lifecycle
   */
  const reasonsOf = (repos: Repos, rows: readonly Row[]): Map<string, string[]> => {
    if (lifecycle === undefined) return new Map();
    const cited = repos.citations.sourcesFor(
      OBSOLESCENCE,
      rows.map((row) => obsolescenceKey(lifecycle, row.id)),
    );
    return new Map(
      rows.map((row) => [String(row.id), cited.get(obsolescenceKey(lifecycle, row.id)) ?? []]),
    );
  };
  /**
   * Builds the views of `rows` with their stored citations.
   *
   * @param repos - the repos to read citations from
   * @param rows - the rows
   * @returns one view per row, in `rows` order
   */
  const toViews = (repos: Repos, rows: readonly Row[]): View[] => {
    const sources = repos.citations.sourcesFor(
      entity,
      rows.map((row) => String(row.id)),
    );
    const reasons = reasonsOf(repos, rows);
    return rows.map((row) => {
      const view: Record<string, unknown> = { ...row, sources: sources.get(String(row.id)) ?? [] };
      if (lifecycle !== undefined) view.obsoleteSources = reasons.get(String(row.id)) ?? [];
      return view as View;
    });
  };

  return {
    /** @inheritdoc */
    list: (filter) => {
      const repos = store.repos;
      const views = toViews(repos, table(repos).list());
      return applyFilters(views, filters, filter as Record<string, string | undefined>, () =>
        recordCoverage(repos),
      );
    },
    /** @inheritdoc */
    get: (id) => {
      const repos = store.repos;
      const row = table(repos).get(id);
      if (!row) throw new NotFoundError(entity, id);
      return toViews(repos, [row])[0]!;
    },
    // `store.transaction`'s return type is gated on `T extends Promise<any>
    // ? never : T`, which doesn't resolve while `T` (here `View`) is still
    // generic inside this function — the same naked-generic limitation
    // documented on `Store.transaction` itself. The inner `as never` and
    // outer `as View` restore the real, still-synchronous, return type.
    /** @inheritdoc */
    create: (values, sources) =>
      store.transaction((repos) => {
        assertSourcesExist(repos, sources);
        const row = table(repos).insert(values);
        repos.citations.replace(entity, String(row.id), sources);
        return toViews(repos, [row])[0] as never;
      }),
    /** @inheritdoc */
    update: (id, patch, sources) =>
      store.transaction((repos) => {
        if (sources) assertSourcesExist(repos, sources);
        const repo = table(repos);
        const before = repo.get(id);
        if (!before) throw new NotFoundError(entity, id);
        // A patch with no columns (replacing only the citations) has
        // nothing for `UPDATE ... SET` to set, which drizzle rejects; keep
        // the row as it was instead of writing an empty update.
        const row = Object.keys(patch).length > 0 ? repo.update(id, patch) : before;
        if (!row) throw new NotFoundError(entity, id);
        if (sources) repos.citations.replace(entity, String(id), sources);
        return toViews(repos, [row])[0] as never;
      }),
    /** @inheritdoc */
    remove: (id) =>
      store.transaction((repos) => {
        const repo = table(repos);
        if (!repo.get(id)) throw new NotFoundError(entity, id);
        repos.citations.removeAll(entity, String(id));
        if (lifecycle !== undefined) {
          repos.citations.removeAll(OBSOLESCENCE, obsolescenceKey(lifecycle, id));
        }
        repos.factClaims.removeFor({ entity, entityId: String(id) });
        repo.remove(id);
      }),
  };
}

/**
 * What a registered content type's reads and writes return: the row, its
 * `sources`, and `obsoleteSources` when the type has the obsolete lifecycle.
 */
export type ContentView<K extends ContentKey> = Cited<RowOf<K>> &
  (RowOf<K> extends { obsoleteSince: string | null } ? { obsoleteSources: string[] } : unknown);

/** The service of the registered content type `K`. */
export type RegisteredService<K extends ContentKey> = ContentService<
  RowOf<K>,
  ValuesOf<K>,
  ContentView<K>,
  FiltersOf<K>
>;

/**
 * Builds the {@link ContentService} of a registered content type from its
 * registry entry: its entity, table repo and list filters.
 *
 * @param store - the store to persist through
 * @param key - the type's registry key
 * @returns the service
 */
export function registeredService<K extends ContentKey>(
  store: Store,
  key: K,
): RegisteredService<K> {
  const { entity, filters } = specOf(key);
  type AnyRow = { id: RowId } & Record<string, unknown>;
  return createContentService<AnyRow, Record<string, unknown>>(store, {
    entity: entity!,
    /** @inheritdoc */
    table: (repos) => repos[key],
    filters,
    lifecycle: entity !== undefined && isObsoleteEntity(entity) ? entity : undefined,
  }) as unknown as RegisteredService<K>;
}

/**
 * The shape the generic CRUD router drives: create and update take the
 * whole request body, `sources` included.
 *
 * @typeParam Id - the `:id` path parameter's parsed type
 * @typeParam Input - the parsed `POST` body
 * @typeParam Patch - the parsed `PATCH` body
 * @typeParam View - what reads and writes return
 * @typeParam Filter - the list filters, by name
 */
export interface CrudEndpoints<Id, Input, Patch, View, Filter> {
  /** Returns every view, filtered by `filter`'s given values. */
  list(filter?: Filter): View[];
  /**
   * Returns the view for `id`.
   *
   * @throws {NotFoundError} if `id` doesn't exist
   */
  get(id: Id): View;
  /** Creates a row (or aggregate) from `input`. */
  create(input: Input): View;
  /**
   * Updates the row (or aggregate) with `id` from `patch`.
   *
   * @throws {NotFoundError} if `id` doesn't exist
   */
  update(id: Id, patch: Patch): View;
  /**
   * Deletes the row (or aggregate) with `id`.
   *
   * @throws {NotFoundError} if `id` doesn't exist
   */
  remove(id: Id): void;
}

/**
 * Adapts a {@link ContentService} to {@link CrudEndpoints}: `sources` is
 * split off the request body and passed alongside the column values.
 *
 * @param svc - the content service
 * @returns the endpoints, delegating to `svc`
 */
export function contentEndpoints<Row, Values, View, Filter extends object>(
  svc: ContentService<Row, Values, View, Filter>,
): CrudEndpoints<
  RowId,
  Values & { sources: string[] },
  Partial<Values> & { sources?: string[] },
  View,
  Filter
> {
  return {
    /** @inheritdoc */
    list: (filter) => svc.list(filter),
    /** @inheritdoc */
    get: (id) => svc.get(id),
    /** @inheritdoc */
    create: ({ sources, ...values }) => svc.create(values as Values, sources),
    /** @inheritdoc */
    update: (id, { sources, ...values }) => svc.update(id, values as Partial<Values>, sources),
    /** @inheritdoc */
    remove: (id) => svc.remove(id),
  };
}
