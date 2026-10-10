import { ConflictError } from "../errors";
import type { RowOf, TableKey } from "../registry";
import { TABLE_KEYS } from "../registry";
import type { Store } from "../repos";

/**
 * Every table a {@link Snapshot} captures, keyed by its registry name, in
 * the registry's foreign-key-safe insert order.
 */
export type SnapshotTables = { [K in TableKey]: RowOf<K>[] };

/** Rows written per table, keyed like {@link SnapshotTables}. */
export type TableCounts = Record<TableKey, number>;

/** A full, versioned dump of every durable table, for the committed `data/snapshot.json`. */
export interface Snapshot {
  /** Snapshot format version; {@link restoreSnapshot} accepts only `1`. */
  version: 1;
  /** The captured tables, each sorted by its own primary key. */
  tables: SnapshotTables;
}

/**
 * Builds a full {@link Snapshot} of every registered table.
 *
 * Reads every table independent of each repo's own list order (several are
 * ordered for UI display, e.g. `sources` newest-first) and sorts it by its
 * primary key, keyed in the registry's order, which is the order
 * {@link restoreSnapshot} later inserts them back in.
 *
 * @param store - the store to snapshot
 * @returns the snapshot, at format `version` `1`
 */
export function exportSnapshot(store: Store): Snapshot {
  const { tables } = store.repos;
  return {
    version: 1,
    tables: Object.fromEntries(TABLE_KEYS.map((key) => [key, tables.dump(key)])) as SnapshotTables,
  };
}

/**
 * Guards `pnpm db:export` against silently overwriting the committed
 * `data/snapshot.json` with nothing, e.g. because `AION_DB` pointed at a
 * missing or freshly-migrated database (`openDb` creates and migrates a
 * database file that doesn't exist yet, rather than failing).
 *
 * @param snapshot - the snapshot about to be written
 * @throws {ConflictError} if every table in `snapshot.tables` is empty
 */
export function assertSnapshotNonEmpty(snapshot: Snapshot): void {
  const everyTableEmpty = Object.values(snapshot.tables).every((rows) => rows.length === 0);
  if (everyTableEmpty) {
    throw new ConflictError("snapshot is entirely empty; refusing to export (check AION_DB)");
  }
}

/**
 * Restores every table of `snapshot` into `store`, preserving every row's
 * id, inside a single transaction, in the registry's insert order. A table
 * the snapshot doesn't have (it predates the table) stays empty.
 *
 * @param store - the store to restore into; every registered table must be
 *   empty
 * @param snapshot - the snapshot to restore
 * @returns the number of rows written, per table
 * @throws {ConflictError} if `snapshot.version` isn't `1`
 * @throws {ConflictError} `"database is not empty; restore needs a fresh
 *   database"` if any table already has rows
 * @throws whatever the underlying inserts throw (e.g. a foreign-key
 *   violation from a row referencing an id that doesn't exist), after
 *   rolling back every write this call made
 */
export function restoreSnapshot(store: Store, snapshot: Snapshot): TableCounts {
  // The snapshot arrives as parsed JSON, so its version is only claimed by the type.
  const version: unknown = snapshot.version;
  if (version !== 1) {
    throw new ConflictError(`unsupported snapshot version: ${JSON.stringify(version)}`);
  }
  const tables = Object.fromEntries(
    TABLE_KEYS.map((key) => [key, (snapshot.tables as Partial<SnapshotTables>)[key] ?? []]),
  ) as SnapshotTables;
  // `Store.transaction` can't infer its type parameter through its own
  // conditional return type, so the inner return is cast `as never`, as in
  // `createBuildService`'s implementation.
  return store.transaction((repos) => {
    if (TABLE_KEYS.some((key) => repos.tables.count(key) > 0)) {
      throw new ConflictError("database is not empty; restore needs a fresh database");
    }
    for (const key of TABLE_KEYS) repos.tables.load(key, tables[key]);
    return Object.fromEntries(TABLE_KEYS.map((key) => [key, tables[key].length])) as never;
  });
}

/** Read-only access to a full snapshot of the current database, for the export route. */
export interface ExportService {
  /** Builds a full {@link Snapshot} of the current database. */
  run(): Snapshot;
}

/**
 * Builds an {@link ExportService} over `store`.
 *
 * @param store - the store to snapshot
 * @returns the service
 */
export function createExportService(store: Store): ExportService {
  return {
    /** @inheritdoc */
    run: () => exportSnapshot(store),
  };
}
