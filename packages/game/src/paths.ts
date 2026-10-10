/**
 * Where the bridge's files live: the repo root, the AutoHotkey script and the AutoHotkey executable.
 *
 * @module
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path of the checkout this package lives in. */
export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** Absolute path of the AutoHotkey v2 script that sends the input. */
export const AHK_SCRIPT = fileURLToPath(
  new URL("../../../tools/aion-input/aion.ahk", import.meta.url),
);

/**
 * Resolves the AutoHotkey v2 interpreter: `AION_AHK` when set, else where the per-user installer puts it
 * (`%LOCALAPPDATA%\Programs\AutoHotkey\v2\AutoHotkey64.exe`).
 *
 * @param env - the environment to read `AION_AHK` and `LOCALAPPDATA` from
 * @returns absolute path of `AutoHotkey64.exe`
 * @throws if no interpreter exists at the resolved path
 */
export function ahkExe(env: NodeJS.ProcessEnv = process.env): string {
  const exe =
    env.AION_AHK ??
    join(env.LOCALAPPDATA ?? "", "Programs", "AutoHotkey", "v2", "AutoHotkey64.exe");
  if (!existsSync(exe)) throw new Error(`AutoHotkey v2 not found at ${exe}; set AION_AHK`);
  return exe;
}
