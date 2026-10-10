import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CaptureContext } from "../src/context";
import type { Fetch } from "../src/http";
import { HttpClient } from "../src/http";

/** The test fixtures folder. */
export const FIXTURES = join(import.meta.dirname, "fixtures");

/**
 * Reads a fixture as text.
 *
 * @param path - the path under `fixtures/`
 * @returns its content
 */
export function fixture(path: string): string {
  return readFileSync(join(FIXTURES, path), "utf-8");
}

/**
 * Creates a record folder at the root of a new git work tree whose
 * attributes are the repo's (`* text=auto eol=lf`) plus `-text` for
 * `evidence/raw/`, where a record keeps captures byte for byte.
 *
 * @returns the record folder's absolute path
 * @throws if git can't create the work tree
 */
export function gitRecord(): string {
  const dir = mkdtempSync(join(tmpdir(), "aion-git-record-"));
  const init = spawnSync("git", ["-C", dir, "init", "-q"], { encoding: "utf-8" });
  if (init.status !== 0) throw new Error(`git init failed: ${init.stderr}`);
  writeFileSync(join(dir, ".gitattributes"), "* text=auto eol=lf\nevidence/raw/** -text\n");
  return dir;
}

/** One canned answer: a body and, optionally, a status and headers. */
export interface Canned {
  body: string | Uint8Array;
  status?: number;
  headers?: Record<string, string>;
}

/** A request the fake fetch saw. */
export interface SeenRequest {
  url: string;
  init: RequestInit;
}

/**
 * Builds a fetch that answers from canned responses, matched by the first
 * route whose test passes, and 404 otherwise.
 *
 * @param routes - `[test, answer]` pairs; a string test matches a URL prefix
 * @param seen - where to record every request
 * @returns the fetch
 */
export function fakeFetch(
  routes: ReadonlyArray<readonly [string | RegExp, Canned | ((url: string) => Canned)]>,
  seen: SeenRequest[] = [],
): Fetch {
  return (url, init) => {
    seen.push({ url, init });
    const route = routes.find(([test]) =>
      typeof test === "string" ? url.startsWith(test) : test.test(url),
    );
    if (!route) return Promise.resolve(new Response("not found", { status: 404 }));
    const answer = typeof route[1] === "function" ? route[1](url) : route[1];
    return Promise.resolve(
      new Response(answer.body as ConstructorParameters<typeof Response>[0], {
        status: answer.status ?? 200,
        headers: answer.headers,
      }),
    );
  };
}

/** A clock fixed at 2026-09-27T14:45:36Z, shown at +02:00 as the Python captures were. */
export const FIXED_NOW = new Date("2026-09-27T14:45:36Z");

/**
 * Builds a scraper context over a temporary record folder, a fake fetch,
 * a fixed clock at +02:00, and no delays.
 *
 * @param fetch - the fake fetch
 * @param tool - the ledger tool
 * @param at - the clock's instant
 * @returns the context and the log it writes to
 */
export function testContext(
  fetch: Fetch,
  tool: string,
  at: Date = FIXED_NOW,
): { context: CaptureContext; logs: string[] } {
  const logs: string[] = [];
  const recordDir = mkdtempSync(join(tmpdir(), "aion-capture-"));
  const http = new HttpClient({
    userAgent: "test",
    delayMs: 0,
    fetch,
    sleep: () => Promise.resolve(),
  });
  return {
    context: {
      recordDir,
      http,
      tool,
      now: () => at,
      offsetAt: () => 120,
      log: (m) => void logs.push(m),
    },
    logs,
  };
}
