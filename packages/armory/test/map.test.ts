import { describe, expect, it } from "vitest";
import { MapError, toSnapshot } from "../src/map";
import { baon, gameRead } from "./helpers";

const AT = "2026-10-11T09:00:00+02:00";

/**
 * Narrows the captured info response to the fields a test edits.
 *
 * @param raw - the character data
 * @returns its info response, typed loosely
 */
function info(raw: ReturnType<typeof baon>) {
  return raw.info as {
    profile: Record<string, unknown>;
    stat: { statList: Array<{ type: string; value: number }> };
  };
}

describe("toSnapshot", () => {
  it("maps the captured profile, skills and stigmas exactly", () => {
    // Arrange
    const raw = baon();

    // Act
    const snapshot = toSnapshot(raw, null, AT);

    // Assert
    expect(snapshot).toEqual({
      schema: "aion-account-snapshot/1",
      capturedAt: AT,
      character: {
        name: "Baon",
        class: "cleric",
        level: 36,
        gearScore: 749,
        server: "Fafnir (EU)",
      },
      skills: [
        { name: "Earth's Retribution", level: 10, slot: null },
        { name: "Judgment Thunder", level: 11, slot: null },
        { name: "Debilitating Mark", level: 10, slot: null },
        { name: "Divine Aura", level: 10, slot: null },
        { name: "Chain of Torment", level: 11, slot: null },
        { name: "Lightning Strike Scattershot", level: 11, slot: null },
        { name: "Light of Regeneration", level: 9, slot: null },
        { name: "Condemnation", level: 10, slot: null },
        { name: "Healing Light", level: 10, slot: null },
        { name: "Radiant Recovery", level: 7, slot: null },
        { name: "Bolt", level: 9, slot: null },
        { name: "Defiance", level: 2, slot: null },
        { name: "Warm Benediction", level: 3, slot: null },
        { name: "Empyrean Lords' Benediction", level: 2, slot: null },
        { name: "Empyrean Lord's Grace", level: 12, slot: null },
        { name: "Healing Enhancement", level: 2, slot: null },
        { name: "Immortal Veil", level: 2, slot: null },
        { name: "Heal Block", level: 2, slot: null },
        { name: "Prayer of Concentration", level: 2, slot: null },
        { name: "Earth's Grace", level: 11, slot: null },
        { name: "Survival Willpower", level: 2, slot: null },
        { name: "Radiant Benediction", level: 3, slot: null },
        { name: "Power Burst", level: 0, slot: null },
        { name: "Prayer of Amplification", level: 3, slot: null },
        { name: "Earth Punishment", level: 4, slot: null },
        { name: "Voice of Doom", level: 0, slot: null },
        { name: "Noble Aura", level: 6, slot: null },
      ],
      stigmas: [
        { slotLevel: 22, name: "Prayer of Amplification" },
        { slotLevel: 27, name: "Earth Punishment" },
        { slotLevel: 32, name: "Noble Aura" },
        { slotLevel: 37, name: null },
      ],
      macros: [],
      screens: [],
      unread: [
        "Stigma slot levels: not published; kept from the last read, new ones fill open slots in list order",
        "Voice of Doom: equipped in official data, no open slot",
        "Macros, hotbar slots: not published, never read in game",
      ],
    });
  });

  it("puts a missing item level in unread[] and leaves the gear score empty", () => {
    // Arrange
    const raw = baon();
    const stat = info(raw).stat;
    stat.statList = stat.statList.filter((row) => row.type !== "ItemLevel");

    // Act
    const snapshot = toSnapshot(raw, null, AT);

    // Assert
    expect(snapshot.character.gearScore).toBeNull();
    expect(snapshot.unread).toContain("Item level: missing from official data");
  });

  it("puts a missing server name in unread[] and leaves the server empty", () => {
    // Arrange
    const raw = baon();
    delete info(raw).profile.serverName;

    // Act
    const snapshot = toSnapshot(raw, null, AT);

    // Assert
    expect(snapshot.character.server).toBeNull();
    expect(snapshot.unread).toContain("Server: missing from official data");
  });

  it("carries macros, hotbar slots and the game read's notes over from the previous snapshot", () => {
    // Arrange
    const previous = gameRead();

    // Act
    const snapshot = toSnapshot(baon(), previous, AT);

    // Assert
    expect(snapshot.macros).toEqual(previous.macros);
    expect(snapshot.skills.slice(0, 3)).toEqual([
      { name: "Earth's Retribution", level: 10, slot: "R" },
      { name: "Judgment Thunder", level: 11, slot: "T·3" },
      { name: "Debilitating Mark", level: 10, slot: "T·1" },
    ]);
    expect(snapshot.unread).toEqual([
      "Stigma slot levels: not published; kept from the last read, new ones fill open slots in list order",
      "Voice of Doom: padlocked in game, equipped at Lv 0 in official data",
      "Macros, hotbar slots: carried from the last game read",
      "Macro key: Settings not opened",
      "Specialization picks",
      "Presets 2 and 3",
      "Character window: name, level, gear from official data",
    ]);
  });

  it("keeps each stigma in the slot the previous snapshot had it in", () => {
    // Arrange
    const previous = gameRead();
    previous.stigmas = [
      { slotLevel: 22, name: "Noble Aura" },
      { slotLevel: 27, name: null },
      { slotLevel: 32, name: "Prayer of Amplification" },
      { slotLevel: 37, name: null },
    ];

    // Act
    const snapshot = toSnapshot(baon(), previous, AT);

    // Assert
    expect(snapshot.stigmas).toEqual([
      { slotLevel: 22, name: "Noble Aura" },
      { slotLevel: 27, name: "Earth Punishment" },
      { slotLevel: 32, name: "Prayer of Amplification" },
      { slotLevel: 37, name: null },
    ]);
  });

  it("maps to the same snapshot when synced again from its own output", () => {
    // Arrange
    const first = toSnapshot(baon(), gameRead(), AT);

    // Act
    const second = toSnapshot(baon(), first, "2026-10-12T09:00:00+02:00");

    // Assert
    expect({ ...second, capturedAt: AT }).toEqual(first);
  });

  it("throws naming the field when the character's level is missing", () => {
    // Arrange
    const raw = baon();
    delete info(raw).profile.characterLevel;

    // Act & Assert
    expect(() => toSnapshot(raw, null, AT)).toThrow(/info\.profile\.characterLevel/);
  });

  it("throws on a class the logbook doesn't know", () => {
    // Arrange
    const raw = baon();
    info(raw).profile.className = "Bard";

    // Act & Assert
    expect(() => toSnapshot(raw, null, AT)).toThrow(MapError);
  });
});
