import { rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ImportError } from "../src/errors";
import { importRecord } from "../src/importers/import-record";
import type { Store } from "../src/repos";
import { createServices } from "../src/services";
import { exportSnapshot, restoreSnapshot } from "../src/services/export";
import { copyFixture, editJson, testStore } from "./helpers";

/** A build as `builds.json` holds it, for editing in place. */
type BuildRow = Record<string, unknown> & {
  id: string;
  skills: Array<Record<string, unknown>>;
  macros: Array<Record<string, unknown> & { id: string; steps: Array<{ skillId: string }> }>;
};

const copies: string[] = [];
afterEach(() => {
  for (const dir of copies.splice(0)) rmSync(dirname(dir), { recursive: true, force: true });
});

/**
 * Copies the fixture record under a slug, for one test.
 *
 * @param slug - the copy's slug
 * @returns its record directory
 */
function record(slug = "900-fixture"): string {
  const dir = copyFixture(slug);
  copies.push(dir);
  return dir;
}

/**
 * Renames every id a copy of the fixture writes, so it loads next to the fixture.
 *
 * @param dir - the copy's record directory
 * @param prefix - the prefix its build and macro ids take
 */
function renameBuilds(dir: string, prefix: string): void {
  editJson(dir, "curated/builds.json", (builds: BuildRow[]) => {
    for (const build of builds) {
      build.id = `${prefix}-${build.id}`;
      for (const macro of build.macros) macro.id = `${prefix}-${macro.id}`;
    }
  });
}

/**
 * Counts the rows of every table.
 *
 * @param store - the store to count
 * @returns table → row count
 */
function counts(store: Store): Record<string, number> {
  return Object.fromEntries(
    Object.entries(exportSnapshot(store).tables).map(([table, rows]) => [table, rows.length]),
  );
}

