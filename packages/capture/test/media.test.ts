import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readLedger, verifyLedger } from "../src/ledger";
import type { YtDlp } from "../src/media";
import {
  downloadVideos,
  frameName,
  framesArgs,
  sheetArgs,
  showinfoTimes,
  subsArgs,
  ytDlpArgs,
} from "../src/media";
import { fakeFetch, testContext } from "./helpers";

/**
 * Builds a stand-in for yt-dlp that writes the files it's given under the
 * output template's name, then fails if told to.
 *
 * @param exts - the extensions to write, e.g. `mp4` or `mp4.part`
 * @param fail - whether to exit non-zero after writing
 * @returns the stand-in and the argument lists it was called with
 */
function fakeYtDlp(exts: string[], fail = false): { ytDlp: YtDlp; calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    ytDlp: (args) => {
      calls.push([...args]);
      const template = args[args.indexOf("-o") + 1]!;
      for (const ext of exts) writeFileSync(template.replace("%(ext)s", ext), ext);
      if (fail) throw new Error("yt-dlp exited 1");
    },
  };
}

describe("yt-dlp downloads", () => {
  it("downloads over a failed run's leftovers, clears them, and logs only the finished file", () => {
    const { context } = testContext(fakeFetch([]), "capture:youtube");
    const dir = join(context.recordDir, "evidence/yt");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "abc.mp4.part"), "partial");
    writeFileSync(join(dir, "abc.f137.mp4"), "stream");
    const { ytDlp } = fakeYtDlp(["mp4", "mp4.ytdl"]);
    expect(downloadVideos(context, "evidence/yt", ["abc"], ytDlp)).toEqual(["evidence/yt/abc.mp4"]);
    expect(readdirSync(dir)).toEqual(["abc.mp4"]);
    expect(readLedger(context.recordDir)[0]!.line).toMatchObject({
      url: "https://www.youtube.com/watch?v=abc",
      tool: "yt-dlp",
    });
    expect(verifyLedger(context.recordDir)).toEqual([]);

    const again = fakeYtDlp(["mp4"]);
    expect(downloadVideos(context, "evidence/yt", ["abc"], again.ytDlp)).toEqual([]);
    expect(again.calls).toEqual([]);
  });

  it("leaves nothing behind when yt-dlp fails", () => {
    const { context } = testContext(fakeFetch([]), "capture:youtube");
    const { ytDlp } = fakeYtDlp(["mp4.part", "webm"], true);
    expect(() => downloadVideos(context, "evidence/yt", ["abc"], ytDlp)).toThrow(/exited 1/);
    expect(readdirSync(join(context.recordDir, "evidence/yt"))).toEqual([]);
    expect(readLedger(context.recordDir)).toEqual([]);
  });
});

describe("yt-dlp and ffmpeg wrappers", () => {
  it("names frames as frames.py did", () => {
    expect(frameName("p", 65)).toBe("p-01m05.0s.jpg");
    expect(frameName("run", 5.26)).toBe("run-00m05.3s.jpg");
    expect(frameName("run", 600.5)).toBe("run-10m00.5s.jpg");
  });

  it("reads kept frames' times from showinfo", () => {
    const log = [
      "[Parsed_showinfo_2 @ 0x1] n:   0 pts:      0 pts_time:0       duration:1",
      "[Parsed_showinfo_2 @ 0x1] n:   1 pts:     12 pts_time:6.5     duration:1",
    ].join("\n");
    expect(showinfoTimes(log)).toEqual([0, 6.5]);
  });

  it("builds the ffmpeg and yt-dlp command lines", () => {
    expect(ytDlpArgs("https://www.youtube.com/watch?v=x", "d/x.%(ext)s")).toEqual([
      "--no-playlist",
      "--no-progress",
      "-o",
      "d/x.%(ext)s",
      "https://www.youtube.com/watch?v=x",
    ]);
    const frames = framesArgs(
      { video: "v.mp4", t0: 10, t1: 40, step: 0.5, threshold: 6 },
      "f-%05d.jpg",
    );
    expect(frames.slice(1, 7)).toEqual(["-ss", "10", "-t", "30", "-i", "v.mp4"]);
    expect(frames[frames.indexOf("-vf") + 1]).toBe(
      "fps=1/0.5,select='eq(n\\,0)+gt(scene\\,0.0235)',showinfo",
    );
    const sheet = sheetArgs(
      "list.txt",
      { x0: 10, y0: 20, x1: 110, y1: 70, cols: 4, rows: 3 },
      "s-%02d.jpg",
    );
    expect(sheet[sheet.indexOf("-vf") + 1]).toBe("crop=100:50:10:20,tile=4x3");
    const subs = subsArgs({ video: "v.mp4", y0: 600, y1: 680, step: 0.5 }, "s-%02d.jpg");
    expect(subs[subs.indexOf("-vf") + 1]).toMatch(
      /^fps=1\/0\.5,crop=iw-0:80:0:600,select=.*,scale=900:-1,tile=1x14$/,
    );
  });

  it("sets a variable frame rate with -fps_mode, which ffmpeg 9 accepts, never -vsync", () => {
    const frames = framesArgs({ video: "v.mp4", t0: 0, t1: 5, step: 1, threshold: 6 }, "f.jpg");
    const subs = subsArgs({ video: "v.mp4", y0: 0, y1: 10, step: 1 }, "s.jpg");
    for (const args of [frames, subs]) {
      expect(args).not.toContain("-vsync");
      expect(args[args.indexOf("-fps_mode") + 1]).toBe("vfr");
      expect(args.indexOf("-fps_mode")).toBeLessThan(args.length - 1);
      expect(args.at(-1)).toMatch(/\.jpg$/);
    }
  });
});
