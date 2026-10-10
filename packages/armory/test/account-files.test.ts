import { describe, expect, it } from "vitest";
import { formatJson } from "../src/account-files";
import { fixtureText, gameRead } from "./helpers";

describe("formatJson", () => {
  it("writes a snapshot the way the hand-written ones read: one line per skill and slot", () => {
    // Arrange
    const snapshot = gameRead();

    // Act
    const text = `${formatJson(snapshot)}\n`;

    // Assert
    expect(text).toBe(fixtureText("snapshot-2026-10-10.json"));
  });

  it("keeps a top-level flat object expanded and empty containers short", () => {
    // Arrange
    const value = { name: "Baon", tags: [], extra: {} };

    // Act
    const text = formatJson(value);

    // Assert
    expect(text).toBe('{\n  "name": "Baon",\n  "tags": [],\n  "extra": {}\n}');
  });
});
