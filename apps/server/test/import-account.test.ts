import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importAccount } from "../src/importers/account";
import { importRecord } from "../src/importers/import-record";
import type { Store } from "../src/repos";
import type { AccountOverview } from "../src/services/account";
import { exportSnapshot, restoreSnapshot } from "../src/services/export";
import { copyFixture, makeTestApp, readJson, testStore } from "./helpers";

const ACCOUNT = join(import.meta.dirname, "fixtures", "account");

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * Builds a store holding the fixture record, so the snapshot's skill names resolve.
 *
 * @returns the store
 */
function storeWithSkills(): Store {
  const store = testStore();
  const dir = copyFixture();
  temps.push(join(dir, ".."));
  importRecord(store, dir);
  return store;
}

/**
 * Copies the fixture account folder, so a test can add files to it.
 *
 * @returns the copy's path
 */
function accountCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), "aion-account-"));
  temps.push(dir);
  cpSync(ACCOUNT, dir, { recursive: true });
  return dir;
}

describe("importAccount", () => {
  it("loads the latest snapshot and its roadmap, resolving skill names by class and case", () => {
    // Arrange
    const store = storeWithSkills();

    // Act
    const result = importAccount(store, ACCOUNT);

    // Assert
    expect(result.snapshots).toEqual(["2026-10-07"]);
    expect(store.repos.account.getSnapshot("2026-10-07")).toMatchObject({
      character: "Fixture",
      class: "gladiator",
      level: 34,
      gearScore: 1520,
      server: "Siel",
      unread: ["the gear score tooltip"],
    });
    expect(
      store.repos.account.skills("2026-10-07").map(({ skillName, skillId, level, slot }) => ({
        skillName,
        skillId,
        level,
        slot,
      })),
    ).toEqual([
      { skillName: "ruinous blow", skillId: "gladiator-ruinous-blow", level: 8, slot: "1" },
      { skillName: "Unknown Strike", skillId: null, level: 2, slot: null },
    ]);
    expect(store.repos.account.stigmas("2026-10-07")).toMatchObject([
      { slotLevel: 22, skillName: "Wrath Wave", skillId: "gladiator-wrath-wave" },
      { slotLevel: 27, skillName: null, skillId: null },
    ]);
    expect(store.repos.account.roadmap("2026-10-07")).toMatchObject([
      { rank: 1, priority: "now", action: "Level Ruinous Blow to 10" },
      { rank: 2, priority: "later", refs: [] },
    ]);
    expect(result.warnings).toEqual([
      "snapshot 2026-10-07: no loaded gladiator skill is named Unknown Strike; its skillId stays null",
    ]);
    expect(result.counts).toMatchObject({ accountMacros: 2, accountMacroSteps: 3 });
  });

  it("stores the snapshot's macro chains in editor order, each step resolved where it can be", () => {
    // Arrange
    const store = storeWithSkills();

    // Act
    importAccount(store, ACCOUNT);

    // Assert
    const macros = store.repos.account.macros("2026-10-07");
    const steps = store.repos.account.macroSteps(macros.map((m) => m.id));
    expect(macros).toMatchObject([
      { position: 1, name: "Opener", key: "R" },
      { position: 2, name: "Spare", key: null },
    ]);
    expect(steps.map(({ position, skillName, skillId }) => [position, skillName, skillId])).toEqual(
      [
        [1, "Ruinous Blow", "gladiator-ruinous-blow"],
        [2, "Unknown Strike", null],
        [1, "wrath wave", "gladiator-wrath-wave"],
      ],
    );
  });

  it("loads every snapshot with all, oldest first", () => {
    // Arrange
    const store = storeWithSkills();

    // Act
    const result = importAccount(store, ACCOUNT, { all: true });

    // Assert
    expect(result.snapshots).toEqual(["2026-10-01", "2026-10-07"]);
    expect(store.repos.account.snapshots().map((s) => s.id)).toEqual(["2026-10-01", "2026-10-07"]);
  });

  it("skips the latest snapshot once loaded, and refuses a loaded file named without replace", () => {
    // Arrange
    const store = storeWithSkills();
    importAccount(store, ACCOUNT);
    const file = join(ACCOUNT, "snapshots", "2026-10-07.json");

    // Act
    const again = importAccount(store, ACCOUNT);

    // Assert
    expect(again.snapshots).toEqual([]);
    expect(again.skipped).toEqual(["2026-10-07"]);
    expect(() => importAccount(store, ACCOUNT, { files: [file] })).toThrow(
      "snapshot 2026-10-07 is already loaded; pass --replace to load it again",
    );
  });

  it("replaces a loaded snapshot with replace, its skills, stigmas, macros and roadmap included", () => {
    // Arrange
    const store = storeWithSkills();
    importAccount(store, ACCOUNT);
    const file = join(ACCOUNT, "snapshots", "2026-10-07.json");

    // Act
    const result = importAccount(store, ACCOUNT, { files: [file], replace: true });

    // Assert
    expect(result.snapshots).toEqual(["2026-10-07"]);
    expect(store.repos.account.skills("2026-10-07")).toHaveLength(2);
    expect(store.repos.account.stigmas("2026-10-07")).toHaveLength(2);
    expect(store.repos.account.macros("2026-10-07")).toHaveLength(2);
    expect(store.repos.account.roadmap("2026-10-07")).toHaveLength(2);
  });

  it("names the file and the path of a field that fails its schema, and writes nothing", () => {
    // Arrange
    const store = testStore();
    const dir = accountCopy();
    writeFileSync(
      join(dir, "snapshots", "2026-10-09.json"),
      JSON.stringify({ schema: "aion-account-snapshot/1", character: { level: 0 } }),
    );

    // Act & Assert
    expect(() => importAccount(store, dir)).toThrow(/^snapshots\/2026-10-09\.json: capturedAt: /);
    expect(store.repos.account.snapshots()).toEqual([]);
  });

  it("fails on a folder with no snapshot", () => {
    // Arrange
    const dir = mkdtempSync(join(tmpdir(), "aion-account-"));
    temps.push(dir);

    // Act & Assert
    expect(() => importAccount(testStore(), dir)).toThrow(/no snapshot to import/);
  });

  it("goes into the snapshot export and comes back from a restore", () => {
    // Arrange
    const store = storeWithSkills();
    importAccount(store, ACCOUNT, { all: true });
    const snapshot = exportSnapshot(store);
    const restored = testStore();

    // Act
    restoreSnapshot(restored, JSON.parse(JSON.stringify(snapshot)));

    // Assert
    expect(exportSnapshot(restored)).toEqual(snapshot);
  });
});

