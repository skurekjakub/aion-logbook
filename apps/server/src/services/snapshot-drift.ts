import type { TableKey } from "../registry";
import { TABLE_KEYS } from "../registry";
import type { Store } from "../repos";
import type { Snapshot, SnapshotTables } from "./export";

/** One table whose rows differ between the database and a snapshot. */
export interface TableDrift {
  /** The table's registry name. */
  table: TableKey;
  /** Its row count in the database. */
  database: number;
  /** Its row count in the snapshot; `0` for a table the snapshot predates. */
  snapshot: number;
}

/** How a database differs from a snapshot. Every list is empty when they hold the same rows. */
export interface SnapshotDrift {
  /** Slugs of the research records the snapshot holds and the database lacks, sorted. */
  missingRecords: string[];
  /** Slugs of the research records the database holds and the snapshot lacks, sorted. */
  extraRecords: string[];
  /** The tables whose rows differ, in registry order, with both row counts. */
  tables: TableDrift[];
}

/**
 * Compares the database with a snapshot, table by table: a table differs
 * when its rows, each sorted by primary key as `exportSnapshot` dumps
 * them, aren't the snapshot's rows. Reads only.
 *
 * @param store - the database to compare
 * @param snapshot - the snapshot, as parsed from its JSON file; a table it
 *   doesn't have counts as empty
 * @returns the records and tables that differ
 */
export function snapshotDrift(store: Store, snapshot: Snapshot): SnapshotDrift {
  const { tables } = store.repos;
  const stored = snapshot.tables as Partial<SnapshotTables>;
  const drifted: TableDrift[] = [];
  for (const key of TABLE_KEYS) {
    const rows = tables.dump(key);
    const expected = stored[key] ?? [];
    if (JSON.stringify(rows) !== JSON.stringify(expected)) {
      drifted.push({ table: key, database: rows.length, snapshot: expected.length });
    }
  }
  const inDb = new Set(tables.dump("researchRecords").map((r) => r.slug));
  const inSnapshot = new Set((stored.researchRecords ?? []).map((r) => r.slug));
  return {
    missingRecords: [...inSnapshot].filter((slug) => !inDb.has(slug)).sort(),
    extraRecords: [...inDb].filter((slug) => !inSnapshot.has(slug)).sort(),
    tables: drifted,
  };
}

/**
 * Words a drift as the server's startup warning: what differs, and the fix
 * for each direction (reseed from the snapshot, or rebuild the snapshot
 * from a fresh import of every record).
 *
 * @param drift - the drift {@link snapshotDrift} found
 * @param paths - the database file and the snapshot file, as the warning names them
 * @returns the warning, or `null` when nothing differs
 */
export function driftWarning(
  drift: SnapshotDrift,
  paths: { dbPath: string; snapshotPath: string },
): string | null {
  const { missingRecords, extraRecords, tables } = drift;
  if (missingRecords.length + extraRecords.length + tables.length === 0) return null;
  const lines = [`warning: ${paths.dbPath} differs from ${paths.snapshotPath}.`];
  if (missingRecords.length > 0) {
    lines.push(`  records in the snapshot but not the database: ${missingRecords.join(", ")}`);
  }
  if (extraRecords.length > 0) {
    lines.push(`  records in the database but not the snapshot: ${extraRecords.join(", ")}`);
  }
  if (tables.length > 0) {
    const listed = tables.map((t) => `${t.table} (database ${t.database}, snapshot ${t.snapshot})`);
    lines.push(`  tables that differ: ${listed.join(", ")}`);
  }
  lines.push(
    `  If the snapshot is newer (a pull brought records or rows), stop the server, delete ${paths.dbPath} and start it again to reseed from the snapshot.`,
    "  If a record's data changed and the snapshot should follow it, rebuild the snapshot from a fresh database: point AION_DB at a new file, run pnpm import:record for every record in order, then pnpm import:account --all, then pnpm db:export. Don't export this database: --replace and API edits leave ids and rows a fresh import would not make.",
  );
  return lines.join("\n");
}
