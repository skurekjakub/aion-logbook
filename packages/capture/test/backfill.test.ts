import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  backfill,
  backfillLines,
  embeddedImages,
  gitCommitTimes,
  readHeader,
  siblingUrl,
} from "../src/backfill";
import { hasLedger, readLedger, verifyLedger } from "../src/ledger";
import { gitRecord } from "./helpers";

const FORUM_POST = `# Gladiator guide

- url: https://forum.example.test/t/100
- captured: 2026-09-27T16:41:31+0200

## Body

![[100-1.jpg]]
Body text.

`;

const BOARD_POST = `# Stigma picks

- url: https://board.example.test/5
- captured: 2026-09-27T10:42:32+0200

## Body

![[b-5-1.png]]

`;

/**
 * Writes a file under a folder, creating its parents.
 *
 * @param dir - the folder
 * @param path - the relative path
 * @param content - the content
 */
function put(dir: string, path: string, content: string | Uint8Array): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), content);
}

/**
 * Builds a record whose evidence covers every backfill rule, and a second
 * copy holding a frame the first lacks.
 *
 * @returns the record folder and the other copy
 */
function fixtureRecord(): { dir: string; from: string } {
  const dir = mkdtempSync(join(tmpdir(), "aion-backfill-"));
  put(dir, "evidence/forum/100.md", FORUM_POST);
  put(dir, "evidence/forum/img/100-1.jpg", new Uint8Array([1]));
  put(dir, "evidence/board/b-5.md", BOARD_POST);
  put(dir, "evidence/sites/SOURCES.md", "| `x.json` | https://example.test/x?a=1 | 2026-09-27 |\n");
  put(dir, "evidence/sites/x.json", "{}");
  put(dir, "evidence/yt/yt-a.txt", "# t\n- url: https://www.youtube.com/watch?v=a\n- channel: c\n");
  put(dir, "evidence/notes.md", "# Notes\n\nno header here\n");
  put(dir, "evidence/__pycache__/x.pyc", "junk");
  const from = mkdtempSync(join(tmpdir(), "aion-backfill-from-"));
  put(from, "evidence/frames/f-00m01.0s.jpg", new Uint8Array([2]));
  put(from, "evidence/board/img/b-5-1.png", new Uint8Array([3]));
  put(from, "evidence/extra.md", "only in the other copy");
  return { dir, from };
}

const GIT_TIME = "2026-09-27T18:00:00+02:00";

/**
 * A commit-time lookup that dates every path.
 *
 * @returns every path mapped to {@link GIT_TIME}
 */
const allCommitted = () =>
  new Map(
    [
      "evidence/sites/SOURCES.md",
      "evidence/sites/x.json",
      "evidence/yt/yt-a.txt",
      "evidence/notes.md",
      "evidence/frames/f-00m01.0s.jpg",
    ].map((p) => [p, GIT_TIME]),
  );

