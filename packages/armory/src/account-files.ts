/**
 * Reads and writes the character's files under `account/`: the identity
 * the sync reads (`character.json`) and the snapshots
 * (`snapshots/<id>.json`, ids leading with the day they were read).
 *
 * @module
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AccountSnapshotFile } from "@aion/schema";
import { accountSnapshotFile } from "@aion/schema";
import type { z } from "zod";
import type { CharacterFile } from "./fetch";
import { characterFile } from "./fetch";

/** The character file's path, relative to the repo root. */
export const CHARACTER_PATH = "account/character.json";

/** The snapshots folder, relative to the repo root. */
export const SNAPSHOT_DIR = "account/snapshots";

/** A file under `account/` that is missing, isn't JSON or fails its schema. */
export class AccountFileError extends Error {
  override name = "AccountFileError";
}

/** A snapshot read from disk. */
export interface StoredSnapshot {
  /** The file's name without `.json`, e.g. `2026-10-10`. */
  id: string;
  /** Its contents. */
  data: AccountSnapshotFile;
}

/**
 * Reads and validates a JSON file.
 *
 * @param root - the repo root
 * @param path - the file, relative to the root
 * @param schema - the schema it must pass
 * @returns the parsed file
 * @throws {AccountFileError} naming the file, if it is missing, isn't JSON or fails the schema
 */
function readFile<S extends z.ZodType>(root: string, path: string, schema: S): z.output<S> {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(join(root, path), "utf-8"));
  } catch (err) {
    throw new AccountFileError(`${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new AccountFileError(`${path}: ${issues.join("; ")}`);
  }
  return result.data;
}

/**
 * Renders a value as JSON indented by two spaces, with an object that sits
 * in an array and holds no object or array on one line, so a snapshot's
 * skill or stigma slot is one line and a change to it is a one-line diff.
 *
 * @param value - a JSON value
 * @param indent - the indentation of the line the value starts on
 * @param inArray - whether the value is an element of an array
 * @returns the JSON text
 */
export function formatJson(value: unknown, indent = "", inArray = false): string {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((item) => `${inner}${formatJson(item, inner, true)}`);
    return `[\n${items.join(",\n")}\n${indent}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    if (inArray && entries.every(([, v]) => v === null || typeof v !== "object")) {
      return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ")} }`;
    }
    const fields = entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${formatJson(v, inner)}`);
    return `{\n${fields.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

/**
 * Writes a value as JSON ({@link formatJson}) with a trailing newline.
 *
 * @param root - the repo root
 * @param path - the file, relative to the root
 * @param value - the value
 */
function writeFile(root: string, path: string, value: unknown): void {
  writeFileSync(join(root, path), `${formatJson(value)}\n`);
}

/**
 * Reads `account/character.json`.
 *
 * @param root - the repo root
 * @returns the character the sync reads
 * @throws {AccountFileError} if the file is missing, isn't JSON or fails its schema
 */
export function readCharacter(root: string): CharacterFile {
  return readFile(root, CHARACTER_PATH, characterFile);
}

/**
 * Writes `account/character.json`.
 *
 * @param root - the repo root
 * @param character - the character
 */
export function writeCharacter(root: string, character: CharacterFile): void {
  writeFile(root, CHARACTER_PATH, character);
}

/**
 * Reads the latest snapshot whose id's day is on or before `day`.
 *
 * @param root - the repo root
 * @param day - the last day to consider, `YYYY-MM-DD`
 * @returns the snapshot, or `null` when there is none
 * @throws {AccountFileError} if that snapshot isn't JSON or fails its schema
 */
export function latestSnapshot(root: string, day: string): StoredSnapshot | null {
  const dir = join(root, SNAPSHOT_DIR);
  if (!existsSync(dir)) return null;
  const id = readdirSync(dir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}(?:[^\d].*)?\.json$/.test(name))
    .map((name) => name.slice(0, -".json".length))
    .filter((name) => name.slice(0, 10) <= day)
    .sort()
    .at(-1);
  if (id === undefined) return null;
  return { id, data: readFile(root, snapshotPath(id), accountSnapshotFile) };
}

/**
 * The path of a snapshot file.
 *
 * @param id - the snapshot's id
 * @returns its path, relative to the repo root
 */
export function snapshotPath(id: string): string {
  return `${SNAPSHOT_DIR}/${id}.json`;
}

/**
 * Writes a snapshot as `account/snapshots/<id>.json`, replacing any file of that id.
 *
 * @param root - the repo root
 * @param id - the snapshot's id
 * @param snapshot - the snapshot
 * @returns the file's path, relative to the repo root
 */
export function writeSnapshot(root: string, id: string, snapshot: AccountSnapshotFile): string {
  const path = snapshotPath(id);
  writeFile(root, path, snapshot);
  return path;
}
