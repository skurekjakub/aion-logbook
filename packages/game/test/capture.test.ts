import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  captureArgs,
  cropArgs,
  isGameRunning,
  nextAfterName,
  pngSize,
  screenPath,
  shot,
} from "../src/capture";
import type { Runner } from "../src/runner";

const RUNNING = "AION2.exe                    12345 Console                    1  4,200,000 K";

/**
 * Builds a runner that reports the game as running and answers ffmpeg by writing `bytes` bytes to the
 * output path, its last argument.
 *
 * @param bytes - size of the file the fake ffmpeg writes
 * @returns the fake runner
 */
function fakeGame(bytes: number): Runner {
  return (cmd, args) => {
    if (cmd === "ffmpeg") writeFileSync(args.at(-1)!, Buffer.alloc(bytes));
    return Promise.resolve({ code: 0, stdout: cmd === "tasklist" ? RUNNING : "" });
  };
}

describe("capture", () => {
  it("captures the AION2 window through gfxcapture, without the cursor", () => {
    // Act
    const args = captureArgs("out.png");
    // Assert
    expect(args).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-filter_complex",
      "gfxcapture=window_exe=AION2.exe:capture_cursor=0,hwdownload,format=bgra",
      "-frames:v",
      "1",
      "out.png",
    ]);
  });

  it("files a shot under the day's screens folder", () => {
    // Act
    const path = screenPath("/r", "2026-10-10", "skills");
    // Assert
    expect(path).toBe("/r/account/snapshots/screens/2026-10-10/skills.png");
  });

  it("refuses a shot name that would leave the day's folder", () => {
    // Act & Assert
    expect(() => screenPath("/r", "2026-10-10", "../x")).toThrow("bad shot name");
  });

  it("sees the game in the task list", async () => {
    // Arrange
    const run: Runner = () => Promise.resolve({ code: 0, stdout: RUNNING });
    // Act
    const running = await isGameRunning(run);
    // Assert
    expect(running).toBe(true);
  });

  it("refuses to shoot when the game isn't running", async () => {
    // Arrange
    const run: Runner = () => Promise.resolve({ code: 0, stdout: "INFO: No tasks are running" });
    // Act & Assert
    await expect(shot({ root: "/r", date: "2026-10-10", name: "x", run })).rejects.toThrow(
      "AION2.exe is not running",
    );
  });

  it("writes the shot and returns its path", async () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), "aion-game-"));
    // Act
    const path = await shot({ root, date: "2026-10-10", name: "probe", run: fakeGame(20_000) });
    // Assert
    expect(path).toBe(screenPath(root, "2026-10-10", "probe"));
    expect(existsSync(path)).toBe(true);
  });

  it("rejects a capture too small to be a frame", async () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), "aion-game-"));
    // Act & Assert
    await expect(
      shot({ root, date: "2026-10-10", name: "probe", run: fakeGame(100) }),
    ).rejects.toThrow("capture came back empty");
  });

  it("reads a PNG's size from its header", () => {
    // Arrange
    const png = Buffer.alloc(24);
    png.write("\x89PNG\r\n\x1a\n", 0, "latin1");
    png.write("IHDR", 12, "latin1");
    png.writeUInt32BE(1920, 16);
    png.writeUInt32BE(1080, 20);
    // Act
    const size = pngSize(png);
    // Assert
    expect(size).toEqual({ width: 1920, height: 1080 });
  });

  it("crops a region and scales it up for reading", () => {
    // Act
    const args = cropArgs("in.png", "out.png", { x: 10, y: 20, w: 300, h: 40 }, 2);
    // Assert
    expect(args).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      "in.png",
      "-vf",
      "crop=300:40:10:20,scale=iw*2:ih*2:flags=lanczos",
      "out.png",
    ]);
  });

  it("rejects a crop that runs off the client", () => {
    // Act & Assert
    expect(() => cropArgs("in.png", "out.png", { x: 1900, y: 0, w: 40, h: 40 }, 1)).toThrow(
      "outside the client",
    );
  });

  it("numbers after-shots past the day's highest", () => {
    // Arrange
    const existing = ["probe.png", "001-after-key.png", "007-after-click.png"];
    // Act
    const name = nextAfterName(existing, "drag");
    // Assert
    expect(name).toBe("008-after-drag");
  });
});
