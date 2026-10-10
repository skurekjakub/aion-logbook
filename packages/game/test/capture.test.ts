import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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

const roots: string[] = [];

/**
 * Makes a temp repo root, removed after the test.
 *
 * @returns its absolute path
 */
function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "aion-game-"));
  roots.push(root);
  return root;
}

/**
 * Writes a frame-sized file where a shot would go, as an earlier shot of the same name would have.
 *
 * @param path - the shot's path
 */
function staleShot(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.alloc(20_000));
}

/**
 * Builds a runner that reports the game as running and answers ffmpeg by writing `bytes` bytes to the
 * output path, its last argument (nothing when `bytes` is 0), then exiting with `code`.
 *
 * @param bytes - size of the file the fake ffmpeg writes
 * @param code - the fake ffmpeg's exit code
 * @returns the fake runner
 */
function fakeGame(bytes: number, code = 0): Runner {
  return (cmd, args) => {
    if (cmd === "ffmpeg" && bytes > 0) writeFileSync(args.at(-1)!, Buffer.alloc(bytes));
    return Promise.resolve({
      code: cmd === "ffmpeg" ? code : 0,
      stdout: cmd === "tasklist" ? RUNNING : "",
    });
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

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
    const root = tempRoot();
    // Act
    const path = await shot({ root, date: "2026-10-10", name: "probe", run: fakeGame(20_000) });
    // Assert
    expect(path).toBe(screenPath(root, "2026-10-10", "probe"));
    expect(existsSync(path)).toBe(true);
  });

  it("rejects a capture too small to be a frame, and deletes it", async () => {
    // Arrange
    const root = tempRoot();
    const path = screenPath(root, "2026-10-10", "probe");
    // Act
    const failure = await shot({
      root,
      date: "2026-10-10",
      name: "probe",
      run: fakeGame(100),
    }).then(
      () => null,
      (err: unknown) => err,
    );
    // Assert
    expect(String(failure)).toContain("capture came back empty");
    expect(existsSync(path)).toBe(false);
  });

  it("never passes off an earlier shot of the same name as the new one", async () => {
    // Arrange
    const root = tempRoot();
    const path = screenPath(root, "2026-10-10", "probe");
    staleShot(path);
    // Act
    const failure = await shot({ root, date: "2026-10-10", name: "probe", run: fakeGame(0) }).then(
      () => null,
      (err: unknown) => err,
    );
    // Assert
    expect(String(failure)).toContain("capture came back empty");
    expect(existsSync(path)).toBe(false);
  });

  it("deletes what a failing ffmpeg left behind", async () => {
    // Arrange
    const root = tempRoot();
    const path = screenPath(root, "2026-10-10", "probe");
    // Act
    const failure = await shot({
      root,
      date: "2026-10-10",
      name: "probe",
      run: fakeGame(20_000, 1),
    }).then(
      () => null,
      (err: unknown) => err,
    );
    // Assert
    expect(String(failure)).toContain("ffmpeg exited 1");
    expect(existsSync(path)).toBe(false);
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
