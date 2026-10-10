import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Walks up from `start` until it finds a directory containing
 * `pnpm-workspace.yaml`.
 *
 * @param start - absolute directory path to start searching from
 * @returns the absolute path to the workspace root
 * @throws if no ancestor of `start` contains `pnpm-workspace.yaml`
 */
function findRepoRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`pnpm-workspace.yaml not found above ${start}`);
    }
    dir = parent;
  }
}

/** Absolute path to the pnpm workspace root. */
export const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)));

/** Path to the SQLite database file; overridable via `AION_DB`. */
export const dbPath = process.env.AION_DB ?? join(repoRoot, "data", "aion.db");

/** Port the Hono server listens on; overridable via `PORT`. */
export const port = Number(process.env.PORT ?? 8787);

/** Absolute path to the `research/` records directory. */
export const researchDir = join(repoRoot, "research");

/** Absolute path to the exported JSON snapshot file. */
export const snapshotPath = join(repoRoot, "data", "snapshot.json");

/**
 * Absolute path to the character's snapshots and roadmaps (`account/`,
 * committed but for the screenshots under `snapshots/screens/`);
 * overridable via `AION_ACCOUNT`.
 */
export const accountDir = process.env.AION_ACCOUNT ?? join(repoRoot, "account");
