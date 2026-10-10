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
    ["{Click 100 100}", "{Click 100 100}"],
    ["{LButton}", "{LButton}"],
    ["{RButton down}", "{RButton down}"],
    ["{XButton1}", "{XButton1}"],
    ["{WheelDown 3}", "{WheelDown 3}"],
    ["{vk01}", "{vk01}"],
  ])("refuses the mouse through key: %s", (keys, token) => {
    // Act & Assert
    expect(() => ahkArgs("key", [keys])).toThrow(`key refuses ${token}:`);
  });

  it.each([
    ["#r", "#"],
    ["{LWin}", "{LWin}"],
    ["{vk5B}", "{vk5B}"],
    ["{sc15B}", "{sc15B}"],
  ])("refuses the Windows key: %s", (keys, token) => {
    // Act & Assert
    expect(() => ahkArgs("key", [keys])).toThrow(`key refuses ${token}:`);
  });

  it.each([
    ["{Alt down}{F4}{Alt up}", "{Alt down}"],
    ["{vk12 down}{F4}", "{vk12 down}"],
    ["{Alt DownR}", "{Alt DownR}"],
    ["{Ctrl DownTemp}", "{Ctrl DownTemp}"],
    ["{Down down}", "{Down down}"],
    ["{Shift}", "{Shift}"],
  ])("refuses held and bare modifiers: %s", (keys, token) => {
    // Act & Assert
    expect(() => ahkArgs("key", [keys])).toThrow(`key refuses ${token}:`);
  });

  it.each([
    ["{Sleep}", "{Sleep}"],
    ["{Browser_Home}", "{Browser_Home}"],
    ["{Launch_App1}", "{Launch_App1}"],
    ["{Media_Play_Pause}", "{Media_Play_Pause}"],
    ["!{vk73}", "{vk73}"],
    ["{Tab 100}", "{Tab 100}"],
    ["a\tb", "\t"],
    ["{Esc", "{Esc"],
    ["a!", "!"],
  ])("refuses keys outside the menu set: %s", (keys, token) => {
    // Act & Assert
    expect(() => ahkArgs("key", [keys])).toThrow(`key refuses ${token}:`);
  });

  it.each([
    ["!{F4}", "!{F4}"],
    ["!{tab}", "!{tab}"],
    ["!{Esc}", "!{Esc}"],
    ["!{Space}", "!{Space}"],
    ["! ", "! "],
    ["^{Esc}", "^{Esc}"],
    ["^+{Esc}", "^+{Esc}"],
    ["^!{Delete}", "^!{Delete}"],
    ["!^{Del}", "!^{Del}"],
  ])("refuses system chords: %s", (keys, token) => {
    // Act & Assert
    expect(() => ahkArgs("key", [keys])).toThrow(`key refuses ${token}:`);
  });

  it("lets menu keys and plain text through", () => {
    // Arrange
    const keys = [
      "i",
      "7",
      "Darwin",
      "{Esc}",
      "{Enter}",
      "{Tab}",
      "+{Tab}",
      "^{Tab}",
      "^a",
      "!a",
      "{Down 3}",
      "{PgDn}",
      "{Numpad5}",
      "{#}",
      "{{}",
      "{}}",
      ...Array.from({ length: 12 }, (_, i) => `{F${i + 1}}`),
    ];
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