describe("backfill", () => {
  it("reads capture headers and the images a post embeds", () => {
    // Act
    const forum = readHeader(FORUM_POST);
    const unstamped = readHeader("# 1\n\n- url: https://board.example.test/1\n\nno stamp\n");
    const zulu = readHeader("- url: https://x.test\n- captured: 2026-09-27T08:00:00Z\n");
    const images = embeddedImages(FORUM_POST);
    // Assert
    expect(forum).toEqual({
      url: "https://forum.example.test/t/100",
      capturedAt: "2026-09-27T16:41:31+02:00",
    });
    expect(unstamped).toEqual({
      url: "https://board.example.test/1",
      capturedAt: null,
    });
    expect(zulu).toEqual({
      url: "https://x.test",
      capturedAt: "2026-09-27T08:00:00+00:00",
    });
    expect(images).toEqual(["100-1.jpg"]);
  });

  it("dates posts by header, images by their post, and the rest by git, with sibling URLs", () => {
    // Arrange
    const { dir, from } = fixtureRecord();
    // Act
    const lines = backfillLines(dir, { from, commitTimes: allCommitted });
    const byPath = Object.fromEntries(lines.map((l) => [l.path, l]));
    const unlistedSibling = siblingUrl(dir, "evidence/sites/other.json");
    // Assert
    expect(Object.keys(byPath)).toEqual([
      "evidence/board/b-5.md",
      "evidence/board/img/b-5-1.png",
      "evidence/forum/100.md",
      "evidence/forum/img/100-1.jpg",
      "evidence/frames/f-00m01.0s.jpg",
      "evidence/notes.md",
      "evidence/sites/SOURCES.md",
      "evidence/sites/x.json",
      "evidence/yt/yt-a.txt",
    ]);
    expect(byPath["evidence/forum/100.md"]).toMatchObject({
      url: "https://forum.example.test/t/100",
      captured_at: "2026-09-27T16:41:31+02:00",
      tool: "unknown",
      approx: "header",
    });
    expect(byPath["evidence/forum/img/100-1.jpg"]).toMatchObject({
      url: "https://forum.example.test/t/100",
      captured_at: "2026-09-27T16:41:31+02:00",
      tool: "unknown",
      approx: "post",
    });
    expect(byPath["evidence/board/img/b-5-1.png"]).toMatchObject({
      url: "https://board.example.test/5",
      approx: "post",
    });
    expect(byPath["evidence/sites/x.json"]).toMatchObject({
      url: "https://example.test/x?a=1",
      captured_at: GIT_TIME,
      tool: "unknown",
      approx: "git",
    });
    expect(byPath["evidence/yt/yt-a.txt"]!.url).toBe("https://www.youtube.com/watch?v=a");
    expect(byPath["evidence/notes.md"]!.url).toBeNull();
    expect(byPath["evidence/frames/f-00m01.0s.jpg"]).toMatchObject({ url: null, approx: "git" });
    expect(unlistedSibling).toBeNull();
  });

  it("writes the ledger once, which then verifies, with the other copy's media absent", () => {
    // Arrange
    const { dir, from } = fixtureRecord();
    // Act
    backfill(dir, { from, commitTimes: allCommitted });
    // Assert
    expect(hasLedger(dir)).toBe(true);
    expect(readLedger(dir).length).toBe(9);
    expect(verifyLedger(dir)).toEqual([]);
    // Act & Assert
    expect(() => backfill(dir, { from, commitTimes: allCommitted })).toThrow(
      /already has a ledger/,
    );
  });

  it("hashes a CRLF text file as git stores it", () => {
    // Arrange
    const dir = gitRecord();
    put(dir, "evidence/a.md", "one\r\ntwo\r\n");
    put(dir, "evidence/raw/b.csv", "x\r\ny\r\n");
    // Act
    const lines = backfillLines(dir, {
      commitTimes: () =>
        new Map([
          ["evidence/a.md", GIT_TIME],
          ["evidence/raw/b.csv", GIT_TIME],
        ]),
    });
    // Assert
    expect(lines.map((l) => l.sha256)).toEqual([
      createHash("sha256").update("one\ntwo\n").digest("hex"),
      createHash("sha256").update("x\r\ny\r\n").digest("hex"),
    ]);
  });

  it("fails a file neither a header nor a commit dates", () => {
    // Arrange
    const { dir } = fixtureRecord();
    // Act & Assert
    expect(() => backfillLines(dir, { commitTimes: () => new Map() })).toThrow(
      /evidence\/notes\.md: no commit adds it/,
    );
  });

  it("reads each file's first-add time from git", () => {
    // Arrange
    const repo = mkdtempSync(join(tmpdir(), "aion-git-"));
    /**
     * Runs git in the temp repo with a fixed author and dates.
     *
     * @param args - git's arguments
     * @param date - the author and committer date
     */
    const git = (args: string[], date = "2026-09-27T10:00:00+02:00") => {
      const result = spawnSync(
        "git",
        [
          "-C",
          repo,
          "-c",
          "user.name=t",
          "-c",
          "user.email=t@t",
          "-c",
          "commit.gpgsign=false",
          ...args,
        ],
        {
          encoding: "utf-8",
          env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
        },
      );
      expect(result.status, result.stderr).toBe(0);
    };
    git(["init", "-q"]);
    put(repo, "research/r/evidence/a.md", "a");
    git(["add", "."]);
    git(["commit", "-q", "--no-verify", "-m", "a"]);
    put(repo, "research/r/evidence/sub/b 한.json", "b");
    git(["add", "."]);
    git(["commit", "-q", "--no-verify", "-m", "b"], "2026-09-28T09:30:00+02:00");
    git(["mv", "research/r/evidence/a.md", "research/r/evidence/c.md"]);
    git(["commit", "-q", "--no-verify", "-m", "c"], "2026-09-28T11:00:00+02:00");
    // Act
    const times = gitCommitTimes(join(repo, "research", "r"));
    // Assert
    expect(Object.fromEntries(times)).toEqual({
      "evidence/a.md": "2026-09-27T10:00:00+02:00",
      "evidence/c.md": "2026-09-28T11:00:00+02:00",
      "evidence/sub/b 한.json": "2026-09-28T09:30:00+02:00",
    });
    // Several git processes on Windows exceed the default 5 s once the full suite loads the machine.
  }, 30_000);
});
