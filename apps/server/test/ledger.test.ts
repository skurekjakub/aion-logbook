import { appendFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ImportError } from "../src/errors";
import { importRecord } from "../src/importers/import-record";
import { createServices } from "../src/services";
import { copyFixture, editJson, testStore } from "./helpers";

/** The sha256 of the one-byte file `a`. */
const SHA_A = "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb";

const copies: string[] = [];
afterEach(() => {
  for (const dir of copies.splice(0)) rmSync(dirname(dir), { recursive: true, force: true });
});

/**
 * Copies the fixture record with one evidence file (`evidence/a.md`,
 * holding `a`) and the given ledger text.
 *
 * @param ledger - the ledger file's content
 * @returns the record directory
 */
function recordWithLedger(ledger: string): string {
  const dir = copyFixture();
  copies.push(dir);
  writeFileSync(join(dir, "evidence", "a.md"), "a");
  writeFileSync(join(dir, "evidence", "captures.jsonl"), ledger);
  return dir;
}

/**
 * Formats a ledger line for `evidence/a.md`.
 *
 * @param over - fields to override
 * @returns the JSON line, newline-terminated
 */
function line(over: Record<string, unknown> = {}): string {
  return `${JSON.stringify({
    path: "evidence/a.md",
    url: "https://example.test/guide",
    captured_at: "2026-10-01T10:39:53+02:00",
    tool: "capture:web",
    sha256: SHA_A,
    ...over,
  })}\n`;
}

describe("the ledger block", () => {
  it("imports every ledger line as a capture the record owns, and serves it", () => {
    // Arrange
    const store = testStore();
    const dir = recordWithLedger(line());

    // Act
    const { counts } = importRecord(store, dir);

    // Assert
    const services = createServices(store);
    expect(counts.captures).toBe(1);
    expect(services.captures.list({ record: "900-fixture" })).toEqual([
      {
        id: 1,
        recordSlug: "900-fixture",
        path: "evidence/a.md",
        url: "https://example.test/guide",
        capturedAt: "2026-10-01T10:39:53+02:00",
        approx: null,
        tool: "capture:web",
        sha256: SHA_A,
      },
    ]);
    expect(services.captures.list({ path: "evidence/b.md" })).toEqual([]);
  });

  it("refreshes the record's captures on replace", () => {
    // Arrange
    const store = testStore();
    const dir = recordWithLedger(line());
    importRecord(store, dir);
    writeFileSync(join(dir, "evidence", "b.md"), "a");
    appendFileSync(join(dir, "evidence", "captures.jsonl"), line({ path: "evidence/b.md" }));

    // Act
    importRecord(store, dir, { replace: true });

    // Assert
    expect(store.repos.captures.list().map((c) => c.path)).toEqual([
      "evidence/a.md",
      "evidence/b.md",
    ]);
  });

  it("fails on a bad line, naming the ledger and the line", () => {
    // Arrange
    const dir = recordWithLedger(`${line()}\n${line({ tool: "wget" })}`);

    // Act & Assert
    expect(() => importRecord(testStore(), dir)).toThrow(ImportError);
    expect(() => importRecord(testStore(), dir)).toThrow(
      /^evidence\/captures\.jsonl \[3\]: tool: /,
    );
  });

  it("fails when the ledger and the evidence disagree, and writes nothing", () => {
    // Arrange
    const store = testStore();
    const dir = recordWithLedger(line({ sha256: "0".repeat(64) }));

    // Act & Assert
    expect(() => importRecord(store, dir)).toThrow(
      /evidence\/captures\.jsonl \[1\]: the ledger doesn't match the evidence: evidence\/a\.md \(line 1\) differs from its ledger hash/,
    );
    writeFileSync(join(dir, "evidence", "captures.jsonl"), "");
    expect(() => importRecord(store, dir)).toThrow(/evidence\/a\.md has no ledger line/);
    expect(store.repos.captures.list()).toEqual([]);
    expect(store.repos.records.list()).toEqual([]);
  });

  it("rejects a ledger block naming another file", () => {
    // Arrange
    const dir = recordWithLedger(line());
    editJson(dir, "import.json", (manifest: Record<string, unknown>) => {
      manifest.ledger = { file: "evidence/other.jsonl" };
    });

    // Act & Assert
    expect(() => importRecord(testStore(), dir)).toThrow(/import\.json.*ledger\.file/);
  });
});
