import { describe, expect, it } from "vitest";
import { accountSnapshotFile, buildInput, macroInput } from "../src";

const macro = {
  id: "m",
  name: "Main",
  key: "R",
  delayMs: 10,
  why: "w",
  steps: [{ skillId: "a" }, { skillId: "b" }],
};

describe("aion inputs", () => {
  it("numbers macro steps in the given order", () => {
    // Act
    const parsed = macroInput.parse(macro);

    // Assert
    expect(parsed.steps.map((s) => s.position)).toEqual([1, 2]);
  });

  it("rejects a macro with no steps, naming it", () => {
    // Act
    const result = macroInput.safeParse({ ...macro, steps: [] });

    // Assert
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("macro m has no steps");
  });

  it("rejects a build whose skill ranks repeat", () => {
    // Arrange
    const build = {
      id: "b",
      class: "gladiator",
      purpose: "pve",
      title: "T",
      why: "w",
      confidence: "theory",
      skills: [
        { skillId: "a", rank: 1, targetLevel: 5, why: "w" },
        { skillId: "b", rank: 1, targetLevel: 5, why: "w" },
      ],
      stigmas: [],
      macros: [],
      sources: [],
    };

    // Act
    const result = buildInput.safeParse(build);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepts a minimal account snapshot document", () => {
    // Arrange
    const doc = {
      schema: "aion-account-snapshot/1",
      capturedAt: "2026-10-10T08:00:00+02:00",
      character: { name: "Baon", class: "gladiator", level: 34, gearScore: 615, server: null },
      skills: [],
      stigmas: [],
      macros: [],
      screens: [],
      unread: ["server"],
    };

    // Act
    const parsed = accountSnapshotFile.parse(doc);

    // Assert
    expect(parsed.character.level).toBe(34);
  });
});
