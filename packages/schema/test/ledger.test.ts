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
    // Act
    const parsed = captureLine.parse(line);
    const withApprox = captureLine.parse({ ...line, approx: "git", url: null });

    // Assert
    expect(parsed).toEqual(line);
    expect(withApprox.approx).toBe("git");
  });

  it("rejects an unknown key, a bad hash and an unknown approx", () => {
    // Act
    const extraKey = captureLine.safeParse({ ...line, extra: 1 });
    const upperHash = captureLine.safeParse({ ...line, sha256: "AB".repeat(32) });
    const unknownApprox = captureLine.safeParse({ ...line, approx: "mtime" });

    // Assert
    expect(extraKey.success).toBe(false);
    expect(upperHash.success).toBe(false);
    expect(unknownApprox.success).toBe(false);
  });

  it("takes only record-relative paths under evidence/", () => {
    for (const ok of ["evidence/a.md", "evidence/14-global/yt/yt-x.html"]) {
      // Act
      const result = evidencePath.safeParse(ok);

      // Assert
      expect(result.success, ok).toBe(true);
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
      // Act
      const result = evidencePath.safeParse(bad);

      // Assert
      expect(result.success, bad).toBe(false);
    }
  });

  it("takes timestamps with an offset only", () => {
    for (const ok of [
      "2026-09-27T10:39:53+02:00",
      "2026-09-27T08:39:53Z",
      "2026-09-27T08:39:53.5Z",
    ]) {
      // Act
      const result = isoDateTime.safeParse(ok);

      // Assert
      expect(result.success, ok).toBe(true);
    }
    for (const bad of ["2026-09-27T10:39:53", "2026-09-27T10:39:53+0200", "2026-09-27"]) {
      // Act
      const result = isoDateTime.safeParse(bad);

      // Assert
      expect(result.success, bad).toBe(false);
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
      // Act
      const result = captureTool.safeParse(ok);

      // Assert
      expect(result.success, ok).toBe(true);
    }
    for (const bad of ["wget", "capture:", "capture:dc", "python:dc_scrape", "capture:Web"]) {
      // Act
      const result = captureTool.safeParse(bad);

      // Assert
      expect(result.success, bad).toBe(false);
    }
  });
});
