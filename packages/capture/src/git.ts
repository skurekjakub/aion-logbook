/**
 * What git makes of a file: the object id of the blob it would store for
 * it, with the path's attributes (`text`, `eol`, `-text`) and git's own
 * text detection applied, so the ledger can hash the bytes git stores
 * rather than the bytes one working tree holds.
 *
 * @module
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

/**
 * Runs git in a folder.
 *
 * @param dir - the folder to run in
 * @param args - git's arguments
 * @returns its exit status and stdout; status `null` when git can't be started
 */
function git(dir: string, args: readonly string[]): { status: number | null; stdout: string } {
  const result = spawnSync("git", ["-C", dir, ...args], { encoding: "utf-8" });
  return { status: result.error ? null : result.status, stdout: result.stdout };
}

/**
 * Asks git for the blob id it would store for a file of its work tree,
 * without writing the object: `git hash-object` applies the path's
 * attributes and line-ending conversion.
 *
 * @param dir - a folder inside the work tree
 * @param path - the file, relative to `dir`
 * @returns the blob id (hex SHA-1, or SHA-256 in a SHA-256 repository);
 *   `null` when `dir` isn't in a git work tree or git can't be started
 * @throws if git is there but can't hash the file
 */
export function gitStoredBlobId(dir: string, path: string): string | null {
  const inside = git(dir, ["rev-parse", "--is-inside-work-tree"]);
  if (inside.status !== 0 || inside.stdout.trim() !== "true") return null;
  const hashed = git(dir, ["hash-object", "--", path]);
  if (hashed.status !== 0) throw new Error(`git hash-object ${path} failed in ${dir}`);
  return hashed.stdout.trim();
}

/**
 * Computes the blob id git gives some bytes.
 *
 * @param bytes - the blob's content
 * @param idLength - the length of the repository's ids: 40 for SHA-1, 64 for SHA-256
 * @returns the hex blob id
 */
export function blobId(bytes: Uint8Array, idLength: number): string {
  return createHash(idLength === 64 ? "sha256" : "sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}
