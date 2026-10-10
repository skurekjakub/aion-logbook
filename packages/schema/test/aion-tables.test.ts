import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { migrationsFolder } from "../src/migrations-path";
import {
  accountMacroSteps,
  accountMacros,
  accountSnapshots,
  accountStigmas,
  buildSkills,
  buildStigmas,
  builds,
  macroSteps,
  macros,
  mechanics,
  skills,
} from "../src";

/**
 * Opens an in-memory database with every migration applied.
 *
 * @returns the drizzle handle
 * @throws if a migration fails to apply
 */
function openDb() {
  const db = drizzle({ client: new DatabaseSync(":memory:") });
  migrate(db, { migrationsFolder });
  return db;
}

describe("aion tables", () => {
  it("round-trips a build with its skills, stigmas and a macro chain", () => {
    // Arrange
    const db = openDb();

    // Act
    db.insert(skills)
      .values([
        {
          id: "gladiator-ruinous-blow",
          class: "gladiator",
          name: "Ruinous Blow",
          kind: "active",
          unlockLevel: 10,
          recordSlug: "001-x",
        },
        {
          id: "gladiator-wrath-wave",
          class: "gladiator",
          name: "Wrath Wave",
          kind: "stigma",
          unlockLevel: 22,
          recordSlug: "001-x",
        },
      ])
      .run();
    db.insert(builds)
      .values({
        id: "gladiator-leveling",
        class: "gladiator",
        purpose: "leveling",
        title: "Leveling",
        why: "Fast clears",
        confidence: "theory",
        recordSlug: "001-x",
      })
      .run();
    db.insert(buildSkills)
      .values({
        buildId: "gladiator-leveling",
        skillId: "gladiator-ruinous-blow",
        rank: 1,
        targetLevel: 10,
        why: "Main nuke",
      })
      .run();
    db.insert(buildStigmas)
      .values({
        buildId: "gladiator-leveling",
        slotLevel: 22,
        skillId: "gladiator-wrath-wave",
        why: "AoE",
      })
      .run();
    db.insert(macros)
      .values({
        id: "gladiator-leveling-main",
        buildId: "gladiator-leveling",
        name: "Main",
        key: "R",
        delayMs: 10,
        why: "One key",
      })
      .run();
    db.insert(macroSteps)
      .values({
        macroId: "gladiator-leveling-main",
        position: 1,
        skillId: "gladiator-ruinous-blow",
      })
      .run();
    const steps = db
      .select()
      .from(macroSteps)
      .where(eq(macroSteps.macroId, "gladiator-leveling-main"))
      .all();

    // Assert
    expect(steps).toHaveLength(1);
    expect(db.select().from(buildStigmas).all()[0]?.slotLevel).toBe(22);
  });

  it("cascades a build's children when the build is deleted", () => {
    // Arrange
    const db = openDb();
    db.insert(skills)
      .values({ id: "s", class: "chanter", name: "S", kind: "active", unlockLevel: 1 })
      .run();
    db.insert(builds)
      .values({
        id: "b",
        class: "chanter",
        purpose: "pve",
        title: "B",
        why: "w",
        confidence: "theory",
      })
      .run();
    db.insert(buildSkills)
      .values({ buildId: "b", skillId: "s", rank: 1, targetLevel: 5, why: "w" })
      .run();
    db.insert(buildStigmas).values({ buildId: "b", slotLevel: 22, skillId: "s", why: "w" }).run();
    db.insert(macros)
      .values({ id: "m", buildId: "b", name: "M", key: "R", delayMs: 10, why: "w" })
      .run();
    db.insert(macroSteps).values({ macroId: "m", position: 1, skillId: "s" }).run();

    // Act
    const deleted = db.delete(builds).where(eq(builds.id, "b")).run();

    // Assert
    expect(deleted.changes).toBe(1);
    expect(db.select().from(buildSkills).all()).toHaveLength(0);
    expect(db.select().from(buildStigmas).all()).toHaveLength(0);
    expect(db.select().from(macros).all()).toHaveLength(0);
    expect(db.select().from(macroSteps).all()).toHaveLength(0);
  });

  it("stores a finding with no class, meaning it applies to every class", () => {
    // Arrange
    const db = openDb();

    // Act
    const row = db
      .insert(mechanics)
      .values({ title: "Macro delay", body: "b", confidence: "tested", class: null })
      .returning()
      .get();

    // Assert
    expect(row.class).toBeNull();
  });

  it("cascades a snapshot's stigmas, macro chains and their steps when the snapshot is deleted", () => {
    // Arrange
    const db = openDb();
    db.insert(accountSnapshots)
      .values({
        id: "2026-10-10",
        capturedAt: "2026-10-10T08:00:00+02:00",
        character: "C",
        class: "gladiator",
        level: 34,
        unread: [],
      })
      .run();
    db.insert(accountStigmas)
      .values([
        { snapshotId: "2026-10-10", slotLevel: 22, skillName: "Wrath Wave" },
        { snapshotId: "2026-10-10", slotLevel: 27, skillName: null },
      ])
      .run();
    const macro = db
      .insert(accountMacros)
      .values({ snapshotId: "2026-10-10", position: 1, name: "Opener", key: null })
      .returning()
      .get();
    db.insert(accountMacroSteps)
      .values({ macroId: macro.id, position: 1, skillName: "Ruinous Blow" })
      .run();

    // Act
    db.delete(accountSnapshots).run();

    // Assert
    expect(db.select().from(accountStigmas).all()).toHaveLength(0);
    expect(db.select().from(accountMacros).all()).toHaveLength(0);
    expect(db.select().from(accountMacroSteps).all()).toHaveLength(0);
  });

  it("refuses a stigma slot filled twice in one snapshot", () => {
    // Arrange
    const db = openDb();
    db.insert(accountSnapshots)
      .values({
        id: "s",
        capturedAt: "2026-10-10T08:00:00+02:00",
        character: "C",
        class: "gladiator",
        level: 34,
        unread: [],
      })
      .run();
    db.insert(accountStigmas).values({ snapshotId: "s", slotLevel: 22, skillName: "A" }).run();

    // Act & Assert
    expect(() =>
      db.insert(accountStigmas).values({ snapshotId: "s", slotLevel: 22, skillName: "B" }).run(),
    ).toThrow();
  });
});
