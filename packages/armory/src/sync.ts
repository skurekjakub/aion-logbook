/**
 * `pnpm sync`: fetch the character from the official site, map it to the
 * day's snapshot, load it into the database, export the database, and
 * commit and push the result. Spec § 8 of
 * `docs/superpowers/specs/2026-10-10-aion-logbook-design.md`.
 *
 * @module
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isoLocal } from "@aion/capture/time";
import type { AccountSnapshotFile } from "@aion/schema";
import {
  CHARACTER_PATH,
  latestSnapshot,
  readCharacter,
  writeCharacter,
  writeSnapshot,
} from "./account-files";
import { describeChanges, sameSnapshot } from "./changes";
import type { Http } from "./fetch";
import { fetchCharacter } from "./fetch";
import { toSnapshot } from "./map";
import type { Runner } from "./runner";

/** The database dump the export writes, relative to the repo root. */
const EXPORT_PATH = "data/snapshot.json";

/** What a sync run is asked to do. */
export interface SyncOptions {
  /** The day the snapshot is filed under, `YYYY-MM-DD`; today, in local time, when omitted. */
  date?: string | undefined;
  /** Commit and push after the export; `false` stops before committing. */
  push: boolean;
}

/** What a sync run reaches outside itself. */
export interface SyncDeps {
  /** The repo root. */
  root: string;
  /** The HTTP door to the official site. */
  http: Http;
  /** Runs `pnpm` and `git` in the repo root. */
  run: Runner;
  /**
   * The current time.
   *
   * @returns now
   */
  now: () => Date;
  /**
   * Whether the local database exists; without one, it is restored from the
   * committed export before the import.
   *
   * @returns `true` when the database file exists
   */
  dbExists: () => boolean;
  /**
   * Reports a step's outcome.
   *
   * @param line - one line of progress
   */
  log: (line: string) => void;
}

/** How a sync run ended. */
export type SyncResult =
  /** The fetched character matches the latest snapshot; nothing was written. */
  | { outcome: "unchanged"; since: string }
  /** The snapshot was written, imported and exported; `--no-push` stopped there. */
  | { outcome: "exported"; file: string }
  /** The export left the committed files as they were. */
  | { outcome: "nothing to commit"; file: string }
  /** The change was committed and pushed. */
  | { outcome: "pushed"; file: string }
  /** The change was committed, but the push failed; `message` says why. */
  | { outcome: "push failed"; file: string; message: string };

/** A step of the sync failed: a command exited non-zero. */
export class SyncError extends Error {
  override name = "SyncError";
}

/**
 * Runs a command and fails unless it exits 0.
 *
 * @param run - the runner
 * @param cmd - the program
 * @param args - its arguments
 * @returns its standard output
 * @throws {SyncError} naming the command, its exit code and the end of its output
 */
async function must(run: Runner, cmd: string, args: readonly string[]): Promise<string> {
  const result = await run(cmd, args);
  if (result.code !== 0) {
    const tail = `${result.stderr}\n${result.stdout}`.trim().split("\n").slice(-5).join("\n");
    throw new SyncError(`${[cmd, ...args].join(" ")} exited ${result.code}:\n${tail}`);
  }
  return result.stdout;
}

/**
 * Builds the commit message for a synced snapshot.
 *
 * @param snapshot - the new snapshot
 * @param date - the day it is filed under
 * @param previous - the snapshot it was compared with, or `null`
 * @returns the message: a conventional subject, then what changed
 */
function commitMessage(
  snapshot: AccountSnapshotFile,
  date: string,
  previous: { id: string; data: AccountSnapshotFile } | null,
): string {
  const changes = previous ? describeChanges(previous.data, snapshot) : [];
  const since = previous
    ? changes.length > 0
      ? [`Since ${previous.id}:`, ...changes.map((line) => `- ${line}`)]
      : [`Since ${previous.id}: notes and carried fields only.`]
    : ["The first snapshot of the character."];
  return [
    `chore(account): sync ${snapshot.character.name} on ${date}`,
    "",
    "Read from the official site's public character data",
    "(research/002-character-data-source). What the site doesn't publish,",
    "macros, hotbar slots and stigma slot positions, comes from the previous",
    "snapshot; unread[] says what stays unsettled.",
    "",
    ...since,
    "",
  ].join("\n");
}

