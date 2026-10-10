import { describe, expect, it } from "vitest";
import { mentionsName } from "../src/services/names";

describe("mentionsName", () => {
  it("finds a name as a whole name, ignoring case and spacing", () => {
    // Act
    const found = mentionsName("Acquire  light of protection (costs 1)", "Light of Protection");
    const inWord = mentionsName("Boltstrike 2 → 3", "Bolt");
    const possessive = mentionsName("Earth's Grace 9 → 10", "Earth");

    // Assert
    expect(found).toBe(true);
    expect(inWord).toBe(false);
    expect(possessive).toBe(false);
  });

  it("doesn't find a name inside a longer known name, but finds it beside one", () => {
    // Arrange
    const known = ["Light", "Healing Light"];

    // Act
    const inside = mentionsName("Healing Light 7 → 8", "Light", known);
    const beside = mentionsName("Healing Light before Light", "Light", known);
    const longer = mentionsName("Healing Light 7 → 8", "Healing Light", known);

    // Assert
    expect(inside).toBe(false);
    expect(beside).toBe(true);
    expect(longer).toBe(true);
  });
});
