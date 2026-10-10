import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HashCache } from "../src/hash-cache";
import { fileHashes, LEDGER_FILE, verifyLedger } from "../src/ledger";

/**
 * Hashes a string's UTF-8 bytes.
 *
 * @param text - the string
 * @returns its lowercase hex SHA-256
 */
function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Writes a file and pins its mtime, so a rewrite of the same size can keep it.
 *
 * @param file - the absolute path
 * @param content - the content
 * @param mtime - the mtime to set, in seconds
 */
function put(file: string, content: string, mtime: number): void {
  writeFileSync(file, content);
  utimesSync(file, mtime, mtime);
}

describe("the hash cache", () => {
  it("serves a later process the hashes an earlier one saved, until the file's size or mtime changes", () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), "aion-hash-cache-"));
    const cacheFile = join(root, "cache", "hashes.json");
    const file = join(root, "a.md");
    put(file, "one\n", 1_700_000_000);
    const first = new HashCache(cacheFile, root);
    // Act
    const hashed = fileHashes(file, first);
    // Assert
    expect(hashed).toEqual([sha("one\n")]);
    // Arrange
    first.save();

    put(file, "two\n", 1_700_000_000);
    const second = new HashCache(cacheFile, root);
    // Act
    const served = fileHashes(file, second);
    // Assert
    expect(served).toEqual([sha("one\n")]);

    // Arrange
    utimesSync(file, 1_700_000_100, 1_700_000_100);
    // Act
    const touched = fileHashes(file, second);
    // Assert
    expect(touched).toEqual([sha("two\n")]);
    // Arrange
    put(file, "three\n", 1_700_000_100);
    // Act
    const rewritten = fileHashes(file, second);
    // Assert
    expect(rewritten).toEqual([sha("three\n")]);
  });

  it("keeps on disk only files under its root, and reads a broken cache file as empty", () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), "aion-hash-cache-"));
    const outside = mkdtempSync(join(tmpdir(), "aion-hash-outside-"));
    const cacheFile = join(root, "hashes.json");
    put(join(root, "in.md"), "in", 1_700_000_000);
    put(join(outside, "out.md"), "out", 1_700_000_000);
    const cache = new HashCache(cacheFile, root);
    // Act
    fileHashes(join(root, "in.md"), cache);
    fileHashes(join(outside, "out.md"), cache);
    cache.save();
    // Assert
    expect(Object.keys(JSON.parse(readFileSync(cacheFile, "utf-8")) as object)).toEqual([
      join(root, "in.md"),
    ]);

    // Arrange
    writeFileSync(cacheFile, "{not json");
    // Act
    const fromBroken = fileHashes(join(root, "in.md"), new HashCache(cacheFile, root));
    // Assert
    expect(fromBroken).toEqual([sha("in")]);
  });

  it("is saved by a verification, so the next process's verification rehashes nothing unchanged", () => {
    // Arrange
    const root = mkdtempSync(join(tmpdir(), "aion-hash-cache-"));
    const cacheFile = join(root, "hashes.json");
    const record = join(root, "r1");
    mkdirSync(join(record, "evidence"), { recursive: true });
    put(join(record, "evidence", "a.md"), "a", 1_700_000_000);
    writeFileSync(
      join(record, LEDGER_FILE),
      `${JSON.stringify({
        path: "evidence/a.md",
        url: null,
        captured_at: "2026-09-28T08:00:00+02:00",
        tool: "manual",
        sha256: sha("a"),
      })}\n`,
    );
    // Act
    const problems = verifyLedger(record, new HashCache(cacheFile, root));
    // Assert
    expect(problems).toEqual([]);
    const saved = JSON.parse(readFileSync(cacheFile, "utf-8")) as Record<string, unknown>;
    expect(saved[join(record, "evidence", "a.md")]).toMatchObject({ hashes: [sha("a")] });
  });
});
