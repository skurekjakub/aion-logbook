/**
 * A cache of file hashes kept on disk, so every process that verifies a
 * ledger (each vitest worker, each import, each `pnpm capture verify`)
 * reuses the hashes an earlier one computed instead of reading every
 * evidence file again. An entry is keyed by the file's absolute path and
 * holds while the file's size and mtime are the ones it was computed at.
 *
 * The cache is an optimisation only: a missing, unreadable or malformed
 * cache file reads as empty, and a failed save is dropped.
 *
 * @module
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative } from "node:path";
import { z } from "zod";

/** A file's hashes, with the size and mtime they were computed at. */
const cachedHashes = z.strictObject({
  size: z.number(),
  mtimeMs: z.number(),
  hashes: z.array(z.string()),
});
/** Output of {@link cachedHashes}. */
export type CachedHashes = z.output<typeof cachedHashes>;

/** The cache file: absolute path → the file's hashes. */
const cacheContent = z.record(z.string(), cachedHashes);

/**
 * Reads a cache file.
 *
 * @param file - the cache file's absolute path
 * @returns its entries; `{}` when it's missing, unreadable or malformed
 */
function readCacheFile(file: string): Record<string, CachedHashes> {
  try {
    const parsed = cacheContent.safeParse(JSON.parse(readFileSync(file, "utf-8")));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** File hashes by absolute path, in memory and, for files under a root folder, on disk. */
export class HashCache {
  private readonly entries = new Map<string, CachedHashes>();
  private readonly unsaved = new Set<string>();
  private loaded = false;

  /**
   * Builds a cache. Nothing is read until the first lookup.
   *
   * @param file - the cache file's absolute path, or `null` to keep the cache in memory only
   * @param root - the folder whose files the cache file keeps; a file
   *   outside it (a test's temporary record) is cached in memory only
   */
  constructor(
    private readonly file: string | null,
    private readonly root: string,
  ) {}

  /**
   * Returns a file's cached hashes, if they were computed at its current size and mtime.
   *
   * @param path - the file's absolute path
   * @param size - its current size, in bytes
   * @param mtimeMs - its current mtime, in milliseconds
   * @returns the hashes, or `undefined` when none are cached or the file changed since
   */
  lookup(path: string, size: number, mtimeMs: number): readonly string[] | undefined {
    this.load();
    const known = this.entries.get(path);
    return known?.size === size && known.mtimeMs === mtimeMs ? known.hashes : undefined;
  }

  /**
   * Caches a file's hashes, replacing any earlier entry; {@link save} writes it out.
   *
   * @param path - the file's absolute path
   * @param entry - its hashes, with the size and mtime they were computed at
   */
  store(path: string, entry: CachedHashes): void {
    this.load();
    this.entries.set(path, entry);
    if (this.keeps(path)) this.unsaved.add(path);
  }

  /**
   * Writes the entries stored since the last save to the cache file, over
   * whatever other processes saved meanwhile, and drops entries whose file
   * is gone. The file is replaced whole through a rename, so a concurrent
   * reader sees the old content or the new, never a mix. Does nothing
   * without a cache file or unsaved entries; a failure leaves the entries
   * unsaved.
   */
  save(): void {
    if (this.file === null || this.unsaved.size === 0) return;
    const tmp = `${this.file}.${process.pid}.tmp`;
    try {
      const merged = new Map(Object.entries(readCacheFile(this.file)));
      for (const path of this.unsaved) merged.set(path, this.entries.get(path)!);
      const kept = [...merged].filter(([path]) => existsSync(path));
      mkdirSync(dirname(this.file), { recursive: true });
      writeFileSync(tmp, JSON.stringify(Object.fromEntries(kept)));
      renameSync(tmp, this.file);
      this.unsaved.clear();
    } catch {
      try {
        rmSync(tmp, { force: true });
      } catch {
        // A leftover temp file is harmless; the next save from this process replaces it.
      }
    }
  }

  /** Reads the cache file into memory, once. */
  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (this.file === null) return;
    for (const [path, entry] of Object.entries(readCacheFile(this.file))) {
      if (!this.entries.has(path)) this.entries.set(path, entry);
    }
  }

  /**
   * Reports whether the cache file keeps a path's entry.
   *
   * @param path - an absolute path
   * @returns `true` if it lies under the cache's root folder
   */
  private keeps(path: string): boolean {
    const rel = relative(this.root, path);
    return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
  }
}
