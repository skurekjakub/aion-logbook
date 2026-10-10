import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeProblem, hasLedger, LEDGER_FILE, verifyLedger } from "../src/ledger";
import { researchDir } from "../src/paths";
import { readSearches, recordRounds, SEARCHES_FILE, searchRoundProblems } from "../src/searches";

/**
 * A record's whole verification with a cold hash cache: every present
 * file, local media included, is read and hashed, in parallel with the
 * other test workers doing the same.
 */
const COLD_VERIFY = { timeout: 180_000 };

/** Whether the `research/` folder exists; a missing one fails the suites below. */
const hasResearch = existsSync(researchDir);
/** The research folder's entries. */
const entries = hasResearch ? readdirSync(researchDir, { withFileTypes: true }) : [];

const records = entries
  .filter((entry) => entry.isDirectory() && hasLedger(join(researchDir, entry.name)))
  .map((entry) => entry.name);

describe("every record's capture ledger", () => {
  it("finds the research folder", () => {
    // Assert
    expect(hasResearch, researchDir).toBe(true);
  });

  it("finds a ledger in every record that has evidence", () => {
    // Act
    const withEvidence = entries
      .filter(
        (entry) => entry.isDirectory() && existsSync(join(researchDir, entry.name, "evidence")),
      )
      .map((entry) => entry.name);
    // Assert
    expect(withEvidence.length).toBeGreaterThan(0);
    expect(records).toEqual(withEvidence);
  });

  it("names the ledger in every importable record's manifest, so an import verifies it", () => {
    // Arrange
    const manifests = records.filter((record) =>
      existsSync(join(researchDir, record, "import.json")),
    );
    // Assert
    expect(manifests.length).toBeGreaterThan(0);
    for (const record of manifests) {
      // Act
      const manifest = JSON.parse(
        readFileSync(join(researchDir, record, "import.json"), "utf-8"),
      ) as { ledger?: unknown };
      // Assert
      expect(manifest.ledger, record).toEqual({ file: LEDGER_FILE });
    }
  });

  for (const record of records) {
    it(
      `${record}: every evidence file has its line, and every present file its hash`,
      COLD_VERIFY,
      () => {
        // Act
        const problems = verifyLedger(join(researchDir, record)).map(describeProblem);
        // Assert
        expect(problems).toEqual([]);
      },
    );
  }
});

/** The areas a refresh round covers: the records with an `import.json`. */
const areas = entries
  .filter(
    (entry) => entry.isDirectory() && existsSync(join(researchDir, entry.name, "import.json")),
  )
  .map((entry) => entry.name);

describe("every area's saved searches", () => {
  it("finds the areas", () => {
    // Assert
    expect(areas.length).toBeGreaterThan(0);
  });

  for (const area of areas) {
    it(`${area}: has a valid searches.json, dated by rounds the record ran`, () => {
      // Arrange
      const dir = join(researchDir, area);
      // Act
      const searches = readSearches(dir);
      // Assert
      expect(searches, `${area} has no ${SEARCHES_FILE}`).not.toBeNull();
      // Act
      const problems = searchRoundProblems(searches ?? [], recordRounds(dir));
      // Assert
      expect(problems).toEqual([]);
    });
  }
});
