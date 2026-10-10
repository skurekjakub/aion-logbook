import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { RunResult, Runner } from "../src/runner";
import type { SyncDeps } from "../src/sync";
import { SyncError, runSync } from "../src/sync";
import { BAON, baonSite, fixtureText } from "./helpers";

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** 2026-10-11, 09:00 local time. */
const OCT_11 = new Date(2026, 9, 11, 9, 0, 0);

/**
 * Builds a repo root holding `account/character.json` and the 2026-10-10 game read.
 *
 * @param character - the character file's contents
 * @returns the root's path
 */
function repo(character: object = BAON): string {
  const root = mkdtempSync(join(tmpdir(), "aion-sync-test-"));
  temps.push(root);
  mkdirSync(join(root, "account", "snapshots"), { recursive: true });
  mkdirSync(join(root, "data"));
  writeFileSync(join(root, "account", "character.json"), JSON.stringify(character));
  writeFileSync(
    join(root, "account", "snapshots", "2026-10-10.json"),
    fixtureText("snapshot-2026-10-10.json"),
  );
  return root;
}

/**
 * Writes `data/snapshot.json` holding the given skill rows and no other table rows.
 *
 * @param root - the repo root
 * @param skills - the skill rows
 */
function writeExport(root: string, skills: object[]): void {
  writeFileSync(join(root, "data", "snapshot.json"), JSON.stringify({ tables: { skills } }));
}

/** A command the fake runner answered, with the commit message when it was `git commit -F`. */
interface RunCall {
  line: string;
  message?: string;
}

/**
 * Builds a fake {@link Runner}: every command exits 0 with `M file` on
 * stdout, except those `answers` names by `<cmd> <first arg>`.
 *
 * @param answers - `<cmd> <first arg>` → the result to answer
 * @returns the fake and the commands it ran, in order
 */
function fakeRunner(answers: Record<string, Partial<RunResult>> = {}) {
  const calls: RunCall[] = [];
  const run: Runner = (cmd, args) => {
    const call: RunCall = { line: [cmd, ...args].join(" ") };
    if (cmd === "git" && args[0] === "commit") call.message = readFileSync(args[2]!, "utf-8");
    calls.push(call);
    const answer = answers[`${cmd} ${args[0] ?? ""}`] ?? {};
    return Promise.resolve({ code: 0, stdout: "M file\n", stderr: "", ...answer });
  };
  return { run, calls };
}

/**
 * Builds the sync's dependencies over a repo root, the fake site and a fake runner.
 *
 * @param root - the repo root
 * @param overrides - dependencies to swap
 * @returns the dependencies, and the commands and log lines they recorded
 */
function deps(root: string, overrides: Partial<SyncDeps> = {}) {
  const runner = fakeRunner();
  const log: string[] = [];
  const all: SyncDeps = {
    root,
    http: baonSite().http,
    run: runner.run,
    now: () => OCT_11,
    dbExists: () => true,
    log: (line) => log.push(line),
    ...overrides,
  };
  return { deps: all, calls: runner.calls, log };
}

/**
 * Reads a snapshot file under the repo root.
 *
 * @param root - the repo root
 * @param id - the snapshot's id
 * @returns the parsed file
 */
function snapshotAt(root: string, id: string) {
  return JSON.parse(readFileSync(join(root, "account", "snapshots", `${id}.json`), "utf-8"));
}

