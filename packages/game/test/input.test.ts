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

  it.each([
    ["{Click 100 100}", "{Click"],
    ["{LButton}", "LButton"],
    ["{RButton down}", "RButton"],
    ["{MButton}", "MButton"],
    ["{XButton1}", "XButton1"],
    ["{WheelDown 3}", "WheelDown"],
    ["{WheelLeft}", "WheelLeft"],
  ])("refuses the mouse through key: %s", (keys, token) => {
    // Act & Assert
    expect(() => ahkArgs("key", [keys])).toThrow(`key refuses ${token}`);
  });

  it.each([
    ["#r", "#"],
    ["{LWin}", "LWin"],
    ["{RWin down}", "RWin"],
  ])("refuses the Windows key: %s", (keys, token) => {
    // Act & Assert
    expect(() => ahkArgs("key", [keys])).toThrow(`key refuses ${token}`);
  });

  it.each([
    ["!{F4}", "!{F4}"],
    ["!{tab}", "!{tab}"],
    ["^{Esc}", "^{Esc}"],
    ["^!{Delete}", "^!{Delete}"],
    ["!^{Del}", "!^{Del}"],
    ["{Alt down}{F4}{Alt up}", "{Alt down}"],
  ])("refuses system chords: %s", (keys, token) => {
    // Act & Assert
    expect(() => ahkArgs("key", [keys])).toThrow(`key refuses ${token}`);
  });

  it("lets menu keys and a literal # through", () => {
    // Arrange
    const keys = ["i", "{Esc}", "{Enter}", "^a", "+{Tab}", "{#}", "{F1}"];
    // Act
    const built = keys.map((k) => ahkArgs("key", [k]).at(-1));
    // Assert
    expect(built).toEqual(keys);
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

  it("returns what aion.ahk printed", async () => {
    // Arrange
    const run: Runner = () => Promise.resolve({ code: 0, stdout: "nothing to go back to\r\n" });
    // Act
    const printed = await drive("back", [], { run, ahk: "ahk.exe" });
    // Assert
    expect(printed).toBe("nothing to go back to");
  });

  it("leaves AutoHotkey's own exit codes unexplained", async () => {
    // Arrange
    const run: Runner = () => Promise.resolve({ code: 2, stdout: "" });
    // Act & Assert
    await expect(drive("focus", [], { run, ahk: "ahk.exe" })).rejects.toThrow("aion.ahk exited 2");
  });

  it("explains aion.ahk's exit codes", async () => {
    // Arrange
    const run: Runner = () => Promise.resolve({ code: 10, stdout: "" });
    // Act & Assert
    await expect(drive("focus", [], { run, ahk: "ahk.exe" })).rejects.toThrow(
      "AION2 window not found",
    );
  });
});
