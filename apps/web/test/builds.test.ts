import { describe, expect, it } from "vitest";
import type { SnapshotShape } from "../src/lib/builds";
import { readCharacter } from "../src/lib/builds";

/** A gladiator snapshot as `/api/account` sends it, with a filled, an empty and an unresolved stigma slot. */
const SNAPSHOT: SnapshotShape = {
  class: "gladiator",
  level: 34,
  skills: [
    { skillId: "gladiator-ruinous-blow", level: 8 },
    { skillId: "gladiator-sever", level: null },
    { skillId: null, level: 2 },
  ],
  stigmas: [
    { slotLevel: 22, name: "Wrath Wave", skillId: "gladiator-wrath-wave" },
    { slotLevel: 27, name: null, skillId: null },
    { slotLevel: 32, name: "Smudged Name", skillId: null },
  ],
};

describe("readCharacter", () => {
  it("maps a filled slot to its skill and an empty slot to null", () => {
    // Act
    const reading = readCharacter(SNAPSHOT, "gladiator");

    // Assert
    expect(reading?.stigmas.get(22)).toBe("gladiator-wrath-wave");
    expect(reading?.stigmas.has(27)).toBe(true);
    expect(reading?.stigmas.get(27)).toBeNull();
  });

  it("leaves out a slot whose stigma name matched no skill", () => {
    // Act
    const reading = readCharacter(SNAPSHOT, "gladiator");

    // Assert
    expect(reading?.stigmas.has(32)).toBe(false);
  });

  it("keys skill levels by resolved skill, keeping a level that wasn't read", () => {
    // Act
    const reading = readCharacter(SNAPSHOT, "gladiator");

    // Assert
    expect(reading?.level).toBe(34);
    expect([...(reading?.skills ?? [])]).toEqual([
      ["gladiator-ruinous-blow", 8],
      ["gladiator-sever", null],
    ]);
  });

  it("reads nothing for another class or without a snapshot", () => {
    // Act
    const otherClass = readCharacter(SNAPSHOT, "chanter");
    const none = readCharacter(null, "gladiator");

    // Assert
    expect(otherClass).toBeNull();
    expect(none).toBeNull();
  });
});
