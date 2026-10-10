import { rmSync } from "node:fs";
import { dirname } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importRecord } from "../src/importers/import-record";
import { exportSnapshot } from "../src/services/export";
import type { Snapshot } from "../src/services/export";
import { readOnlyHandler } from "../src/vercel";
import { copyFixture, testStore } from "./helpers";

const copies: string[] = [];
afterEach(() => {
  for (const dir of copies.splice(0)) rmSync(dirname(dir), { recursive: true, force: true });
});

/**
 * Builds a snapshot holding the fixture record, round-tripped through JSON
 * as the committed file is.
 *
 * @returns the snapshot
 */
function fixtureSnapshot(): Snapshot {
  const store = testStore();
  const dir = copyFixture();
  copies.push(dir);
  importRecord(store, dir);
  return JSON.parse(JSON.stringify(exportSnapshot(store))) as Snapshot;
}

describe("the Vercel handler", () => {
  it("serves the snapshot's records and builds from an in-memory database", async () => {
    // Arrange
    const handler = readOnlyHandler(fixtureSnapshot());

    // Act
    const records = await handler(new Request("https://aion.test/api/records"));
    const builds = await handler(new Request("https://aion.test/api/builds?class=gladiator"));

    // Assert
    expect(records.status).toBe(200);
    expect(await records.json()).toMatchObject([{ slug: "900-fixture", classes: ["gladiator"] }]);
    expect(builds.status).toBe(200);
    expect(await builds.json()).toMatchObject([
      { id: "gladiator-leveling", macros: [{ steps: [{ skill: { name: "Ruinous Blow" } }] }] },
    ]);
  });

  it("answers a write with 405 and the methods it allows", async () => {
    // Arrange
    const handler = readOnlyHandler(fixtureSnapshot());

    // Act
    const res = await handler(
      new Request("https://aion.test/api/skills", { method: "POST", body: "{}" }),
    );

    // Assert
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
  });

  it("passes the sync button's press through to the sync service", async () => {
    // Arrange
    const handler = readOnlyHandler(fixtureSnapshot());

    // Act
    const res = await handler(
      new Request("https://aion.test/api/account/sync", { method: "POST" }),
    );

    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "manual" });
  });

  it("answers HEAD like GET", async () => {
    // Arrange
    const handler = readOnlyHandler(fixtureSnapshot());

    // Act
    const res = await handler(new Request("https://aion.test/api/records", { method: "HEAD" }));

    // Assert
    expect(res.status).toBe(200);
  });
});