/**
 * Commits `paths` alone, whatever else is staged, and pushes.
 *
 * @param deps - the runner and the log
 * @param paths - the files to commit, relative to the repo root
 * @param message - the commit message
 * @param file - the snapshot file, for the result
 * @returns how it ended: nothing to commit, pushed, or push failed
 * @throws {SyncError} if `git add`, `git status` or `git commit` fails
 */
async function commitAndPush(
  deps: SyncDeps,
  paths: readonly string[],
  message: string,
  file: string,
): Promise<SyncResult> {
  await must(deps.run, "git", ["add", "--", ...paths]);
  const status = await must(deps.run, "git", ["status", "--porcelain", "--", ...paths]);
  if (status.trim() === "") {
    deps.log("nothing to commit: the export left the committed files as they were");
    return { outcome: "nothing to commit", file };
  }
  const dir = mkdtempSync(join(tmpdir(), "aion-sync-"));
  try {
    const messageFile = join(dir, "commit-message.txt");
    writeFileSync(messageFile, message);
    await must(deps.run, "git", ["commit", "-F", messageFile, "--", ...paths]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  deps.log(`committed ${paths.join(", ")}`);
  const push = await deps.run("git", ["push"]);
  if (push.code !== 0) {
    const why = (push.stderr || push.stdout).trim();
    return { outcome: "push failed", file, message: why || `git push exited ${push.code}` };
  }
  deps.log("pushed");
  return { outcome: "pushed", file };
}

/**
 * Syncs the character: fetches it from the official site, maps it onto
 * the day's snapshot (what the site doesn't publish carried from the
 * latest snapshot on or before that day) and, unless it matches that
 * snapshot, writes `account/snapshots/<day>.json` (replacing a file of the
 * same day), runs `pnpm import:account <file> --replace` and `pnpm
 * db:export`, then commits the snapshot and the export and pushes, unless
 * `push` is off. A characterId the search found is saved to
 * `account/character.json` and committed with them.
 *
 * @param opts - the day to file under, and whether to commit and push
 * @param deps - the HTTP door, the runner, the clock and the log
 * @returns how the run ended
 * @throws {SyncError} if a command fails
 * @throws whatever `fetchCharacter`, `toSnapshot` or the account files throw
 */
export async function runSync(opts: SyncOptions, deps: SyncDeps): Promise<SyncResult> {
  const character = readCharacter(deps.root);
  const now = deps.now();
  const capturedAt = isoLocal(now);
  const date = opts.date ?? capturedAt.slice(0, 10);
  const previous = latestSnapshot(deps.root, date);

  const data = await fetchCharacter(character, deps.http);
  deps.log(`fetched ${character.name}, ${character.server}`);
  const idChanged = data.characterId !== character.characterId;
  if (idChanged) {
    writeCharacter(deps.root, { ...character, characterId: data.characterId });
    deps.log(`saved the characterId to ${CHARACTER_PATH}`);
  }

  const snapshot = toSnapshot(data, previous?.data ?? null, capturedAt);
  if (previous && !idChanged && sameSnapshot(previous.data, snapshot)) {
    deps.log(`unchanged since ${previous.id}: nothing written`);
    return { outcome: "unchanged", since: previous.id };
  }
  const file = writeSnapshot(deps.root, date, snapshot);
  deps.log(`wrote ${file}`);

  if (!deps.dbExists()) {
    await must(deps.run, "pnpm", ["db:restore"]);
    deps.log("restored the database from the committed export");
  }
  await must(deps.run, "pnpm", ["import:account", file, "--replace"]);
  deps.log(`imported ${file}`);
  await must(deps.run, "pnpm", ["db:export"]);
  deps.log(`exported ${EXPORT_PATH}`);
  if (!opts.push) {
    deps.log("--no-push: stopped before committing");
    return { outcome: "exported", file };
  }

  const paths = [file, EXPORT_PATH, ...(idChanged ? [CHARACTER_PATH] : [])];
  return commitAndPush(deps, paths, commitMessage(snapshot, date, previous), file);
}
