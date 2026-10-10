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
    const dir = record();
    put(dir, "evidence/a.md", "hello\n");
    const line = appendCapture(dir, "evidence/a.md", META);
    expect(Object.keys(line)).toEqual(["path", "url", "captured_at", "tool", "sha256"]);
    expect(line.sha256).toBe(sha256File(join(dir, "evidence/a.md")));
    expect(readFileSync(join(dir, LEDGER_FILE), "utf-8")).toBe(`${JSON.stringify(line)}\n`);
    expect(readLedger(dir)).toEqual([{ line, lineNo: 1 }]);
    expect(verifyLedger(dir)).toEqual([]);
  });

  it("refuses a path already in the ledger, a missing file and an invalid line", () => {
    const dir = record();
    put(dir, "evidence/a.md");
    appendCapture(dir, "evidence/a.md", META);
    expect(() => appendCapture(dir, "evidence/a.md", META)).toThrow(/already has a ledger line/);
    expect(() => appendCapture(dir, "evidence/b.md", META)).toThrow(/file not found/);
    put(dir, "evidence/c.md");
    expect(() => appendCapture(dir, "evidence/c.md", { ...META, tool: "wget" })).toThrow(
      LedgerError,
    );
    expect(readLedger(dir)).toHaveLength(1);
  });

  it("fails a line that isn't JSON or breaks the schema, naming its line number", () => {
    const dir = record();
    put(dir, "evidence/a.md");
    appendCapture(dir, "evidence/a.md", META);
    appendFileSync(join(dir, LEDGER_FILE), "\n{not json}\n");
    expect(() => readLedger(dir)).toThrow(/\[line 3\]/);
    writeFileSync(join(dir, LEDGER_FILE), '{"path":"evidence/a.md"}\r\n');
    expect(() => readLedger(dir)).toThrow(/\[line 1\].*url/);
  });

  it("appends after a last line saved without its newline, and reads past a byte-order mark", () => {
    const dir = record();
    put(dir, "evidence/a.md", "a");
    put(dir, "evidence/b.md", "b");
    const first = appendCapture(dir, "evidence/a.md", META);
    const bom = String.fromCharCode(0xfeff);
    writeFileSync(join(dir, LEDGER_FILE), `${bom}${JSON.stringify(first)}`);
    appendCapture(dir, "evidence/b.md", META);
    expect(readLedger(dir).map((e) => [e.line.path, e.lineNo])).toEqual([
      ["evidence/a.md", 1],
      ["evidence/b.md", 2],
    ]);
    expect(verifyLedger(dir)).toEqual([]);
  });

  it("reports a hash mismatch, a missing line, an orphan line and a duplicate", () => {
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
    const problems = verifyLedger(dir);
    expect(problems).toEqual([
      { kind: "hash-mismatch", path: "evidence/a.md", lineNo: 1 },
      { kind: "duplicate", path: "evidence/b.md", lineNo: 4 },
      { kind: "missing-file", path: "evidence/gone.md", lineNo: 3 },
      { kind: "missing-line", path: "evidence/new.md", lineNo: null },
    ]);
    expect(describeProblem(problems[0]!)).toBe(
      "evidence/a.md (line 1) differs from its ledger hash",
    );
  });

  it("passes a missing media file, and fails a present media file whose bytes changed", () => {
    const dir = record();
    put(dir, "evidence/img/a.png", new Uint8Array([1, 2, 3]));
    put(dir, "evidence/img/b.JPG", new Uint8Array([4]));
    appendCapture(dir, "evidence/img/a.png", META);
    appendCapture(dir, "evidence/img/b.JPG", META);
    const lines = readFileSync(join(dir, LEDGER_FILE), "utf-8");
    const fresh = record();
    put(fresh, LEDGER_FILE, lines);
    expect(verifyLedger(fresh)).toEqual([]);
    put(fresh, "evidence/img/a.png", new Uint8Array([9]));
    expect(verifyLedger(fresh)).toEqual([
      { kind: "hash-mismatch", path: "evidence/img/a.png", lineNo: 1 },
    ]);
  });

  it("matches a text file written with CRLF against its LF hash, but not media or a real edit", () => {
    const dir = record();
    put(dir, "evidence/a.md", "one\ntwo\n");
    put(dir, "evidence/b.png", "x\ny\n");
    appendCapture(dir, "evidence/a.md", META);
    appendCapture(dir, "evidence/b.png", META);
    put(dir, "evidence/a.md", "one\r\ntwo\r\n");
    put(dir, "evidence/b.png", "x\r\ny\r\n");
    expect(verifyLedger(dir)).toEqual([
      { kind: "hash-mismatch", path: "evidence/b.png", lineNo: 2 },
    ]);
    put(dir, "evidence/a.md", "one\r\nthree\r\n");
    expect(verifyLedger(dir).map((p) => p.path)).toEqual(["evidence/a.md", "evidence/b.png"]);
  });

  it("hashes a CRLF text file as git stores it, so its LF checkout verifies, and keeps -text bytes", () => {
    const dir = gitRecord();
    put(dir, "evidence/a.md", "one\r\ntwo\r\n");
    put(dir, "evidence/raw/b.csv", "x\r\ny\r\n");
    put(dir, "evidence/c.txt", "lone\rcr\r\n");
    expect(appendCapture(dir, "evidence/a.md", META).sha256).toBe(sha("one\ntwo\n"));
    expect(appendCapture(dir, "evidence/raw/b.csv", META).sha256).toBe(sha("x\r\ny\r\n"));
    expect(appendCapture(dir, "evidence/c.txt", META).sha256).toBe(sha("lone\rcr\r\n"));
    expect(verifyLedger(dir)).toEqual([]);
    put(dir, "evidence/a.md", "one\ntwo\n");
    expect(verifyLedger(dir)).toEqual([]);

    const plain = record();
    put(plain, "evidence/a.md", "one\r\ntwo\r\n");
    expect(appendCapture(plain, "evidence/a.md", META).sha256).toBe(sha("one\r\ntwo\r\n"));
  });

  it("lists evidence without the ledger and local by-products", () => {
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
    expect(listEvidence(dir)).toEqual(["evidence/a.md", "evidence/sub/b.json"]);
    expect(isIgnored("evidence/.DS_Store")).toBe(true);
  });

  it("keeps the media extensions and the ignored by-products in step with .gitignore", () => {
    const gitignore = readFileSync(join(findRepoRoot(import.meta.dirname), ".gitignore"), "utf-8")
      .split("\n")
      .map((line) => line.trim());
    const ignoredMedia = gitignore
      .filter((line) => line.startsWith("research/**/*."))
      .map((line) => line.slice("research/**/*".length))
      .sort();
    expect([...MEDIA_EXTENSIONS].sort()).toEqual(ignoredMedia);
    for (const ext of MEDIA_EXTENSIONS) expect(isMedia(`a${ext.toUpperCase()}`)).toBe(true);
  });

  it("skips every file .gitignore excludes outside research/, so no line names a file git never stores", () => {
    const patterns = readFileSync(join(findRepoRoot(import.meta.dirname), ".gitignore"), "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#") && !line.startsWith("research/"));
    const floating = patterns.filter((line) => !line.slice(0, -1).includes("/"));
    expect(floating.length).toBeGreaterThan(0);
    for (const pattern of floating) {
      const name = pattern.replace(/\/$/, "").replaceAll("*", "x");
      if (pattern.endsWith("/")) {
        expect(isIgnored(`evidence/sub/${name}/f.md`), pattern).toBe(true);
        expect(isIgnored(`evidence/sub/${name}`), pattern).toBe(false);
      } else {
        expect(isIgnored(`evidence/sub/${name}`), pattern).toBe(true);
      }
    }
    expect(isIgnored("evidence/notes.md")).toBe(false);
  });
});
