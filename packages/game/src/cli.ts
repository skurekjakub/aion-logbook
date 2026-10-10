/**
 * `pnpm game <command> …`: capture the client, crop a shot, or send one input and capture the result. Every
 * command prints the path of the PNG it wrote.
 *
 * @module
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { CLIENT, crop, localDate, nextAfterName, pngFileSize, screenPath, shot } from "./capture";
import { drive, INPUT_VERBS, isInputVerb, usageOf } from "./input";
import { ahkExe, REPO_ROOT } from "./paths";
import { nodeRunner } from "./runner";

const USAGE = [
  "shot <name>",
  "crop <name> <x> <y> <w> <h> [--scale <n>]",
  ...INPUT_VERBS.map(usageOf),
];

/** A command line that doesn't match any usage. */
class UsageError extends Error {}

/**
 * Captures the client and warns on stderr when the frame isn't the size every coordinate assumes.
 *
 * @param date - the day's folder
 * @param name - shot name
 * @returns the PNG's path
 * @throws whatever `shot` throws
 */
async function capture(date: string, name: string): Promise<string> {
  const path = await shot({ root: REPO_ROOT, date, name, run: nodeRunner });
  const { width, height } = pngFileSize(path);
  if (width !== CLIENT.width || height !== CLIENT.height)
    process.stderr.write(
      `warning: frame is ${width}×${height}, coordinates assume ${CLIENT.width}×${CLIENT.height}\n`,
    );
  return path;
}

/**
 * Runs one command.
 *
 * @param argv - the arguments after `pnpm game`
 * @returns the path of the PNG written
 * @throws UsageError on a malformed command line; otherwise whatever capture or input throws
 */
async function main(argv: string[]): Promise<string> {
  const [cmd = "", ...rest] = argv;
  const date = localDate(new Date());
  if (cmd === "shot") {
    if (rest.length !== 1) throw new UsageError("shot takes <name>");
    return capture(date, rest[0]!);
  }
  if (cmd === "crop") {
    const scaleAt = rest.indexOf("--scale");
    const scale = scaleAt === -1 ? 1 : Number(rest.splice(scaleAt, 2)[1]);
    const [name, ...nums] = rest;
    if (name == null || nums.length !== 4)
      throw new UsageError("crop takes <name> <x> <y> <w> <h>");
    const [x, y, w, h] = nums.map(Number) as [number, number, number, number];
    return crop({ root: REPO_ROOT, date, name, rect: { x, y, w, h }, scale, run: nodeRunner });
  }
  if (isInputVerb(cmd)) {
    await drive(cmd, rest, { run: nodeRunner, ahk: ahkExe() });
    const dir = dirname(screenPath(REPO_ROOT, date, "x"));
    const existing = existsSync(dir) ? readdirSync(dir) : [];
    return capture(date, nextAfterName(existing, cmd));
  }
  throw new UsageError(cmd ? `unknown command "${cmd}"` : "no command");
}

try {
  process.stdout.write(`${await main(process.argv.slice(2))}\n`);
} catch (err) {
  if (err instanceof UsageError) {
    process.stderr.write(`${err.message}\n\nUsage: pnpm game\n  ${USAGE.join("\n  ")}\n`);
    process.exitCode = 2;
  } else {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}
