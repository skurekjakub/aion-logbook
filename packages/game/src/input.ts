/**
 * Drives the client's menus through `tools/aion-input/aion.ahk`, an AutoHotkey v2 script that focuses the
 * AION2 window and sends ordinary keyboard and mouse input to it. Arguments are checked here, before
 * anything reaches the game.
 *
 * @module
 */
import { CLIENT } from "./capture";
import { AHK_SCRIPT } from "./paths";
import type { Runner } from "./runner";

/** The input verbs `aion.ahk` understands. */
export const INPUT_VERBS = ["focus", "back", "key", "click", "rclick", "drag", "scroll"] as const;

/** One input verb. */
export type InputVerb = (typeof INPUT_VERBS)[number];

/** Each verb's argument list, as shown in usage and errors. */
const SHAPES: Record<InputVerb, string> = {
  focus: "",
  back: "",
  key: "<keys>",
  click: "<x> <y>",
  rclick: "<x> <y>",
  drag: "<x1> <y1> <x2> <y2>",
  scroll: "<x> <y> <notches>",
};

/** Most wheel notches one `scroll` may send; a longer list is scrolled in steps, reading each. */
const MAX_NOTCHES = 20;

/** What `aion.ahk`'s exit codes mean. */
const EXIT_CODES: Record<number, string> = {
  2: "AION2 window not found",
  3: "AION2 window didn't come to the front, or lost it mid-action",
  4: "aion.ahk didn't understand the verb or its arguments",
};

/**
 * Tells whether a word is an input verb.
 *
 * @param word - the CLI's first argument
 * @returns whether `word` is an `InputVerb`
 */
export function isInputVerb(word: string): word is InputVerb {
  return (INPUT_VERBS as readonly string[]).includes(word);
}

/**
 * Formats a verb's usage line.
 *
 * @param verb - the input verb
 * @returns `<verb> <args>`
 */
export function usageOf(verb: InputVerb): string {
  return `${verb} ${SHAPES[verb]}`.trim();
}

/**
 * Parses a whole number.
 *
 * @param s - the argument
 * @returns the number
 * @throws if `s` isn't an integer
 */
function whole(s: string): number {
  if (!/^-?\d+$/.test(s)) throw new Error(`"${s}" isn't a whole number`);
  return Number(s);
}

/**
 * Throws unless the point lies inside the client.
 *
 * @param x - horizontal client coordinate
 * @param y - vertical client coordinate
 * @throws if the point is outside the client
 */
function checkPoint(x: string, y: string): void {
  const px = whole(x);
  const py = whole(y);
  if (px < 0 || py < 0 || px >= CLIENT.width || py >= CLIENT.height)
    throw new Error(`(${px}, ${py}) is outside the client (${CLIENT.width}×${CLIENT.height})`);
}

/**
 * Builds the AutoHotkey arguments for one input: the script, the verb and its arguments, checked first.
 * `/ErrorStdOut` sends script errors to stderr instead of a dialog that would wait for a click.
 *
 * @param verb - the input verb
 * @param args - the verb's arguments, as typed
 * @returns the AutoHotkey argument list
 * @throws if the argument count is wrong, a coordinate isn't a whole number inside the client, or the notch
 *   count is zero or too large
 */
export function ahkArgs(verb: InputVerb, args: string[]): string[] {
  const want = SHAPES[verb] === "" ? 0 : SHAPES[verb].split(" ").length;
  if (args.length !== want || (verb === "key" && args[0] === ""))
    throw new Error(`${verb} takes ${SHAPES[verb] || "no arguments"}`);
  if (verb === "click" || verb === "rclick" || verb === "scroll") checkPoint(args[0]!, args[1]!);
  if (verb === "drag") {
    checkPoint(args[0]!, args[1]!);
    checkPoint(args[2]!, args[3]!);
  }
  if (verb === "scroll") {
    const n = whole(args[2]!);
    if (n === 0 || Math.abs(n) > MAX_NOTCHES)
      throw new Error(`scroll takes 1–${MAX_NOTCHES} notches either way, got ${n}`);
  }
  return ["/ErrorStdOut", AHK_SCRIPT, verb, ...args];
}

/** How `drive` reaches AutoHotkey. */
export interface DriveOptions {
  run: Runner;
  /** Absolute path of `AutoHotkey64.exe`. */
  ahk: string;
}

/**
 * Sends one input to the game through `aion.ahk`.
 *
 * @param verb - the input verb
 * @param args - the verb's arguments, as typed
 * @param opts - the runner and the AutoHotkey interpreter
 * @throws if the arguments are invalid, or the script exits non-zero (the message says why)
 */
export async function drive(verb: InputVerb, args: string[], opts: DriveOptions): Promise<void> {
  const { code, stdout, stderr } = await opts.run(opts.ahk, ahkArgs(verb, args));
  if (code === 0) return;
  const detail = [stdout, stderr ?? ""].join("\n").trim();
  throw new Error(`${EXIT_CODES[code] ?? `aion.ahk exited ${code}`}${detail ? `\n${detail}` : ""}`);
}
