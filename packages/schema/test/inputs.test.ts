import { describe, expect, it } from "vitest";
import { accountSnapshotFile, buildInput, macroInput, mechanicInput, skillPatch } from "../src";

const macro = {
  id: "m",
  name: "Main",
  key: "R",
  delayMs: 10,
  why: "w",
  steps: [{ skillId: "a" }, { skillId: "b" }],
};

const build = {
  id: "b",
  class: "gladiator",
  purpose: "pve",
  title: "T",
  why: "w",
  confidence: "theory",
  skills: [],
  stigmas: [],
  macros: [],
  sources: [],
};

describe("aion inputs", () => {
  it("numbers macro steps in the given order", () => {
    // Act
    const parsed = macroInput.parse(macro);

    // Assert
    expect(parsed.steps.map((s) => s.position)).toEqual([1, 2]);
  });

  it("numbers macro steps from the list order, ignoring positions the caller gives", () => {
    // Arrange
    const steps = [
      { skillId: "a", position: 1 },
      { skillId: "b", position: 1 },
    ];

    // Act
    const parsed = macroInput.parse({ ...macro, steps });

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
    const skills = [
      { skillId: "a", rank: 1, targetLevel: 5, why: "w" },
      { skillId: "b", rank: 1, targetLevel: 5, why: "w" },
    ];

    // Act
    const result = buildInput.safeParse({ ...build, skills });

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejects a build that fills a stigma slot twice, naming the build", () => {
    // Arrange
    const stigmas = [
      { slotLevel: 22, skillId: "a", why: "w" },
      { slotLevel: 22, skillId: "b", why: "w" },
    ];

    // Act
    const result = buildInput.safeParse({ ...build, stigmas });

    // Assert
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("build b fills a stigma slot twice");
  });

  it("rejects a build whose macro ids repeat, naming the build and the id", () => {
    // Arrange
    const macros = [macro, { ...macro, name: "Other" }];

    // Act
    const result = buildInput.safeParse({ ...build, macros });

    // Assert
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("build b repeats macro id m");
  });

  it("leaves sources out of a skill patch that doesn't give them", () => {
    // Act
    const patch = skillPatch.parse({ name: "X" });

    // Assert
    expect(patch).toEqual({ name: "X" });
    expect("sources" in patch).toBe(false);
  });

  it("accepts a mechanic with no class, meaning it applies to every class", () => {
    // Arrange
    const writeup = { title: "Macro delay", body: "b", confidence: "tested", sources: ["web:x"] };

    // Act
    const withoutClass = mechanicInput.safeParse(writeup);
    const withNullClass = mechanicInput.safeParse({ ...writeup, class: null });

    // Assert
    expect(withoutClass.success).toBe(true);
    expect(withNullClass.success).toBe(true);
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