describe("GET /api/account", () => {
  it("answers an empty view when no snapshot is loaded", async () => {
    // Arrange
    const app = makeTestApp();

    // Act
    const res = await app.request("/api/account");

    // Assert
    expect(await res.json()).toEqual({ snapshots: [], snapshot: null, roadmap: [] });
  });

  it("shows the latest snapshot with its skills, stigmas, macro chains and roadmap", async () => {
    // Arrange
    const store = storeWithSkills();
    importAccount(store, ACCOUNT, { all: true });
    const app = makeTestApp(store);

    // Act
    const got = await readJson<AccountOverview>(await app.request("/api/account"));

    // Assert
    expect(got.snapshots.map((s) => s.id)).toEqual(["2026-10-01", "2026-10-07"]);
    expect(got.snapshot).toMatchObject({
      id: "2026-10-07",
      level: 34,
      skills: [
        { name: "ruinous blow", skillId: "gladiator-ruinous-blow", level: 8, slot: "1" },
        { name: "Unknown Strike", skillId: null },
      ],
      stigmas: [
        { slotLevel: 22, name: "Wrath Wave", skillId: "gladiator-wrath-wave" },
        { slotLevel: 27, name: null, skillId: null },
      ],
      macros: [
        {
          position: 1,
          name: "Opener",
          key: "R",
          steps: [
            { position: 1, name: "Ruinous Blow", skillId: "gladiator-ruinous-blow" },
            { position: 2, name: "Unknown Strike", skillId: null },
          ],
        },
        {
          position: 2,
          name: "Spare",
          key: null,
          steps: [{ position: 1, name: "wrath wave", skillId: "gladiator-wrath-wave" }],
        },
      ],
    });
    expect(got.roadmap).toMatchObject([{ rank: 1, area: "skills" }, { rank: 2 }]);
  });

  it("shows an older snapshot by id, and answers 404 for one that isn't loaded", async () => {
    // Arrange
    const store = storeWithSkills();
    importAccount(store, ACCOUNT, { all: true });
    const app = makeTestApp(store);

    // Act
    const older = await readJson<AccountOverview>(
      await app.request("/api/account?snapshot=2026-10-01"),
    );
    const missing = await app.request("/api/account?snapshot=2026-01-01");

    // Assert
    expect(older.snapshot).toMatchObject({ id: "2026-10-01", level: 30 });
    expect(older.roadmap).toEqual([]);
    expect(missing.status).toBe(404);
  });
});
