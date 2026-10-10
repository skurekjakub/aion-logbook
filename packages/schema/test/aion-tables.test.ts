import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { migrationsFolder } from "../src/migrations-path";
import { buildSkills, buildStigmas, builds, macroSteps, macros, skills } from "../src";

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

    // Act
    db.delete(builds).where(eq(builds.id, "b")).run();

    // Assert
    expect(db.select().from(buildSkills).all()).toHaveLength(0);
  });
});