describe("importRecord", () => {
  it("writes the record, its skills and its build nested, every row cited", () => {
    // Arrange
    const store = testStore();
    const dir = record();

    // Act
    const result = importRecord(store, dir);

    // Assert
    const services = createServices(store);
    expect(result.counts).toMatchObject({ builds: 1, buildSkills: 1, macros: 1, macroSteps: 1 });
    expect(services.records.get("900-fixture")).toMatchObject({
      question: "Which skills does a gladiator level first?",
      updatedAt: "2026-10-02",
      lede: "Level the opener first; slot Wrath Wave at 22.",
      classes: ["gladiator"],
    });
    expect(services.builds.get("gladiator-leveling")).toMatchObject({
      recordSlug: "900-fixture",
      sources: ["web:fixture-guide"],
      skills: [{ rank: 1, targetLevel: 10, skill: { name: "Ruinous Blow" } }],
      stigmas: [{ slotLevel: 22, skill: { name: "Wrath Wave" } }],
      macros: [{ key: "R", steps: [{ position: 1, skill: { id: "gladiator-ruinous-blow" } }] }],
    });
    expect(services.skills.get("gladiator-ruinous-blow").sources).toEqual(["web:fixture-guide"]);
    expect(services.sources.list({ record: "900-fixture" }).map((s) => s.id)).toEqual([
      "web:fixture-guide",
    ]);
  });

  it("fails on a build naming an unknown skill, and writes nothing", () => {
    // Arrange
    const store = testStore();
    const dir = record();
    editJson(dir, "curated/builds.json", (builds: BuildRow[]) => {
      builds[0]!.macros[0]!.steps.push({ skillId: "gladiator-nope" });
    });

    // Act & Assert
    expect(() => importRecord(store, dir)).toThrow(
      "record 900-fixture: builds[gladiator-leveling] names unknown skill gladiator-nope",
    );
    expect(Object.values(counts(store)).every((n) => n === 0)).toBe(true);
  });

  it("resolves a build's skill to one another record already imported", () => {
    // Arrange
    const store = testStore();
    importRecord(store, record());
    const second = record("901-second");
    renameBuilds(second, "second");
    editJson(second, "curated/skills.json", (skills: unknown[]) => skills.splice(0));

    // Act
    importRecord(store, second);

    // Assert
    const build = createServices(store).builds.get("second-gladiator-leveling");
    expect(build.skills[0]!.skill).toMatchObject({ id: "gladiator-ruinous-blow" });
  });

  it("lists builds by record number, then in the record's order, whatever their ids", () => {
    // Arrange
    const store = testStore();
    const first = record();
    editJson(first, "curated/builds.json", (builds: BuildRow[]) => {
      builds.push({ ...builds[0]!, id: "gladiator-pve", purpose: "pve", macros: [] });
    });
    importRecord(store, first);
    const second = record("901-second");
    renameBuilds(second, "aaa");
    editJson(second, "curated/skills.json", (skills: unknown[]) => skills.splice(0));

    // Act
    importRecord(store, second);

    // Assert
    const builds = createServices(store).builds.list();
    expect(builds.map((b) => [b.id, b.position])).toEqual([
      ["gladiator-leveling", 0],
      ["gladiator-pve", 1],
      ["aaa-gladiator-leveling", 0],
    ]);
  });

  it("keeps the build order when an earlier record is replaced after a later one", () => {
    // Arrange
    const store = testStore();
    const first = record();
    importRecord(store, first);
    const second = record("901-second");
    renameBuilds(second, "aaa");
    editJson(second, "curated/skills.json", (skills: unknown[]) => skills.splice(0));
    importRecord(store, second);

    // Act
    importRecord(store, first, { replace: true });

    // Assert
    const builds = createServices(store).builds.list();
    expect(builds.map((b) => b.id)).toEqual(["gladiator-leveling", "aaa-gladiator-leveling"]);
  });

  it("keeps a shared skill with its first record, and warns when a later record's differs", () => {
    // Arrange
    const store = testStore();
    importRecord(store, record());
    const second = record("901-second");
    renameBuilds(second, "second");
    editJson(second, "curated/skills.json", (skills: Array<{ unlockLevel: number }>) => {
      skills[0]!.unlockLevel = 12;
    });

    // Act
    const { warnings } = importRecord(store, second);

    // Assert
    expect(store.repos.skills.get("gladiator-ruinous-blow")).toMatchObject({
      unlockLevel: 10,
      recordSlug: "900-fixture",
    });
    expect(warnings).toContain(
      "skill gladiator-ruinous-blow is already loaded by record 900-fixture; keeping that row (this record's differs in unlockLevel)",
    );
  });

  it("keeps a build's macro chains in curated order, through an export and a restore", () => {
    // Arrange
    const store = testStore();
    const dir = record();
    editJson(dir, "curated/builds.json", (builds: BuildRow[]) => {
      const [chain] = builds[0]!.macros;
      builds[0]!.macros = [
        { ...chain!, id: "gladiator-zeta" },
        { ...chain!, id: "gladiator-alpha" },
      ];
    });
    importRecord(store, dir);
    const restored = testStore();

    // Act
    restoreSnapshot(restored, JSON.parse(JSON.stringify(exportSnapshot(store))));

    // Assert
    const macros = createServices(restored).builds.get("gladiator-leveling").macros;
    expect(macros.map((m) => [m.id, m.position])).toEqual([
      ["gladiator-zeta", 1],
      ["gladiator-alpha", 2],
    ]);
  });

  it("refuses a second import without replace", () => {
    // Arrange
    const store = testStore();
    const dir = record();
    importRecord(store, dir);

    // Act & Assert
    expect(() => importRecord(store, dir)).toThrow(
      "record 900-fixture is already loaded; pass --replace to load it again",
    );
  });

  it("with replace, clears and rewrites only that record's rows", () => {
    // Arrange
    const store = testStore();
    const first = record();
    importRecord(store, first);
    const second = record("901-second");
    renameBuilds(second, "second");
    editJson(second, "curated/skills.json", (skills: unknown[]) => skills.splice(0));
    importRecord(store, second);
    const before = counts(store);
    editJson(first, "curated/builds.json", (builds: BuildRow[]) => {
      builds[0]!.title = "Leveling, revised";
    });

    // Act
    importRecord(store, first, { replace: true });

    // Assert
    const services = createServices(store);
    expect(counts(store)).toEqual(before);
    expect(services.builds.get("gladiator-leveling").title).toBe("Leveling, revised");
    expect(services.builds.get("second-gladiator-leveling")).toMatchObject({
      recordSlug: "901-second",
      skills: [{ skill: { id: "gladiator-ruinous-blow" } }],
    });
  });

  it("with replace over a database holding only that record, exports what a fresh import does", () => {
    // Arrange
    const fresh = testStore();
    const replaced = testStore();
    const dir = record();
    importRecord(fresh, dir);
    importRecord(replaced, dir);

    // Act
    importRecord(replaced, dir, { replace: true });

    // Assert
    expect(exportSnapshot(replaced)).toEqual(exportSnapshot(fresh));
  });

  it("fails on two builds sharing a macro id, naming the record, both builds and the macro", () => {
    // Arrange
    const store = testStore();
    const dir = record();
    editJson(dir, "curated/builds.json", (builds: BuildRow[]) => {
      builds.push({ ...builds[0]!, id: "gladiator-pve", purpose: "pve" });
    });

    // Act & Assert
    expect(() => importRecord(store, dir)).toThrow(
      "record 900-fixture: builds[gladiator-leveling] and builds[gladiator-pve] share macro id gladiator-leveling-main",
    );
    expect(store.repos.records.list()).toEqual([]);
  });

  it("fails on a macro id another record's build holds, and writes nothing", () => {
    // Arrange
    const store = testStore();
    importRecord(store, record());
    const second = record("901-second");
    editJson(second, "curated/builds.json", (builds: BuildRow[]) => {
      builds[0]!.id = "second-build";
    });
    editJson(second, "curated/skills.json", (skills: unknown[]) => skills.splice(0));
    const before = counts(store);

    // Act & Assert
    expect(() => importRecord(store, second)).toThrow(
      "record 901-second: builds[second-build] and builds[gladiator-leveling] of record 900-fixture share macro id gladiator-leveling-main",
    );
    expect(counts(store)).toEqual(before);
  });

  it("fails on a build id another record holds", () => {
    // Arrange
    const store = testStore();
    importRecord(store, record());
    const second = record("901-second");

    // Act & Assert
    expect(() => importRecord(store, second)).toThrow(
      "record 901-second: builds[gladiator-leveling] is already loaded by record 900-fixture",
    );
  });

  it("rejects a cited source the record doesn't curate, naming the file and row", () => {
    // Arrange
    const dir = record();
    editJson(dir, "curated/builds.json", (builds: BuildRow[]) => {
      builds[0]!.sources = ["web:elsewhere"];
    });

    // Act & Assert
    expect(() => importRecord(testStore(), dir)).toThrow(
      "curated/builds.json [0]: unknown source ids: web:elsewhere",
    );
  });

  it("reports a schema failure with the file, row and issue path", () => {
    // Arrange
    const dir = record();
    editJson(dir, "curated/builds.json", (builds: BuildRow[]) => {
      builds[0]!.skills[0]!.targetLevel = 0;
    });

    // Act & Assert
    expect(() => importRecord(testStore(), dir)).toThrow(ImportError);
    expect(() => importRecord(testStore(), dir)).toThrow(
      /^curated\/builds\.json \[0\]: skills\.0\.targetLevel: /,
    );
  });

  it("writes an obsolete build's lifecycle and its reason's citations", () => {
    // Arrange
    const store = testStore();
    const dir = record();
    editJson(dir, "curated/builds.json", (builds: BuildRow[]) => {
      builds[0]!.obsolete = {
        since: "2026-10-02",
        reason: "Patch moved the opener.",
        sources: ["web:fixture-guide"],
      };
    });

    // Act
    importRecord(store, dir);

    // Assert
    const services = createServices(store);
    expect(services.builds.get("gladiator-leveling")).toMatchObject({
      obsoleteSince: "2026-10-02",
      obsoleteReason: "Patch moved the opener.",
      obsoleteSources: ["web:fixture-guide"],
    });
    expect(services.builds.list({ current: "true" })).toEqual([]);
  });

  it("rejects an obsolete block dated after the record's last update", () => {
    // Arrange
    const dir = record();
    editJson(dir, "curated/builds.json", (builds: BuildRow[]) => {
      builds[0]!.obsolete = { since: "2026-10-09", reason: "r", sources: ["web:fixture-guide"] };
    });

    // Act & Assert
    expect(() => importRecord(testStore(), dir)).toThrow(
      "curated/builds.json [0]: obsolete since 2026-10-09 is after the record's update of 2026-10-02",
    );
  });

  it("loads the curated findings, each owned by the record", () => {
    // Arrange
    const store = testStore();
    const dir = record();
    editJson(dir, "curated/manifest.json", (manifest: { collections: Record<string, string> }) => {
      manifest.collections.mechanics = "mechanics.json";
      manifest.collections.takeaways = "takeaways.json";
    });
    const sources = ["web:fixture-guide"];
    writeCurated(dir, "mechanics.json", [
      { title: "Chains", body: "b", confidence: "posted", sources },
    ]);
    writeCurated(dir, "takeaways.json", [
      { text: "Level the opener.", class: "gladiator", sources },
    ]);

    // Act
    importRecord(store, dir);

    // Assert
    const services = createServices(store);
    expect(services.mechanics.list()).toMatchObject([
      { title: "Chains", class: null, recordSlug: "900-fixture", sources },
    ]);
    expect(services.takeaways.list()).toMatchObject([{ position: 0, text: "Level the opener." }]);
  });
});

/**
 * Writes a curated file of a record copy.
 *
 * @param dir - the record directory
 * @param file - the file's name under `curated/`
 * @param rows - its rows
 */
function writeCurated(dir: string, file: string, rows: unknown): void {
  writeFileSync(join(dir, "curated", file), JSON.stringify(rows));
}
