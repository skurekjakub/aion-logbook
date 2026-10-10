/**
 * Reads the client by window capture: ffmpeg's `gfxcapture` source grabs the AION2 window through
 * Windows.Graphics.Capture, which works while the window sits behind others, so a shot never takes focus.
 *
 * @module
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, posix } from "node:path";
import type { Runner } from "./runner";

/** The game client's process image name. */
export const GAME_EXE = "AION2.exe";

/** The client area every coordinate is given in. */
export const CLIENT = { width: 1920, height: 1080 } as const;

/** A capture smaller than this is a blank or failed frame, not the client. */
const MIN_SHOT_BYTES = 10_000;

/** A shot name is a single file name: no separators, no leading dot. */
const SHOT_NAME = /^\w[\w.-]*$/;

/** A rectangle in client coordinates. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What `shot` needs: where to file it, under what name, and how to run programs. */
export interface ShotOptions {
  /** Repo root; shots go under its `account/snapshots/screens/`. */
  root: string;
  /** The day's folder, `YYYY-MM-DD`. */
  date: string;
  /** File name without `.png`. */
  name: string;
  run: Runner;
}

/** What `crop` needs on top of a shot's location: the region and the upscale factor. */
export interface CropOptions extends ShotOptions {
  rect: Rect;
  scale: number;
}

/**
 * Builds the ffmpeg arguments that grab one frame of the AION2 window, cursor hidden, into a PNG.
 *
 * @param outPath - where ffmpeg writes the PNG
 * @returns the ffmpeg argument list
 */
export function captureArgs(outPath: string): string[] {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-filter_complex",
    `gfxcapture=window_exe=${GAME_EXE}:capture_cursor=0,hwdownload,format=bgra`,
    "-frames:v",
    "1",
    outPath,
  ];
}

/**
 * Builds the path of a shot: `<root>/account/snapshots/screens/<date>/<name>.png`, with forward slashes.
 *
 * @param root - repo root
 * @param date - the day's folder, `YYYY-MM-DD`
 * @param name - file name without `.png`
 * @returns the shot's path
 * @throws if `name` isn't a plain file name
 */
export function screenPath(root: string, date: string, name: string): string {
  if (!SHOT_NAME.test(name)) throw new Error(`bad shot name "${name}": use letters, digits, . _ -`);
  return posix.join(
    root.replaceAll("\\", "/"),
    "account",
    "snapshots",
    "screens",
    date,
    `${name}.png`,
  );
}

/**
 * Formats a moment as the local calendar day, `YYYY-MM-DD`.
 *
 * @param d - the moment
 * @returns the local date
 */
