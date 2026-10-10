import { rmSync } from "node:fs";
import { dirname } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importRecord } from "../src/importers/import-record";
import { exportSnapshot } from "../src/services/export";
import type { Snapshot } from "../src/services/export";
import { changedAccount, changedRecords, scopeRole } from "../src/services/snapshot-scope";
import { copyFixture, editJson, testStore } from "./helpers";

const copies: string[] = [];
afterEach(() => {
  for (const dir of copies.splice(0)) rmSync(dirname(dir), { recursive: true, force: true });
});

/**
 * Imports a copy of the fixture record, edited by `edit`, and snapshots the result.
 *
 * @param edit - edits the copy before the import
 * @returns the snapshot
 */
function snapshotWith(edit: (dir: string) => void = () => {}): Snapshot {
  const dir = copyFixture();
  copies.push(dir);
  edit(dir);
  const store = testStore();
  importRecord(store, dir);
  return JSON.parse(JSON.stringify(exportSnapshot(store))) as Snapshot;
}

describe("changedRecords", () => {
  it("finds no change between two imports of the same record", () => {
    // Arrange
    const before = snapshotWith();
    const after = snapshotWith();

    // Act
    const changes = changedRecords(before, after);

    // Assert
    expect(changes).toEqual([]);
  });

  it("names a build's record when a macro step changes, under the builds table", () => {
    // Arrange
    const before = snapshotWith();
    const after = snapshotWith((dir) => {
      editJson(
        dir,
        "curated/builds.json",
        (builds: Array<{ macros: Array<{ steps: unknown[] }> }>) => {
          builds[0]!.macros[0]!.steps.push({ skillId: "gladiator-wrath-wave" });
        },
      );
    });

    // Act
    const changes = changedRecords(before, after);

    // Assert
    expect(changes).toEqual([{ record: "900-fixture", tables: ["builds"] }]);
  });

  it("places a build's children under the build, and the character's tables apart", () => {
    // Assert
    expect(scopeRole("macroSteps")).toBe("child");
    expect(scopeRole("macros")).toBe("child");
    expect(scopeRole("builds")).toBe("owned");
    expect(scopeRole("accountSkills")).toBe("account");
    expect(changedAccount(snapshotWith(), snapshotWith())).toEqual([]);
  });
});