describe("runSync", () => {
  it("writes the day's snapshot, imports and exports it, then commits and pushes", async () => {
    // Arrange
    const root = repo();
    const { deps: d, calls } = deps(root);
    const paths = "account/snapshots/2026-10-11.json data/snapshot.json";

    // Act
    const result = await runSync({ push: true }, d);

    // Assert
    expect(result).toEqual({ outcome: "pushed", file: "account/snapshots/2026-10-11.json" });
    expect(snapshotAt(root, "2026-10-11")).toMatchObject({
      character: { name: "Baon", level: 36, gearScore: 749, server: "Fafnir (EU)" },
      macros: [{ name: "Preset 1 (cleared later that day)" }],
    });
    expect(calls.map((c) => c.line.replace(/-F \S+/, "-F <file>"))).toEqual([
      "pnpm import:account account/snapshots/2026-10-11.json --replace",
      "pnpm db:export",
      `git add -- ${paths}`,
      `git status --porcelain -- ${paths}`,
      `git commit -F <file> -- ${paths}`,
      "git push",
    ]);
    const message = calls.find((c) => c.message !== undefined)?.message ?? "";
    expect(message.split("\n")[0]).toBe("chore(account): sync Baon on 2026-10-11");
    expect(message).toContain("Since 2026-10-10:");
    expect(message).toContain("- Debilitating Mark 12 → 10");
  });

  it("replaces the day's snapshot on a same-day rerun, carrying from it", async () => {
    // Arrange
    const root = repo();
    const sameDay = JSON.parse(fixtureText("snapshot-2026-10-10.json"));
    sameDay.macros = [{ name: "Solo loop", key: "R", steps: ["Condemnation"] }];
    sameDay.screens = [];
    writeFileSync(join(root, "account", "snapshots", "2026-10-11.json"), JSON.stringify(sameDay));
    const { deps: d } = deps(root);

    // Act
    await runSync({ push: false }, d);

    // Assert
    expect(snapshotAt(root, "2026-10-11").macros).toEqual(sameDay.macros);
    expect(snapshotAt(root, "2026-10-11").character.level).toBe(36);
  });

  it("writes and commits nothing when the character matches the latest snapshot", async () => {
    // Arrange
    const root = repo();
    await runSync({ push: false }, deps(root).deps);
    const { deps: d, calls } = deps(root, { now: () => new Date(2026, 9, 12, 9, 0, 0) });

    // Act
    const result = await runSync({ push: true }, d);

    // Assert
    expect(result).toEqual({ outcome: "unchanged", since: "2026-10-11" });
    expect(existsSync(join(root, "account", "snapshots", "2026-10-12.json"))).toBe(false);
    expect(calls).toEqual([]);
  });

  it("stops after the export with --no-push", async () => {
    // Arrange
    const root = repo();
    const { deps: d, calls } = deps(root);

    // Act
    const result = await runSync({ push: false }, d);

    // Assert
    expect(result).toEqual({ outcome: "exported", file: "account/snapshots/2026-10-11.json" });
    expect(calls.some((c) => c.line.startsWith("git"))).toBe(false);
  });

  it("files the snapshot under the day --date names", async () => {
    // Arrange
    const root = repo();
    const { deps: d } = deps(root);

    // Act
    const result = await runSync({ push: false, date: "2026-10-20" }, d);

    // Assert
    expect(result).toEqual({ outcome: "exported", file: "account/snapshots/2026-10-20.json" });
    expect(snapshotAt(root, "2026-10-20").capturedAt).toMatch(/^2026-10-11T09:00:00/);
  });

  it("restores the database from the committed export when none exists", async () => {
    // Arrange
    const root = repo();
    writeExport(root, [{ id: "cleric-bolt" }]);
    const { deps: d, calls } = deps(root, { dbExists: () => false });

    // Act
    await runSync({ push: false }, d);

    // Assert
    expect(calls[0]?.line).toBe("pnpm db:restore");
  });

  it("refuses to restore an export that holds no skills, before any request", async () => {
    // Arrange
    const root = repo();
    writeExport(root, []);
    const site = baonSite();
    const { deps: d } = deps(root, { dbExists: () => false, http: site.http });

    // Act
    const run = runSync({ push: false }, d);

    // Assert
    await expect(run).rejects.toThrow(/data\/snapshot\.json holds no skills/);
    expect(site.calls).toEqual([]);
  });

  it("refuses to replace a game read of the same day, before any request", async () => {
    // Arrange
    const root = repo();
    const site = baonSite();
    const { deps: d } = deps(root, { http: site.http });

    // Act
    const run = runSync({ push: false, date: "2026-10-10" }, d);

    // Assert
    await expect(run).rejects.toThrow(SyncError);
    await expect(run).rejects.toThrow(/2026-10-10\.json is a game read.*--date/s);
    expect(site.calls).toEqual([]);
    expect(snapshotAt(root, "2026-10-10").screens).not.toEqual([]);
  });

  it("refuses a day that already has a later read, which its snapshot would sort before", async () => {
    // Arrange
    const root = repo();
    const after = JSON.parse(fixtureText("snapshot-2026-10-10.json"));
    writeFileSync(
      join(root, "account", "snapshots", "2026-10-11-after.json"),
      JSON.stringify(after),
    );
    const { deps: d } = deps(root);

    // Act
    const run = runSync({ push: false }, d);

    // Assert
    await expect(run).rejects.toThrow(/2026-10-11-after/);
  });

  it("reports a failed push as an outcome, not a throw", async () => {
    // Arrange
    const root = repo();
    const failing = fakeRunner({
      "git push": { code: 128, stderr: "fatal: 'origin' does not appear to be a git repository" },
    });
    const { deps: d } = deps(root, { run: failing.run });

    // Act
    const result = await runSync({ push: true }, d);

    // Assert
    expect(result).toEqual({
      outcome: "push failed",
      file: "account/snapshots/2026-10-11.json",
      message: "fatal: 'origin' does not appear to be a git repository",
    });
  });

  it("commits nothing when git sees no change in the files", async () => {
    // Arrange
    const root = repo();
    const quiet = fakeRunner({ "git status": { stdout: "" } });
    const { deps: d } = deps(root, { run: quiet.run });

    // Act
    const result = await runSync({ push: true }, d);

    // Assert
    expect(result.outcome).toBe("nothing to commit");
    expect(quiet.calls.some((c) => c.line.startsWith("git commit"))).toBe(false);
  });

  it("fails naming the command when the import fails", async () => {
    // Arrange
    const root = repo();
    const failing = fakeRunner({ "pnpm import:account": { code: 1, stderr: "snapshot: bad" } });
    const { deps: d } = deps(root, { run: failing.run });

    // Act
    const run = runSync({ push: true }, d);

    // Assert
    await expect(run).rejects.toThrow(SyncError);
    await expect(run).rejects.toThrow(/pnpm import:account .* exited 1:\nsnapshot: bad/);
  });

  it("saves the characterId the search found and commits it with the snapshot", async () => {
    // Arrange
    const { characterId: _id, ...uncached } = BAON;
    const root = repo(uncached);
    const { deps: d, calls } = deps(root);

    // Act
    await runSync({ push: true }, d);

    // Assert
    const saved = JSON.parse(readFileSync(join(root, "account", "character.json"), "utf-8"));
    expect(saved.characterId).toBe(BAON.characterId);
    expect(calls.find((c) => c.line.startsWith("git add"))?.line).toContain(
      "account/character.json",
    );
  });
});
