import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importAccount } from "../src/importers/account";
import { importRecord } from "../src/importers/import-record";
import type { Store } from "../src/repos";
import { createServices } from "../src/services";
import { exportSnapshot, restoreSnapshot } from "../src/services/export";
import type { Snapshot } from "../src/services/export";
import { driftWarning, snapshotDrift } from "../src/services/snapshot-drift";
import { addSource, copyFixture, testStore } from "./helpers";

const ACCOUNT = join(import.meta.dirname, "fixtures", "account");

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * Loads a record row and one cited mechanic into `store`.
 *
 * @param store - the store to write to
 * @param slug - the record's slug
 */
function seedRecord(store: Store, slug: string): void {
  store.repos.records.upsert({
    slug,
    question: "q",
    status: "active",
    startedAt: "2026-01-01",
    updatedAt: "2026-01-01",
  });
  if (store.repos.sources.missing(["web:a"]).length > 0) addSource(store, "web:a");
  createServices(store).mechanics.create({ title: slug, body: "b", confidence: "posted" }, [
    "web:a",
  ]);
}

/**
 * Builds a snapshot of a store holding the given records.
 *
 * @param slugs - the records the snapshot holds
 * @returns the snapshot, round-tripped through JSON as the committed file is
 */
function snapshotOf(...slugs: string[]): Snapshot {
  const store = testStore();
  for (const slug of slugs) seedRecord(store, slug);
  return JSON.parse(JSON.stringify(exportSnapshot(store))) as Snapshot;
}

const PATHS = { dbPath: "data/aion.db", snapshotPath: "data/snapshot.json" };

describe("snapshotDrift", () => {
  it("finds nothing when the database was restored from the snapshot", () => {
    // Arrange
    const snapshot = snapshotOf("001-a", "002-b");
    const store = testStore();
    restoreSnapshot(store, snapshot);

    // Act
    const drift = snapshotDrift(store, snapshot);

    // Assert
    expect(drift).toEqual({ missingRecords: [], extraRecords: [], tables: [] });
    expect(driftWarning(drift, PATHS)).toBeNull();
  });

  it("finds nothing when a database is restored from an export of a loaded record and character", () => {
    // Arrange
    const source = testStore();
    const dir = copyFixture();
    temps.push(join(dir, ".."));
    importRecord(source, dir);
    importAccount(source, ACCOUNT, { all: true });
    const snapshot = JSON.parse(JSON.stringify(exportSnapshot(source))) as Snapshot;
    const store = testStore();
    restoreSnapshot(store, snapshot);

    // Act
    const drift = snapshotDrift(store, snapshot);

    // Assert
    expect(drift).toEqual({ missingRecords: [], extraRecords: [], tables: [] });
  });

  it("names a record the snapshot has and the database lacks, and the tables whose rows differ", () => {
    // Arrange
    const store = testStore();
    restoreSnapshot(store, snapshotOf("001-a"));

    // Act
    const drift = snapshotDrift(store, snapshotOf("001-a", "003-c"));

    // Assert
    expect(drift.missingRecords).toEqual(["003-c"]);
    expect(drift.extraRecords).toEqual([]);
    expect(drift.tables).toContainEqual({ table: "researchRecords", database: 1, snapshot: 2 });
    expect(drift.tables).toContainEqual({ table: "mechanics", database: 1, snapshot: 2 });
  });

  it("names a table whose rows changed though its row count didn't", () => {
    // Arrange
    const snapshot = snapshotOf("001-a");
    const store = testStore();
    restoreSnapshot(store, snapshot);
    const [mechanic] = store.repos.mechanics.list();
    store.repos.mechanics.update(mechanic!.id, { body: "edited" });

    // Act
    const drift = snapshotDrift(store, snapshot);

    // Assert
    expect(drift.tables).toEqual([{ table: "mechanics", database: 1, snapshot: 1 }]);
  });

  it("treats a table the snapshot predates as empty there", () => {
    // Arrange
    const store = testStore();
    restoreSnapshot(store, snapshotOf("001-a"));
    const older = JSON.parse(JSON.stringify(exportSnapshot(store))) as Snapshot;
    delete (older.tables as Partial<Snapshot["tables"]>).mechanics;

    // Act
    const drift = snapshotDrift(store, older);

    // Assert
    expect(drift.tables).toEqual([{ table: "mechanics", database: 1, snapshot: 0 }]);
  });
});

describe("driftWarning", () => {
  it("names the missing records, the differing tables and both fixes, without changing anything", () => {
    // Arrange
    const store = testStore();
    restoreSnapshot(store, snapshotOf("001-a"));
    const before = JSON.stringify(exportSnapshot(store));

    // Act
    const warning = driftWarning(snapshotDrift(store, snapshotOf("001-a", "003-c")), PATHS);

    // Assert
    expect(warning).toContain("data/aion.db differs from data/snapshot.json");
    expect(warning).toContain("003-c");
    expect(warning).toContain("mechanics (database 1, snapshot 2)");
    expect(warning).toContain("delete data/aion.db");
    expect(warning).toContain("point AION_DB at a new file");
    expect(warning).toContain("Don't export this database");
    expect(JSON.stringify(exportSnapshot(store))).toBe(before);
  });
});
