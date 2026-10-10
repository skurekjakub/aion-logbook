import { describe, expect, it } from "vitest";
import { captureLine, captureTool, evidencePath, isoDateTime } from "../src/ledger";

const line = {
  path: "evidence/01-guides/eloboost24-eu-blog-aion-2-gladiator-build.md",
  url: "https://eloboost24.eu/blog/aion-2-gladiator-build",
  captured_at: "2026-09-27T10:39:53+02:00",
  tool: "capture:web",
  sha256: "ab".repeat(32),
};

describe("captureLine", () => {
  it("accepts a line with and without approx, and a null url", () => {
    expect(captureLine.parse(line)).toEqual(line);
    expect(captureLine.parse({ ...line, approx: "git", url: null }).approx).toBe("git");
  });

  it("rejects an unknown key, a bad hash and an unknown approx", () => {
    expect(captureLine.safeParse({ ...line, extra: 1 }).success).toBe(false);
    expect(captureLine.safeParse({ ...line, sha256: "AB".repeat(32) }).success).toBe(false);
    expect(captureLine.safeParse({ ...line, approx: "mtime" }).success).toBe(false);
  });

  it("takes only record-relative paths under evidence/", () => {
    for (const ok of ["evidence/a.md", "evidence/14-global/yt/yt-x.html"]) {
      expect(evidencePath.safeParse(ok).success, ok).toBe(true);
    }
    for (const bad of [
      "curated/builds.json",
      "evidence",
      "evidence/",
      "evidence//a.md",
      "evidence/../import.json",
      "evidence/./a.md",
      "evidence\\a.md",
      "/evidence/a.md",
    ]) {
      expect(evidencePath.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("takes timestamps with an offset only", () => {
    for (const ok of [
      "2026-09-27T10:39:53+02:00",
      "2026-09-27T08:39:53Z",
      "2026-09-27T08:39:53.5Z",
    ]) {
      expect(isoDateTime.safeParse(ok).success, ok).toBe(true);
    }
    for (const bad of ["2026-09-27T10:39:53", "2026-09-27T10:39:53+0200", "2026-09-27"]) {
      expect(isoDateTime.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("names the tool from the ledger's vocabulary", () => {
    for (const ok of [
      "agent-browser",
      "curl",
      "yt-dlp",
      "manual",
      "unknown",
      "capture:youtube",
      "capture:web",
    ]) {
      expect(captureTool.safeParse(ok).success, ok).toBe(true);
    }
    for (const bad of ["wget", "capture:", "capture:dc", "python:dc_scrape", "capture:Web"]) {
      expect(captureTool.safeParse(bad).success, bad).toBe(false);
    }
  });
});
