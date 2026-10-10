import type { AccountSnapshotFile } from "@aion/schema";
import { describe, expect, it } from "vitest";
import { loadSnapshot } from "../src/importers/account";
import { createServices } from "../src/services";
import { LIVE_REUSE_MS, liveId, liveSyncService } from "../src/services/live-sync";
import type { SyncService, SyncStart } from "../src/services/sync";
import { testStore } from "./helpers";

const NOW = new Date("2026-10-10T11:05:30Z");

/**
 * Builds a snapshot of Baon at a level.
 *
 * @param level - the character's level
 * @param macros - the macro chains it holds
 * @returns the snapshot
 */
function baon(level: number, macros: AccountSnapshotFile["macros"] = []): AccountSnapshotFile {
  return {
    schema: "aion-account-snapshot/1",
    capturedAt: "2026-10-10T09:00:00+02:00",
    character: { name: "Baon", class: "cleric", level, gearScore: 749, server: "Fafnir (EU)" },
    skills: [{ name: "Condemnation", level: 9, slot: "Q" }],
    stigmas: [{ slotLevel: 22, name: null }],
    macros,
    screens: [],
    unread: [],
  };
}

/**
 * Builds a saving service that records its presses.
 *
 * @param answer - what a press answers
 * @returns the service and how many presses it saw
 */
function recordingSave(answer: SyncStart = { status: "manual", url: "https://wf" }) {
  const presses = { count: 0 };
  const save: SyncService = {
    info: () => ({ mode: "manual", url: "https://wf" }),
    start: () => {
      presses.count += 1;
      return Promise.resolve(answer);
    },
  };
  return { save, presses };
}

/**
 * Builds a live sync over a store holding the committed 2026-10-10 snapshot.
 *
 * @param site - what the official site maps to, given the snapshot it carries from
 * @param save - the saving service
 * @param clock - the clock
 * @returns the service and the account service reading the same store
 */
function setup(
  site: (previous: AccountSnapshotFile | null) => AccountSnapshotFile,
  save: SyncService,
  clock: { now: Date } = { now: NOW },
) {
  const store = testStore();
  loadSnapshot(store, "2026-10-10", baon(36, [{ name: "Solo", key: "R", steps: ["Bolt"] }]));
  const { account } = createServices(store);
  const svc = liveSyncService({
    store,
    account,
    fetchSnapshot: (previous) => Promise.resolve(site(previous)),
    same: (a, b) => a.character.level === b.character.level,
    save,
    now: () => clock.now,
  });
  return { svc, account };
}

describe("liveSyncService", () => {
  it("loads the read into memory as the latest snapshot and starts saving it", async () => {
    // Arrange
    const { save, presses } = recordingSave();
    const { svc, account } = setup(() => baon(40), save);

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({
      status: "live",
      message: "Lv 40 · GS 749",
      save: { status: "manual", url: "https://wf" },
    });
    expect(account.overview().snapshot).toMatchObject({ id: liveId(NOW), level: 40 });
    expect(presses.count).toBe(1);
  });

  it("carries macros from the committed snapshot into the live read", async () => {
    // Arrange
    const { save } = recordingSave();
    const { svc, account } = setup(
      (previous) => ({ ...baon(40), macros: previous?.macros ?? [] }),
      save,
    );

    // Act
    await svc.start();

    // Assert
    expect(account.overview().snapshot?.macros).toMatchObject([
      { name: "Solo", key: "R", steps: [{ name: "Bolt" }] },
    ]);
  });

  it("doesn't save a read that matches the committed snapshot", async () => {
    // Arrange
    const { save, presses } = recordingSave();
    const { svc } = setup(() => baon(36), save);

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toMatchObject({ status: "live", save: { status: "unchanged" } });
    expect(presses.count).toBe(0);
  });

  it("reuses a read under a minute old instead of reading the site again", async () => {
    // Arrange
    let reads = 0;
    const { save } = recordingSave();
    const clock = { now: NOW };
    const { svc } = setup(
      () => {
        reads += 1;
        return baon(40);
      },
      save,
      clock,
    );
    await svc.start();
    clock.now = new Date(NOW.getTime() + LIVE_REUSE_MS - 1);

    // Act
    await svc.start();

    // Assert
    expect(reads).toBe(1);
  });

  it("replaces its previous live snapshot on a later read", async () => {
    // Arrange
    const { save } = recordingSave();
    const clock = { now: NOW };
    let level = 40;
    const { svc, account } = setup(() => baon(level), save, clock);
    await svc.start();
    clock.now = new Date(NOW.getTime() + LIVE_REUSE_MS + 60_000);
    level = 41;

    // Act
    await svc.start();

    // Assert
    expect(account.overview().snapshots.map((s) => s.id)).toEqual([
      "2026-10-10",
      liveId(clock.now),
    ]);
    expect(account.overview().snapshot?.level).toBe(41);
  });

  it("answers a site it can't read as failed, leaving the committed snapshot", async () => {
    // Arrange
    const { save } = recordingSave();
    const { svc, account } = setup(() => {
      throw new Error("the site answered 503");
    }, save);

    // Act
    const result = await svc.start();

    // Assert
    expect(result).toEqual({ status: "failed", message: "the site answered 503" });
    expect(account.overview().snapshot?.id).toBe("2026-10-10");
  });
});
