/**
 * `pnpm sync [--no-push] [--date YYYY-MM-DD]`: syncs the character from the
 * official site into the day's snapshot, loads and exports it, then commits
 * and pushes. Prints each step; exits 0 when it ends synced, unchanged or
 * exported, 1 on a failed step or push (the message says which), and 2 on
 * a malformed command line.
 *
 * @module
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isoDate } from "@aion/schema";
import { fetchHttp } from "./fetch";
import { nodeRunner } from "./runner";
import { runSync } from "./sync";

/** Absolute path of the checkout this package lives in. */
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const USAGE = "usage: pnpm sync [--no-push] [--date YYYY-MM-DD]";

/**
 * Writes a line to standard output.
 *
 * @param line - the line
 */
const say = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

/**
 * Writes a line to standard error.
 *
 * @param line - the line
 */
const warn = (line: string): void => {
  process.stderr.write(`${line}\n`);
};

/**
 * Reads the command line.
 *
 * @param argv - the arguments after `pnpm sync`
 * @returns the options, or a message saying what is wrong with them
 */
function parseArgs(argv: readonly string[]): { push: boolean; date?: string } | string {
  let push = true;
  let date: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--no-push") push = false;
    else if (arg === "--date") {
      const value = argv[++i];
      if (value === undefined || !isoDate.safeParse(value).success) {
        return `--date takes a day, YYYY-MM-DD`;
      }
      date = value;
    } else return `unknown argument ${arg}`;
  }
  return date === undefined ? { push } : { push, date };
}

const args = parseArgs(process.argv.slice(2));
if (typeof args === "string") {
  warn(args);
  warn(USAGE);
  process.exit(2);
}
const dbPath = process.env.AION_DB ?? join(ROOT, "data", "aion.db");

try {
  const result = await runSync(args, {
    root: ROOT,
    http: fetchHttp,
    run: nodeRunner(ROOT),
    now: () => new Date(),
    dbExists: () => existsSync(dbPath),
    log: say,
  });
  if (result.outcome === "push failed") {
    warn(`committed, but the push failed: ${result.message}`);
    warn("the commit stays local; push it once origin is reachable");
    process.exit(1);
  }
} catch (err) {
  warn(`sync failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
