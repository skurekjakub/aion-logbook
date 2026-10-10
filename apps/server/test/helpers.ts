import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SourceSite } from "@aion/schema";
import { createApp } from "../src/app";
import { openDb } from "../src/db/client";
import { createStore } from "../src/repos";
import type { Store } from "../src/repos";
import { createServices } from "../src/services";

/**
 * Creates a fresh in-memory {@link Store} with every migration applied.
 * Each call gets its own isolated database, so tests don't share state.
 *
 * @returns a new store backed by an in-memory SQLite database
 */
export function testStore(): Store {
  return createStore(openDb(":memory:"));
}

/**
 * Builds the API over a fresh, migrated in-memory database.
 *
 * @param store - the store to serve; a new {@link testStore} when omitted
 * @returns the Hono app, ready for `app.request`
 */
export function makeTestApp(store: Store = testStore()) {
  return createApp(createServices(store));
}

/**
 * Inserts a minimal source row, for use as a citation target in tests. The
 * site is derived from the id's `<site>:` prefix.
 *
 * @param store - the store to insert into
 * @param id - a `<site>:<key>` source id, e.g. `web:a`
 * @throws if `id` already exists, or has no recognizable `<site>:` prefix
 */
export function addSource(store: Store, id: string): void {
  const site = id.split(":")[0] as SourceSite;
  store.repos.sources.insert({ id, site, url: `https://example.test/${id}` });
}

/**
 * Builds a JSON POST/PATCH request init, for use with `app.request`.
 *
 * @param body - the value to send, serialized as JSON
 * @param method - the request method
 * @returns a request init with a JSON content type
 */
export function jsonBody(body: unknown, method = "POST"): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** The fixture research record the importer tests load. */
export const FIXTURE_RECORD = join(import.meta.dirname, "fixtures", "records", "900-fixture");

/**
 * Copies the fixture record into a fresh temporary folder, so a test can
 * edit its files.
 *
 * @param slug - the copy's folder name and record slug
 * @returns the copy's record directory; the caller removes its parent
 */
export function copyFixture(slug = "900-fixture"): string {
  const dir = join(mkdtempSync(join(tmpdir(), "aion-record-")), slug);
  cpSync(FIXTURE_RECORD, dir, { recursive: true });
  editJson(dir, "import.json", (manifest: { record: { slug: string } }) => {
    manifest.record.slug = slug;
  });
  return dir;
}

/**
 * Rewrites a JSON file of a record with `mutate`.
 *
 * @param dir - the record directory
 * @param path - the file's record-relative path
 * @param mutate - edits the parsed file in place
 */
export function editJson<T>(dir: string, path: string, mutate: (value: T) => void): void {
  const value = JSON.parse(readFileSync(join(dir, path), "utf-8")) as T;
  mutate(value);
  writeFileSync(join(dir, path), JSON.stringify(value));
}

/**
 * Parses a response body as JSON with a caller-asserted shape, for test assertions only.
 *
 * @param res - the response
 * @returns the parsed body, unchecked
 */
export async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