export function localDate(d: Date): string {
  const [month, day] = [d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0"));
  return `${d.getFullYear()}-${month!}-${day!}`;
}

/**
 * Asks `tasklist` whether the game client is running.
 *
 * @param run - process runner
 * @returns whether an `AION2.exe` process exists
 */
export async function isGameRunning(run: Runner): Promise<boolean> {
  const { stdout } = await run("tasklist", ["/FI", `IMAGENAME eq ${GAME_EXE}`, "/NH"]);
  return stdout.toLowerCase().includes(GAME_EXE.toLowerCase());
}

/**
 * Runs ffmpeg and checks it wrote an image. The output is deleted first, so an earlier file of the same name
 * can't pass for the new one, and deleted again on failure, so a failed capture leaves nothing behind.
 *
 * @param run - process runner
 * @param args - ffmpeg arguments, the output path last
 * @param out - the output path, checked for size afterwards
 * @param minBytes - the file must be larger than this
 * @throws if ffmpeg exits non-zero, or the file is missing or not larger than `minBytes`
 */
async function ffmpeg(run: Runner, args: string[], out: string, minBytes: number): Promise<void> {
  rmSync(out, { force: true });
  try {
    const { code, stderr } = await run("ffmpeg", args);
    if (code !== 0) throw new Error(`ffmpeg exited ${code}: ${(stderr ?? "").trim()}`);
    const bytes = existsSync(out) ? statSync(out).size : 0;
    if (bytes <= minBytes) throw new Error(`capture came back empty: ${out} (${bytes} B)`);
  } catch (err) {
    rmSync(out, { force: true });
    throw err;
  }
}

/**
 * Captures the AION2 window into the day's screens folder.
 *
 * @param opts - where to file the shot and how to run programs
 * @returns the PNG's path
 * @throws if the game isn't running, ffmpeg fails, or the capture is empty
 */
export async function shot(opts: ShotOptions): Promise<string> {
  const out = screenPath(opts.root, opts.date, opts.name);
  if (!(await isGameRunning(opts.run))) throw new Error(`${GAME_EXE} is not running`);
  mkdirSync(dirname(out), { recursive: true });
  await ffmpeg(opts.run, captureArgs(out), out, MIN_SHOT_BYTES);
  return out;
}

/**
 * Reads a PNG's pixel size from its IHDR chunk.
 *
 * @param png - the file's bytes (the first 24 are enough)
 * @returns width and height in pixels
 * @throws if the bytes don't start with a PNG signature and IHDR chunk
 */
export function pngSize(png: Buffer): { width: number; height: number } {
  if (
    png.length < 24 ||
    png.readUInt32BE(0) !== 0x89504e47 ||
    png.toString("latin1", 12, 16) !== "IHDR"
  )
    throw new Error("not a PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/**
 * Reads a PNG file's pixel size.
 *
 * @param path - the PNG
 * @returns width and height in pixels
 * @throws if the file can't be read or isn't a PNG
 */
export function pngFileSize(path: string): { width: number; height: number } {
  return pngSize(readFileSync(path));
}

/**
 * Throws unless `rect` lies inside the client.
 *
 * @param rect - the region
 * @throws if any edge falls outside the client or the size isn't positive
 */
function checkRect({ x, y, w, h }: Rect): void {
  const whole = [x, y, w, h].every((n) => Number.isInteger(n));
  if (!whole || x < 0 || y < 0 || w < 1 || h < 1 || x + w > CLIENT.width || y + h > CLIENT.height)
    throw new Error(
      `crop ${x},${y} ${w}×${h} is outside the client (${CLIENT.width}×${CLIENT.height})`,
    );
}

/**
 * Builds the ffmpeg arguments that cut a region out of a shot and scale it up, so small UI text reads.
 *
 * @param input - the source PNG
 * @param out - where the crop goes
 * @param rect - the region, in client pixels
 * @param scale - upscale factor
 * @returns the ffmpeg argument list
 * @throws if the region falls outside the client or `scale` isn't positive
 */
export function cropArgs(input: string, out: string, rect: Rect, scale: number): string[] {
  checkRect(rect);
  if (!(scale > 0)) throw new Error(`scale must be positive, got ${scale}`);
  const { x, y, w, h } = rect;
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    input,
    "-vf",
    `crop=${w}:${h}:${x}:${y},scale=iw*${scale}:ih*${scale}:flags=lanczos`,
    out,
  ];
}

/**
 * Cuts a region out of an existing shot into `<name>-crop-<x>-<y>-<w>-<h>.png` beside it.
 *
 * @param opts - the shot's location, the region and the upscale factor
 * @returns the crop's path
 * @throws if the shot doesn't exist, the region is outside the client, or ffmpeg fails or writes nothing
 */
export async function crop(opts: CropOptions): Promise<string> {
  const { x, y, w, h } = opts.rect;
  const input = screenPath(opts.root, opts.date, opts.name);
  const out = screenPath(opts.root, opts.date, `${opts.name}-crop-${x}-${y}-${w}-${h}`);
  if (!existsSync(input)) throw new Error(`no shot at ${input}; take it with \`pnpm game shot\``);
  await ffmpeg(opts.run, cropArgs(input, out, opts.rect, opts.scale), out, 0);
  return out;
}

/**
 * Names the shot taken after an input: `<n>-after-<verb>`, with `n` one past the day's highest.
 *
 * @param existing - file names already in the day's folder
 * @param verb - the input verb just sent
 * @returns the shot name, without `.png`
 */
export function nextAfterName(existing: string[], verb: string): string {
  const taken = existing.map((f) => /^(\d+)-after-/.exec(f)?.[1]).filter((n) => n != null);
  const n = Math.max(0, ...taken.map(Number)) + 1;
  return `${String(n).padStart(3, "0")}-after-${verb}`;
}
