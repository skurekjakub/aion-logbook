/**
 * Thin wrappers over the external `yt-dlp` and `ffmpeg` binaries, for what
 * the retired `frames.py`, `sheet.py` and `subs.py` did with PyAV and
 * Pillow: download a video, save scene-change frames from a time window,
 * tile cropped frames into contact sheets, and tile a subtitle band's
 * changes. Every file written gets its ledger line. The binaries must be on
 * `PATH`.
 *
 * @module
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CaptureContext } from "./context";
import { exists, logCapture } from "./context";

/** A binary's run: its exit status and captured output. */
export interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/**
 * Runs an external binary to completion.
 *
 * @param command - the binary's name, found on `PATH`
 * @param args - its arguments
 * @returns its exit status and output
 * @throws if the binary can't be started (not installed, not on `PATH`)
 */
export function run(command: string, args: readonly string[]): RunResult {
  const result = spawnSync(command, args, { encoding: "utf-8", maxBuffer: 256 * 1024 * 1024 });
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

/**
 * Runs a binary and fails unless it exits 0.
 *
 * @param command - the binary's name
 * @param args - its arguments
 * @returns its output
 * @throws naming the binary and the tail of its stderr, if it exits non-zero or can't start
 */
function runOk(command: string, args: readonly string[]): RunResult {
  const result = run(command, args);
  if (result.status !== 0) {
    throw new Error(`${command} exited ${result.status}: ${result.stderr.slice(-2000)}`);
  }
  return result;
}

/**
 * Builds `yt-dlp`'s arguments for one video.
 *
 * @param url - the watch URL
 * @param outTemplate - the output path template, e.g. `<dir>/<id>.%(ext)s`
 * @returns the arguments
 */
export function ytDlpArgs(url: string, outTemplate: string): string[] {
  return ["--no-playlist", "--no-progress", "-o", outTemplate, url];
}

/**
 * Runs `yt-dlp` to completion.
 *
 * @param args - its arguments
 * @throws if it can't start or exits non-zero
 */
export type YtDlp = (args: readonly string[]) => void;

/**
 * Runs the `yt-dlp` on `PATH`.
 *
 * @param args - its arguments
 * @throws if it can't start or exits non-zero
 */
const runYtDlp: YtDlp = (args) => {
  runOk("yt-dlp", args);
};

/**
 * Reports whether a file name is a finished download of a video:
 * `<id>.<ext>`, as the output template names it, and not one of yt-dlp's
 * leftovers (`.part`, `.ytdl`, a `.fNNN.` format stream, a `.temp.` merge).
 *
 * @param vid - the video id
 * @param name - the file name
 * @returns `true` for a finished download
 */
function isFinished(vid: string, name: string): boolean {
  if (!name.startsWith(`${vid}.`)) return false;
  const ext = name.slice(vid.length + 1);
  return /^[A-Za-z0-9]+$/.test(ext) && ext !== "part" && ext !== "ytdl";
}

/**
 * Downloads each video with `yt-dlp` as `<outdir>/<id>.<ext>`, each file
 * with a ledger line (tool `yt-dlp`). A video with a finished download
 * already there is skipped; leftovers of an earlier failed run don't
 * count. A failed run deletes every file under the video's name, and a
 * successful one the leftovers beside its download, so nothing is left
 * without a ledger line.
 *
 * @param context - the run
 * @param outdir - the record-relative folder, under `evidence/`
 * @param vids - the video ids
 * @param ytDlp - runs yt-dlp; the one on `PATH` unless a test passes another
 * @returns the record-relative paths written
 * @throws if `yt-dlp` fails or a ledger line can't be written
 */
export function downloadVideos(
  context: CaptureContext,
  outdir: string,
  vids: readonly string[],
  ytDlp: YtDlp = runYtDlp,
): string[] {
  const dir = join(context.recordDir, outdir);
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  for (const vid of vids) {
    /**
     * Lists the files in the folder named for this video.
     *
     * @returns their names
     */
    const files = () => readdirSync(dir).filter((name) => name.startsWith(`${vid}.`));
    if (files().some((name) => isFinished(vid, name))) {
      context.log(`skip ${vid}: already downloaded`);
      continue;
    }
    const url = `https://www.youtube.com/watch?v=${vid}`;
    const at = context.now();
    try {
      ytDlp(ytDlpArgs(url, join(dir, `${vid}.%(ext)s`)));
    } catch (err) {
      for (const name of files()) rmSync(join(dir, name), { force: true });
      throw err;
    }
    for (const name of files()) {
      if (!isFinished(vid, name)) rmSync(join(dir, name), { force: true });
    }
    for (const name of files()) {
      const path = `${outdir}/${name}`;
      appendAs(context, path, url, at, "yt-dlp");
      written.push(path);
    }
  }
  return written;
}

/**
 * Appends a ledger line under another tool than the run's.
 *
 * @param context - the run
 * @param path - the record-relative path
 * @param url - the source URL, or `null`
 * @param at - the capture time
 * @param tool - the tool to record
 */
function appendAs(
  context: CaptureContext,
  path: string,
  url: string | null,
  at: Date,
  tool: string,
): void {
  logCapture({ ...context, tool }, path, url, at);
}

/** A scene-change frame extraction. */
export interface FramesSpec {
  /** The video file, absolute. */
  video: string;
  /** Window start, in seconds. */
  t0: number;
  /** Window end, in seconds. */
  t1: number;
  /** Seconds between sampled frames. */
  step: number;
  /** Scene-change threshold on `frames.py`'s 0–255 mean-difference scale. */
  threshold: number;
}

/**
 * Builds `ffmpeg`'s arguments for a frame extraction: sample every `step`
 * seconds of the window, keep the first sample and every one whose scene
 * score passes the threshold, and log each kept frame's time.
 *
 * @param spec - the window, step and threshold
 * @param outPattern - the numbered output pattern, e.g. `<tmp>/f-%05d.jpg`
 * @returns the arguments
 */
export function framesArgs(spec: FramesSpec, outPattern: string): string[] {
  const score = (spec.threshold / 255).toFixed(4);
  return [
    "-hide_banner",
    "-ss",
    String(spec.t0),
    "-t",
    String(spec.t1 - spec.t0),
    "-i",
    spec.video,
    "-vf",
    `fps=1/${spec.step},select='eq(n\\,0)+gt(scene\\,${score})',showinfo`,
    // ffmpeg 9 rejects `-vsync`; `-fps_mode` replaced it in ffmpeg 5.1.
    "-fps_mode",
    "vfr",
    "-q:v",
    "3",
    outPattern,
  ];
}

/**
 * Names a frame as `frames.py` did: the prefix and its time in the video.
 *
 * @param prefix - the file name prefix
 * @param t - the frame's time, in seconds
 * @returns `<prefix>-<MM>m<SS.S>s.jpg`, e.g. `p-01m05.0s.jpg`
 */
export function frameName(prefix: string, t: number): string {
  const minutes = String(Math.floor(t / 60)).padStart(2, "0");
  const seconds = (t % 60).toFixed(1).padStart(4, "0");
  return `${prefix}-${minutes}m${seconds}s.jpg`;
}

/**
 * Reads the kept frames' times from `ffmpeg`'s `showinfo` log.
 *
 * @param stderr - ffmpeg's stderr
 * @returns each frame's `pts_time`, in output order
 */
export function showinfoTimes(stderr: string): number[] {
  return [...stderr.matchAll(/Parsed_showinfo.*?pts_time:\s*([\d.]+)/g)].map((m) => Number(m[1]));
}

/**
 * Saves the scene-change frames of a video's window as
 * `<outdir>/<prefix>-<MM>m<SS.S>s.jpg`, each with a ledger line (`url`
 * null: a frame is derived from the video).
 *
 * @param context - the run
 * @param outdir - the record-relative folder, under `evidence/`
 * @param prefix - the frame file name prefix
 * @param spec - the video, window, step and threshold
 * @returns the record-relative paths written
 * @throws if `ffmpeg` fails, a frame's file already exists, or a ledger line can't be written
 */
export function extractFrames(
  context: CaptureContext,
  outdir: string,
  prefix: string,
  spec: FramesSpec,
): string[] {
  const tmp = mkdtempSync(join(tmpdir(), "aion-frames-"));
  try {
    const at = context.now();
    const { stderr } = runOk("ffmpeg", framesArgs(spec, join(tmp, "f-%05d.jpg")));
    const times = showinfoTimes(stderr);
    const frames = readdirSync(tmp).sort();
    mkdirSync(join(context.recordDir, outdir), { recursive: true });
    return frames.map((file, index) => {
      const path = `${outdir}/${frameName(prefix, spec.t0 + (times[index] ?? index * spec.step))}`;
      if (exists(context, path)) throw new Error(`${path} already exists`);
      renameSync(join(tmp, file), join(context.recordDir, path));
      logCapture(context, path, null, at);
      return path;
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** A contact-sheet layout: the crop box and the grid. */
export interface SheetSpec {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cols: number;
  rows: number;
}

/**
 * Builds `ffmpeg`'s arguments for contact sheets: crop every frame of a
 * concat list to the box and tile them `cols` by `rows` per sheet.
 *
 * @param list - the ffconcat file naming the frames
 * @param spec - the crop box and grid
 * @param outPattern - the numbered output pattern, e.g. `<prefix>-%02d.jpg`
 * @returns the arguments
 */
export function sheetArgs(list: string, spec: SheetSpec, outPattern: string): string[] {
  const w = spec.x1 - spec.x0;
  const h = spec.y1 - spec.y0;
  return [
    "-hide_banner",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-vf",
    `crop=${w}:${h}:${spec.x0}:${spec.y0},tile=${spec.cols}x${spec.rows}`,
    "-start_number",
    "0",
    "-q:v",
    "2",
    outPattern,
  ];
}

/**
 * Writes an ffconcat list of image files, one frame each.
 *
 * @param file - where to write the list
 * @param frames - absolute paths of the images, in order
 */
function writeConcatList(file: string, frames: readonly string[]): void {
  const lines = frames.map(
    (f) => `file '${f.replaceAll("\\", "/").replaceAll("'", "'\\''")}'\nduration 1`,
  );
  writeFileSync(file, `ffconcat version 1.0\n${lines.join("\n")}\n`);
}

/**
 * Crops frames to a box and tiles them into contact sheets
 * `<outdir>/<prefix>-NN.jpg`, each with a ledger line (`url` null).
 *
 * @param context - the run
 * @param outdir - the record-relative folder, under `evidence/`
 * @param prefix - the sheet file name prefix
 * @param spec - the crop box and grid
 * @param frames - the frames, record-relative
 * @returns the record-relative paths written
 * @throws if a frame is missing, `ffmpeg` fails, a sheet already exists, or
 *   a ledger line can't be written
 */
export function contactSheets(
  context: CaptureContext,
  outdir: string,
  prefix: string,
  spec: SheetSpec,
  frames: readonly string[],
): string[] {
  const absolute = frames.map((f) => join(context.recordDir, f));
  for (const [index, file] of absolute.entries()) {
    if (!existsSync(file)) throw new Error(`${frames[index]} not found`);
  }
  const tmp = mkdtempSync(join(tmpdir(), "aion-sheet-"));
  try {
    const list = join(tmp, "frames.txt");
    writeConcatList(list, absolute);
    const at = context.now();
    runOk("ffmpeg", sheetArgs(list, spec, join(tmp, "s-%02d.jpg")));
    mkdirSync(join(context.recordDir, outdir), { recursive: true });
    return readdirSync(tmp)
      .filter((f) => f.startsWith("s-"))
      .sort()
      .map((file) => {
        const path = `${outdir}/${prefix}-${file.slice(2)}`;
        if (exists(context, path)) throw new Error(`${path} already exists`);
        renameSync(join(tmp, file), join(context.recordDir, path));
        logCapture(context, path, null, at);
        return path;
      });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** A burned-in subtitle band to follow. */
export interface SubsSpec {
  /** The video file, absolute. */
  video: string;
  /** Band top and bottom, in pixels. */
  y0: number;
  y1: number;
  /** Band left and right, in pixels; the full width when omitted. */
  x0?: number;
  x1?: number;
  /** Seconds between samples. */
  step: number;
}

/**
 * Builds `ffmpeg`'s arguments for subtitle sheets: sample the band every
 * `step` seconds, keep the first sample and every change, scale each to
 * 900 px wide and stack 14 to a sheet, as `subs.py` laid them out.
 *
 * @param spec - the video, band and step
 * @param outPattern - the numbered output pattern, e.g. `<prefix>-%02d.jpg`
 * @returns the arguments
 */
export function subsArgs(spec: SubsSpec, outPattern: string): string[] {
  const x0 = spec.x0 ?? 0;
  const width = spec.x1 === undefined ? `iw-${x0}` : String(spec.x1 - x0);
  const crop = `crop=${width}:${spec.y1 - spec.y0}:${x0}:${spec.y0}`;
  return [
    "-hide_banner",
    "-i",
    spec.video,
    "-vf",
    `fps=1/${spec.step},${crop},select='eq(n\\,0)+gt(scene\\,${(8 / 255).toFixed(4)})',scale=900:-1,tile=1x14`,
    "-fps_mode",
    "vfr",
    "-start_number",
    "0",
    "-q:v",
    "3",
    outPattern,
  ];
}

/**
 * Tiles a video's subtitle-band changes into sheets `<outdir>/<prefix>-NN.jpg`,
 * each with a ledger line (`url` null).
 *
 * @param context - the run
 * @param outdir - the record-relative folder, under `evidence/`
 * @param prefix - the sheet file name prefix
 * @param spec - the video, band and step
 * @returns the record-relative paths written
 * @throws if `ffmpeg` fails, a sheet already exists, or a ledger line can't be written
 */
export function subtitleSheets(
  context: CaptureContext,
  outdir: string,
  prefix: string,
  spec: SubsSpec,
): string[] {
  const tmp = mkdtempSync(join(tmpdir(), "aion-subs-"));
  try {
    const at = context.now();
    runOk("ffmpeg", subsArgs(spec, join(tmp, "s-%02d.jpg")));
    mkdirSync(join(context.recordDir, outdir), { recursive: true });
    return readdirSync(tmp)
      .sort()
      .map((file) => {
        const path = `${outdir}/${prefix}-${file.slice(2)}`;
        if (exists(context, path)) throw new Error(`${path} already exists`);
        renameSync(join(tmp, file), join(context.recordDir, path));
        logCapture(context, path, null, at);
        return path;
      });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
