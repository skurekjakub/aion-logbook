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

/**
 * The research folder's entries. Until the first record lands there is no
 * `research/` folder, and the suites below are skipped rather than failed.
 */
const hasResearch = existsSync(researchDir);
const entries = hasResearch ? readdirSync(researchDir, { withFileTypes: true }) : [];

const records = entries
  .filter((entry) => entry.isDirectory() && hasLedger(join(researchDir, entry.name)))
  .map((entry) => entry.name);

describe.skipIf(!hasResearch)("every record's capture ledger", () => {
  it("finds a ledger in every record that has evidence", () => {
    const withEvidence = entries
      .filter(
        (entry) => entry.isDirectory() && existsSync(join(researchDir, entry.name, "evidence")),
      )
      .map((entry) => entry.name);
    expect(withEvidence.length).toBeGreaterThan(0);
    expect(records).toEqual(withEvidence);
  });

  it("names the ledger in every importable record's manifest, so an import verifies it", () => {
    const manifests = records.filter((record) =>
      existsSync(join(researchDir, record, "import.json")),
    );
    expect(manifests.length).toBeGreaterThan(0);
    for (const record of manifests) {
      const manifest = JSON.parse(
        readFileSync(join(researchDir, record, "import.json"), "utf-8"),
      ) as { ledger?: unknown };
      expect(manifest.ledger, record).toEqual({ file: LEDGER_FILE });
    }
  });

  for (const record of records) {
    it(
      `${record}: every evidence file has its line, and every present file its hash`,
      COLD_VERIFY,
      () => {
        expect(verifyLedger(join(researchDir, record)).map(describeProblem)).toEqual([]);
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

describe.skipIf(!hasResearch)("every area's saved searches", () => {
  it("finds the areas", () => {
    expect(areas.length).toBeGreaterThan(0);
  });

  for (const area of areas) {
    it(`${area}: has a valid searches.json, dated by rounds the record ran`, () => {
      const dir = join(researchDir, area);
      const searches = readSearches(dir);
      expect(searches, `${area} has no ${SEARCHES_FILE}`).not.toBeNull();
      expect(searchRoundProblems(searches ?? [], recordRounds(dir))).toEqual([]);
    });
  }
});
