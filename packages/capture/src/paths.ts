/**
 * Where records live: the repo root and its `research/` folder.
 *
 * @module
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Walks up from `start` to the directory holding `pnpm-workspace.yaml`.
 *
 * @param start - absolute directory to start from
 * @returns the workspace root
 * @throws if no ancestor holds `pnpm-workspace.yaml`
 */
export function findRepoRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`pnpm-workspace.yaml not found above ${start}`);
    dir = parent;
  }
}

/** Absolute path of the checkout this package lives in. */
export const REPO_ROOT = findRepoRoot(dirname(fileURLToPath(import.meta.url)));

/** Absolute path of the repo's `research/` folder. */
export const researchDir = join(REPO_ROOT, "research");
