import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { SavedSearch } from "../src/searches";
import {
  readSearches,
  recordRounds,
  SEARCHES_FILE,
  searchesFile,
  searchRoundProblems,
} from "../src/searches";

const base = {
  why: "The guide sites' own term for the build.",
  added: "2026-09-28",
  lastHit: "2026-09-28",
};

const VALID = [
  { ...base, id: "yt-gladiator", kind: "youtube", query: "aion 2 gladiator build" },
  { ...base, id: "yt-channel", kind: "youtube", channel: "@aion2guides", lastHit: null },
  { ...base, id: "web-tier", kind: "web", url: "https://example.test/tier" },
];

let tmp: string | undefined;
afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  tmp = undefined;
});

describe("searches.json", () => {
  it("accepts every kind of saved search", () => {
    // Act & Assert
    expect(searchesFile.safeParse(VALID).success).toBe(true);
  });

  it("rejects an entry that names no way to run it, or two", () => {
    // Act & Assert
    expect(searchesFile.safeParse([{ ...base, id: "x", kind: "youtube" }]).success).toBe(false);
    expect(
      searchesFile.safeParse([{ ...base, id: "x", kind: "youtube", query: "q", channel: "@c" }])
        .success,
    ).toBe(false);
  });

  it("rejects a kind pnpm capture has no scraper for", () => {
    // Act & Assert
    expect(searchesFile.safeParse([{ ...base, id: "x", kind: "dc", query: "q" }]).success).toBe(
      false,
    );
  });

  it("rejects a round date that isn't on the calendar", () => {
    // Act & Assert
    expect(searchesFile.safeParse([{ ...VALID[0], added: "2026-02-30" }]).success).toBe(false);
    expect(searchesFile.safeParse([{ ...VALID[0], lastHit: "2026-13-01" }]).success).toBe(false);
  });

  it("rejects a duplicate id, a last hit before the round that added it, and an unknown key", () => {
    // Act & Assert
    expect(searchesFile.safeParse([VALID[0], VALID[0]]).success).toBe(false);
    expect(searchesFile.safeParse([{ ...VALID[0], lastHit: "2026-09-01" }]).success).toBe(false);
    expect(searchesFile.safeParse([{ ...VALID[0], pages: 3 }]).success).toBe(false);
  });

  it("finds a record's rounds: its first, and each refresh section of its README", () => {
    // Arrange
    tmp = mkdtempSync(join(tmpdir(), "aion-searches-"));
    writeFileSync(
      join(tmp, "import.json"),
      JSON.stringify({ record: { slug: "x", startedAt: "2026-09-27" } }),
    );
    writeFileSync(
      join(tmp, "README.md"),
      "# X\n\n## Refresh 2026-10-26\n\ntext\n\n## Refresh 2026-10-12\n\n## Sources\n",
    );
    // Act & Assert
    expect(recordRounds(tmp)).toEqual(["2026-09-27", "2026-10-12", "2026-10-26"]);
  });

  it("names each search whose rounds aren't rounds the record ran", () => {
    // Arrange
    const rounds = ["2026-09-28", "2026-10-12"];
    // Act & Assert
    expect(searchRoundProblems(VALID as SavedSearch[], rounds)).toEqual([]);
    expect(
      searchRoundProblems(
        [
          { ...VALID[0], added: "2026-10-01" },
          { ...VALID[1], lastHit: "2026-10-13" },
        ] as SavedSearch[],
        rounds,
      ),
    ).toEqual([
      "yt-gladiator: added 2026-10-01 isn't a round the record ran",
      "yt-channel: lastHit 2026-10-13 isn't a round the record ran",
    ]);
  });

  it("reads a record's file, and says so when there is none", () => {
    // Arrange
    tmp = mkdtempSync(join(tmpdir(), "aion-searches-"));
    // Act & Assert
    expect(readSearches(tmp)).toBeNull();
    // Arrange
    writeFileSync(join(tmp, SEARCHES_FILE), JSON.stringify(VALID));
    // Act & Assert
    expect(readSearches(tmp)?.map((s) => s.id)).toEqual(VALID.map((s) => s.id));
    // Arrange
    writeFileSync(join(tmp, SEARCHES_FILE), JSON.stringify([{ id: "x" }]));
    // Act & Assert
    expect(() => readSearches(tmp!)).toThrow();
  });
});
