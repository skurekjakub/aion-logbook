import { describe, expect, it } from "vitest";
import { ahkArgs, drive } from "../src/input";
import type { Runner } from "../src/runner";

describe("input", () => {
  it("passes the verb and its arguments to aion.ahk", () => {
    // Act
    const args = ahkArgs("click", ["960", "540"]);
    // Assert
    expect(args.slice(-3)).toEqual(["click", "960", "540"]);
  });

  it("rejects a click outside the 1920×1080 client", () => {
    // Act & Assert
    expect(() => ahkArgs("click", ["1921", "10"])).toThrow("outside the client");
  });

  it("rejects a coordinate that isn't a whole number", () => {
    // Act & Assert
    expect(() => ahkArgs("rclick", ["10.5", "10"])).toThrow("whole number");
  });

  it("checks every point of a drag", () => {
    // Act & Assert
    expect(() => ahkArgs("drag", ["10", "10", "10", "1080"])).toThrow("outside the client");
  });

  it("wants exactly one key string", () => {
    // Act & Assert
    expect(() => ahkArgs("key", [])).toThrow("key takes <keys>");
  });

  it("rejects a scroll of zero notches", () => {
    // Act & Assert
    expect(() => ahkArgs("scroll", ["10", "10", "0"])).toThrow("notches");
  });

  it("runs AutoHotkey with the script and the verb", async () => {
    // Arrange
    const calls: [string, string[]][] = [];
    const run: Runner = (cmd, args) => {
      calls.push([cmd, args]);
      return Promise.resolve({ code: 0, stdout: "" });
    };
    // Act
    await drive("key", ["{Esc}"], { run, ahk: "ahk.exe" });
    // Assert
    expect(calls).toEqual([["ahk.exe", ahkArgs("key", ["{Esc}"])]]);
  });

  it("explains AutoHotkey's exit codes", async () => {
    // Arrange
    const run: Runner = () => Promise.resolve({ code: 2, stdout: "" });
    // Act & Assert
    await expect(drive("focus", [], { run, ahk: "ahk.exe" })).rejects.toThrow(
      "AION2 window not found",
    );
  });
});
