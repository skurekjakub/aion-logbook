import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { builds, citations, macroSteps, macros, skills } from "@aion/schema";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDb } from "../src/db/client";

/**
 * Inserts a skill, a build and a macro chain whose one step names the skill.
 *
 * @param db - the database to write to
 */
function seedChain(db: ReturnType<typeof openDb>): void {
  db.insert(skills)
    .values({ id: "gladiator-a", class: "gladiator", name: "A", kind: "active", unlockLevel: 1 })
    .run();
  db.insert(builds)
    .values({
      id: "b",
      class: "gladiator",
      purpose: "pve",
      title: "t",
      why: "w",
      confidence: "theory",
    })
    .run();
  db.insert(macros)
    .values({ id: "m", buildId: "b", name: "n", key: "R", delayMs: 0, why: "w" })
    .run();
  db.insert(macroSteps).values({ macroId: "m", position: 1, skillId: "gladiator-a" }).run();
}

describe("openDb", () => {
  it("migrates every table into a fresh in-memory database", () => {
    // Act
    const db = openDb(":memory:");

    // Assert
    const names = db
      .all<{ name: string }>(sql`select name from sqlite_master where type = 'table'`)
      .map((row) => row.name);
    for (const table of ["skills", "builds", "macro_steps", "research_records", "citations"]) {
      expect(names).toContain(table);
    }
  });

  it("keeps foreign keys on, in memory and on disk", () => {
    // Arrange
    const dir = mkdtempSync(join(tmpdir(), "aion-db-"));

    // Act
    const memory = openDb(":memory:");
    const file = openDb(join(dir, "aion.db"));

    // Assert
    expect(memory.get<{ foreign_keys: number }>(sql`pragma foreign_keys`)).toEqual({
      foreign_keys: 1,
    });
    expect(file.get<{ foreign_keys: number }>(sql`pragma foreign_keys`)).toEqual({
      foreign_keys: 1,
    });
    (file as unknown as { $client: { close(): void } }).$client.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses a citation of an unknown source", () => {
    // Arrange
    const db = openDb(":memory:");

    // Act & Assert
    expect(() =>
      db
        .insert(citations)
        .values({ entity: "build", entityId: "b", sourceId: "web:missing" })
        .run(),
    ).toThrow();
  });

  it("refuses a macro step naming an unknown skill", () => {
    // Arrange
    const db = openDb(":memory:");
    seedChain(db);

    // Act & Assert
    expect(() =>
      db.insert(macroSteps).values({ macroId: "m", position: 2, skillId: "gladiator-nope" }).run(),
    ).toThrow();
  });

  it("cascades a build's delete to its macro chains and their steps", () => {
    // Arrange
    const db = openDb(":memory:");
    seedChain(db);

    // Act
    db.delete(builds).run();

    // Assert
    expect(db.select().from(macros).all()).toEqual([]);
    expect(db.select().from(macroSteps).all()).toEqual([]);
  });
});
