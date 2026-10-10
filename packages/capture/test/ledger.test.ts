import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendCapture,
  describeProblem,
  isIgnored,
  isMedia,
  LEDGER_FILE,
  LedgerError,
  listEvidence,
  MEDIA_EXTENSIONS,
  readLedger,
  sha256File,
  verifyLedger,
} from "../src/ledger";
import { findRepoRoot } from "../src/paths";
import { gitRecord } from "./helpers";

const META = {
  url: "https://example.test/1",
  capturedAt: "2026-09-28T08:00:00+02:00",
  tool: "curl",
};

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
 * Creates an empty record folder in the temp directory.
 *
 * @returns its absolute path
 */
function record(): string {
  return mkdtempSync(join(tmpdir(), "aion-ledger-"));
}

/**
 * Writes a file under a record, creating its folders.
 *
 * @param dir - the record folder
 * @param path - the record-relative path
 * @param content - the file's content
 */
function put(dir: string, path: string, content: string | Uint8Array = "x"): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), content);
}

describe("the ledger", () => {
  it("appends a hashed line per file, in the ledger's key order", () => {
    // Arrange
    const dir = record();
    put(dir, "evidence/a.md", "hello\n");
    // Act
    const line = appendCapture(dir, "evidence/a.md", META);
    // Assert
    expect(Object.keys(line)).toEqual(["path", "url", "captured_at", "tool", "sha256"]);
    expect(line.sha256).toBe(sha256File(join(dir, "evidence/a.md")));
    expect(readFileSync(join(dir, LEDGER_FILE), "utf-8")).toBe(`${JSON.stringify(line)}\n`);
    expect(readLedger(dir)).toEqual([{ line, lineNo: 1 }]);
    expect(verifyLedger(dir)).toEqual([]);
  });

  it("refuses a path already in the ledger, a missing file and an invalid line", () => {
    // Arrange
    const dir = record();
    put(dir, "evidence/a.md");
    appendCapture(dir, "evidence/a.md", META);
    // Act & Assert
    expect(() => appendCapture(dir, "evidence/a.md", META)).toThrow(/already has a ledger line/);
    expect(() => appendCapture(dir, "evidence/b.md", META)).toThrow(/file not found/);
    // Arrange
    put(dir, "evidence/c.md");
    // Act & Assert
    expect(() => appendCapture(dir, "evidence/c.md", { ...META, tool: "wget" })).toThrow(
      LedgerError,
    );
    // Assert
    expect(readLedger(dir)).toHaveLength(1);
  });

  it("fails a line that isn't JSON or breaks the schema, naming its line number", () => {
    // Arrange
    const dir = record();
    put(dir, "evidence/a.md");
    appendCapture(dir, "evidence/a.md", META);
    appendFileSync(join(dir, LEDGER_FILE), "\n{not json}\n");
    // Act & Assert
    expect(() => readLedger(dir)).toThrow(/\[line 3\]/);
    // Arrange
    writeFileSync(join(dir, LEDGER_FILE), '{"path":"evidence/a.md"}\r\n');
    // Act & Assert
    expect(() => readLedger(dir)).toThrow(/\[line 1\].*url/);
  });

  it("appends after a last line saved without its newline, and reads past a byte-order mark", () => {
    // Arrange
    const dir = record();
    put(dir, "evidence/a.md", "a");
    put(dir, "evidence/b.md", "b");
    const first = appendCapture(dir, "evidence/a.md", META);
    const bom = String.fromCharCode(0xfeff);
    writeFileSync(join(dir, LEDGER_FILE), `${bom}${JSON.stringify(first)}`);
    // Act
    appendCapture(dir, "evidence/b.md", META);
    // Assert
    expect(readLedger(dir).map((e) => [e.line.path, e.lineNo])).toEqual([
      ["evidence/a.md", 1],
      ["evidence/b.md", 2],
    ]);
    expect(verifyLedger(dir)).toEqual([]);
  });

  it("reports a hash mismatch, a missing line, an orphan line and a duplicate", () => {
    // Arrange
    const dir = record();
    put(dir, "evidence/a.md", "one");
    put(dir, "evidence/b.md", "two");
    appendCapture(dir, "evidence/a.md", META);
    appendCapture(dir, "evidence/b.md", META);
    put(dir, "evidence/a.md", "edited");
    put(dir, "evidence/new.md");
    const orphan = { ...readLedger(dir)[1]!.line, path: "evidence/gone.md" };
    const dup = readLedger(dir)[1]!.line;
    appendFileSync(join(dir, LEDGER_FILE), `${JSON.stringify(orphan)}\n${JSON.stringify(dup)}\n`);
    // Act
    const problems = verifyLedger(dir);
    const described = describeProblem(problems[0]!);
    // Assert
    expect(problems).toEqual([
      { kind: "hash-mismatch", path: "evidence/a.md", lineNo: 1 },
      { kind: "duplicate", path: "evidence/b.md", lineNo: 4 },
      { kind: "missing-file", path: "evidence/gone.md", lineNo: 3 },
      { kind: "missing-line", path: "evidence/new.md", lineNo: null },
    ]);
    expect(described).toBe("evidence/a.md (line 1) differs from its ledger hash");
  });

  it("passes a missing media file, and fails a present media file whose bytes changed", () => {
    // Arrange
    const dir = record();
    put(dir, "evidence/img/a.png", new Uint8Array([1, 2, 3]));
    put(dir, "evidence/img/b.JPG", new Uint8Array([4]));
    appendCapture(dir, "evidence/img/a.png", META);
    appendCapture(dir, "evidence/img/b.JPG", META);
    const lines = readFileSync(join(dir, LEDGER_FILE), "utf-8");
    const fresh = record();
    put(fresh, LEDGER_FILE, lines);
    // Act
    const mediaAbsent = verifyLedger(fresh);
    // Assert
    expect(mediaAbsent).toEqual([]);
    // Arrange
    put(fresh, "evidence/img/a.png", new Uint8Array([9]));
    // Act
    const mediaChanged = verifyLedger(fresh);
    // Assert
    expect(mediaChanged).toEqual([
      { kind: "hash-mismatch", path: "evidence/img/a.png", lineNo: 1 },
    ]);
  });

  it("matches a text file written with CRLF against its LF hash, but not media or a real edit", () => {
    // Arrange
    const dir = record();
    put(dir, "evidence/a.md", "one\ntwo\n");
    put(dir, "evidence/b.png", "x\ny\n");
    appendCapture(dir, "evidence/a.md", META);
    appendCapture(dir, "evidence/b.png", META);
    put(dir, "evidence/a.md", "one\r\ntwo\r\n");
    put(dir, "evidence/b.png", "x\r\ny\r\n");
    // Act
    const lineEndings = verifyLedger(dir);
    // Assert
    expect(lineEndings).toEqual([{ kind: "hash-mismatch", path: "evidence/b.png", lineNo: 2 }]);
    // Arrange
    put(dir, "evidence/a.md", "one\r\nthree\r\n");
    // Act
    const realEdit = verifyLedger(dir);
    // Assert
    expect(realEdit.map((p) => p.path)).toEqual(["evidence/a.md", "evidence/b.png"]);
  });

  it("hashes a CRLF text file as git stores it, so its LF checkout verifies, and keeps -text bytes", () => {
    // Arrange
    const dir = gitRecord();
    put(dir, "evidence/a.md", "one\r\ntwo\r\n");
    put(dir, "evidence/raw/b.csv", "x\r\ny\r\n");
    put(dir, "evidence/c.txt", "lone\rcr\r\n");
    // Act
    const crlfText = appendCapture(dir, "evidence/a.md", META);
    const binaryCsv = appendCapture(dir, "evidence/raw/b.csv", META);
    const loneCr = appendCapture(dir, "evidence/c.txt", META);
    const problems = verifyLedger(dir);
    // Assert
    expect(crlfText.sha256).toBe(sha("one\ntwo\n"));
    expect(binaryCsv.sha256).toBe(sha("x\r\ny\r\n"));
    expect(loneCr.sha256).toBe(sha("lone\rcr\r\n"));
    expect(problems).toEqual([]);
    // Arrange
    put(dir, "evidence/a.md", "one\ntwo\n");
    // Act
    const lfCheckout = verifyLedger(dir);
    // Assert
    expect(lfCheckout).toEqual([]);

    // Arrange
    const plain = record();
    put(plain, "evidence/a.md", "one\r\ntwo\r\n");
    // Act
    const outsideGit = appendCapture(plain, "evidence/a.md", META);
    // Assert
    expect(outsideGit.sha256).toBe(sha("one\r\ntwo\r\n"));
  });

  it("lists evidence without the ledger and local by-products", () => {
    // Arrange
    const dir = record();
    for (const path of [
      "evidence/a.md",
      "evidence/__pycache__/digest.cpython-313.pyc",
      "evidence/x.pyc",
      "evidence/sub/Thumbs.db",
      "evidence/sub/b.json",
      LEDGER_FILE,
    ]) {
      put(dir, path);
    }
    put(dir, "curated/builds.json");
    // Act
    const listed = listEvidence(dir);
    const dsStoreIgnored = isIgnored("evidence/.DS_Store");
    // Assert
    expect(listed).toEqual(["evidence/a.md", "evidence/sub/b.json"]);
    expect(dsStoreIgnored).toBe(true);
  });

  it("keeps the media extensions and the ignored by-products in step with .gitignore", () => {
    // Arrange
    const gitignore = readFileSync(join(findRepoRoot(import.meta.dirname), ".gitignore"), "utf-8")
      .split("\n")
      .map((line) => line.trim());
    const ignoredMedia = gitignore
      .filter((line) => line.startsWith("research/**/*."))
      .map((line) => line.slice("research/**/*".length))
      .sort();
    // Act
    const extensions = [...MEDIA_EXTENSIONS].sort();
    // Assert
    expect(extensions).toEqual(ignoredMedia);
    for (const ext of MEDIA_EXTENSIONS) {
      // Act
      const media = isMedia(`a${ext.toUpperCase()}`);
      // Assert
      expect(media).toBe(true);
    }
  });

  it("skips every file .gitignore excludes outside research/, so no line names a file git never stores", () => {
    // Arrange
    const patterns = readFileSync(join(findRepoRoot(import.meta.dirname), ".gitignore"), "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#") && !line.startsWith("research/"));
    const floating = patterns.filter((line) => !line.slice(0, -1).includes("/"));
    // Assert
    expect(floating.length).toBeGreaterThan(0);
    for (const pattern of floating) {
      // Arrange
      const name = pattern.replace(/\/$/, "").replaceAll("*", "x");
      if (pattern.endsWith("/")) {
        // Act
        const inside = isIgnored(`evidence/sub/${name}/f.md`);
        const itself = isIgnored(`evidence/sub/${name}`);
        // Assert
        expect(inside, pattern).toBe(true);
        expect(itself, pattern).toBe(false);
      } else {
        // Act
        const file = isIgnored(`evidence/sub/${name}`);
        // Assert
        expect(file, pattern).toBe(true);
      }
    }
    // Act
    const notes = isIgnored("evidence/notes.md");
    // Assert
    expect(notes).toBe(false);
  });
});
