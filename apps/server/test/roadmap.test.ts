import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importAccount } from "../src/importers/account";
import { importRecord } from "../src/importers/import-record";
import type { Store } from "../src/repos";
import type { AccountSnapshotView } from "../src/services/account";
import type { BuildView, MacroView, SkillRow } from "../src/services/builds";
import type { AccountRoadmap } from "../src/services/roadmap";
import { deriveRoadmap } from "../src/services/roadmap";
import { copyFixture, makeTestApp, readJson, testStore } from "./helpers";

const ACCOUNT = join(import.meta.dirname, "fixtures", "account");

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * Builds a cleric skill row.
 *
 * @param slug - the skill's slug, e.g. `bolt`
 * @param name - its name
 * @returns the row
 */
function skill(slug: string, name: string): SkillRow {
  return {
    id: `cleric-${slug}`,
    class: "cleric",
    name,
    nameKr: null,
    kind: "active",
    unlockLevel: 1,
    cooldownSec: null,
    summary: null,
    recordSlug: "001-cleric-build",
  };
}

const BOLT = skill("bolt", "Bolt");
const CONDEMNATION = skill("condemnation", "Condemnation");
const CHAIN = skill("chain-of-torment", "Chain of Torment");
const DIVINE = skill("divine-aura", "Divine Aura");
const GUARD = skill("light-of-protection", "Light of Protection");
const PUNISH = skill("earth-punishment", "Earth Punishment");
const AURA = skill("noble-aura", "Noble Aura");
const PRAYER = skill("prayer-of-amplification", "Prayer of Amplification");

/**
 * Builds a macro chain of a build.
 *
 * @param id - the chain's id
 * @param steps - its steps' skills, in the editor's order
 * @returns the chain
 */
function chain(id: string, steps: SkillRow[]): MacroView {
  return {
    id,
    buildId: "cleric-leveling",
    position: 0,
    name: "Solo loop",
    key: "Right Mouse Button",
    delayMs: 10,
    why: "Hold it while fighting.",
    steps: steps.map((s, i) => ({ position: i + 1, note: null, skill: s })),
  };
}

/**
 * Builds a current cleric build.
 *
 * @param parts - the build's skill priorities, stigma slots and macro chains
 * @returns the build
 */
function build(parts: Partial<Pick<BuildView, "skills" | "stigmas" | "macros">>): BuildView {
  return {
    id: "cleric-leveling",
    class: "cleric",
    purpose: "leveling",
    title: "Leveling",
    why: "Kill fast alone.",
    confidence: "theory",
    position: 1,
    recordSlug: "001-cleric-build",
    obsoleteSince: null,
    obsoleteReason: null,
    sources: [],
    obsoleteSources: [],
    skills: [],
    stigmas: [],
    macros: [],
    ...parts,
  };
}

/**
 * Builds a cleric snapshot view at level 36.
 *
 * @param parts - the snapshot's skills, stigma slots and macro chains
 * @returns the snapshot
 */
function snapshot(
  parts: Partial<Pick<AccountSnapshotView, "skills" | "stigmas" | "macros" | "level">>,
): AccountSnapshotView {
  return {
    id: "2026-10-11",
    capturedAt: "2026-10-11T09:00:00+02:00",
    character: "Baon",
    class: "cleric",
    level: 36,
    gearScore: 749,
    server: "Fafnir (EU)",
    unread: [],
    skills: [],
    stigmas: [],
    macros: [],
    ...parts,
  };
}

/**
 * A skill as read in a snapshot, resolved to `row`.
 *
 * @param row - the skill
 * @param level - its level as read
 * @returns the read skill
 */
const read = (row: SkillRow, level: number | null) => ({
  name: row.name,
  skillId: row.id,
  level,
  slot: null,
});

describe("deriveRoadmap", () => {
  it("lists skills below target in rank order, the top ranks now and the rest next", () => {
    // Arrange
    const heal = skill("healing-light", "Healing Light");
    const targets = [CONDEMNATION, CHAIN, DIVINE, BOLT, heal].map((s, i) => ({
      rank: i + 1,
      targetLevel: 10,
      why: `${s.name} why.`,
      skill: s,
    }));
    const current = snapshot({
      skills: [
        read(BOLT, 9),
        read(DIVINE, 7),
        read(CHAIN, 10),
        read(CONDEMNATION, 8),
        read(heal, 1),
      ],
    });

    // Act
    const items = deriveRoadmap(current, [build({ skills: targets })]);

    // Assert
    expect(items.map((i) => [i.rank, i.priority, i.action])).toEqual([
      [1, "now", "Condemnation 8 → 10"],
      [2, "now", "Divine Aura 7 → 10"],
      [3, "now", "Bolt 9 → 10"],
      [4, "next", "Healing Light 1 → 10"],
    ]);
    expect(items[0]).toEqual({
      rank: 1,
      priority: "now",
      area: "skills",
      action: "Condemnation 8 → 10",
      why: "Condemnation why.",
      refs: [{ record: "001-cleric-build", id: "cleric-leveling" }],
      derived: true,
    });
  });

  it("skips a build skill the snapshot doesn't hold or holds without a level", () => {
    // Arrange
    const targets = [
      { rank: 1, targetLevel: 10, why: "a", skill: BOLT },
      { rank: 2, targetLevel: 10, why: "b", skill: CHAIN },
    ];
    const current = snapshot({ skills: [read(CHAIN, null)] });

    // Act
    const items = deriveRoadmap(current, [build({ skills: targets })]);

    // Assert
    expect(items).toEqual([]);
  });

  it("flags an open stigma slot that is empty or holds another stigma, now", () => {
    // Arrange
    const stigmas = [
      { slotLevel: 22, why: "Guard why.", skill: GUARD },
      { slotLevel: 27, why: "Punish why.", skill: PUNISH },
      { slotLevel: 32, why: "Aura why.", skill: AURA },
      { slotLevel: 37, why: "Prayer why.", skill: PRAYER },
    ];
    const current = snapshot({
      stigmas: [
        { slotLevel: 22, name: PRAYER.name, skillId: PRAYER.id },
        { slotLevel: 27, name: PUNISH.name, skillId: PUNISH.id },
        { slotLevel: 32, name: null, skillId: null },
        { slotLevel: 37, name: null, skillId: null },
      ],
    });

    // Act
    const items = deriveRoadmap(current, [build({ stigmas })]);

    // Assert
    expect(items.map((i) => [i.priority, i.area, i.action, i.why])).toEqual([
      [
        "now",
        "stigmas",
        "Swap Prayer of Amplification for Light of Protection (slot 22)",
        "Guard why.",
      ],
      ["now", "stigmas", "Slot Noble Aura (slot 32)", "Aura why."],
    ]);
  });

  it("lists a missing or differing macro chain next, and an unbound matching one", () => {
    // Arrange
    const solo = chain("cleric-leveling-solo", [PUNISH, CHAIN, CONDEMNATION]);
    const burst = { ...chain("cleric-leveling-burst", [PRAYER, BOLT]), name: "Burst" };
    const pull = { ...chain("cleric-leveling-pull", [CHAIN]), name: "Pull" };
    const steps = (rows: SkillRow[]) =>
      rows.map((r, i) => ({ position: i + 1, name: r.name, skillId: r.id }));
    const current = snapshot({
      macros: [
        { position: 1, name: "Preset 1", key: "R", steps: steps([CHAIN, BOLT]) },
        { position: 2, name: "Preset 2", key: null, steps: steps([CHAIN]) },
      ],
    });

    // Act
    const items = deriveRoadmap(current, [build({ macros: [solo, burst, pull] })]);

    // Assert
    expect(items.map((i) => [i.priority, i.area, i.action])).toEqual([
      ["next", "macro", "Rebuild Preset 1 as Solo loop"],
      ["next", "macro", "Build the Burst macro"],
      ["next", "macro", "Bind the Pull macro"],
    ]);
    expect(items[0]!.refs).toEqual([{ record: "001-cleric-build", id: "cleric-leveling-solo" }]);
    expect(items[2]!.why).toBe("Key: Right Mouse Button");
  });

  it("follows the first current build of the snapshot's class", () => {
    // Arrange
    const targets = [{ rank: 1, targetLevel: 10, why: "a", skill: BOLT }];
    const retired = { ...build({ skills: targets }), id: "old", obsoleteSince: "2026-10-01" };
    const other = { ...build({ skills: targets }), id: "glad", class: "gladiator" as const };
    const current = snapshot({ skills: [read(BOLT, 9)] });

    // Act
    const none = deriveRoadmap(current, [retired, other]);
    const followed = deriveRoadmap(current, [retired, other, build({ skills: targets })]);

    // Assert
    expect(none).toEqual([]);
    expect(followed.map((i) => i.refs)).toEqual([
      [{ record: "001-cleric-build", id: "cleric-leveling" }],
    ]);
  });
});

/**
 * Builds a store holding the fixture record, so the snapshot's skill names resolve.
 *
 * @returns the store
 */
function storeWithSkills(): Store {
  const store = testStore();
  const dir = copyFixture();
  temps.push(join(dir, ".."));
  importRecord(store, dir);
  return store;
}

describe("GET /api/account/roadmap", () => {
  it("answers no snapshot and no items when none is loaded", async () => {
    // Arrange
    const app = makeTestApp();

    // Act
    const res = await app.request("/api/account/roadmap");

    // Assert
    expect(await res.json()).toEqual({ snapshotId: null, items: [] });
  });

  it("derives items from the latest snapshot and the build, then merges the curated ones", async () => {
    // Arrange
    const store = storeWithSkills();
    importAccount(store, ACCOUNT, { all: true });
    const app = makeTestApp(store);

    // Act
    const got = await readJson<AccountRoadmap>(await app.request("/api/account/roadmap"));

    // Assert
    expect(got).toEqual({
      snapshotId: "2026-10-07",
      items: [
        {
          rank: 1,
          priority: "now",
          area: "skills",
          action: "Ruinous Blow 8 → 10",
          why: "Opener.",
          refs: [{ record: "900-fixture", id: "gladiator-leveling" }],
          derived: true,
        },
        {
          rank: 2,
          priority: "next",
          area: "macro",
          action: "Rebuild Opener as Main",
          why: "One key for the opener.",
          refs: [{ record: "900-fixture", id: "gladiator-leveling-main" }],
          derived: true,
        },
        {
          rank: 3,
          priority: "now",
          area: "skills",
          action: "Level Ruinous Blow to 10",
          why: "The build's opener.",
          refs: [{ record: "900-fixture", id: "gladiator-leveling" }],
          derived: false,
        },
        {
          rank: 4,
          priority: "later",
          area: "stigmas",
          action: "Slot a stigma at 27",
          why: "The slot is empty.",
          refs: [],
          derived: false,
        },
      ],
    });
  });

  it("keeps the curated items of the latest snapshot that has some, dropping a derived duplicate", async () => {
    // Arrange
    const store = storeWithSkills();
    importAccount(store, ACCOUNT, { all: true });
    store.repos.account.insertSnapshot({
      id: "2026-10-09",
      capturedAt: "2026-10-09T09:00:00+02:00",
      character: "Fixture",
      class: "gladiator",
      level: 34,
      gearScore: null,
      server: null,
      unread: [],
    });
    store.repos.account.insertSkills("2026-10-09", [
      { skillName: "Ruinous Blow", skillId: "gladiator-ruinous-blow", level: 8, slot: null },
    ]);
    store.repos.account.insertRoadmap("2026-10-07", [
      {
        rank: 3,
        priority: "now",
        area: "skills",
        action: "Ruinous Blow 8 → 10",
        why: "Duplicate.",
        refs: [],
      },
    ]);
    const app = makeTestApp(store);

    // Act
    const got = await readJson<AccountRoadmap>(await app.request("/api/account/roadmap"));

    // Assert
    expect(got.snapshotId).toBe("2026-10-09");
    expect(got.items.map((i) => [i.action, i.derived])).toEqual([
      ["Ruinous Blow 8 → 10", true],
      ["Build the Main macro", true],
      ["Level Ruinous Blow to 10", false],
      ["Slot a stigma at 27", false],
    ]);
  });

  it("ranks against the snapshot ?snapshot= names, and answers 404 for one not loaded", async () => {
    // Arrange
    const store = storeWithSkills();
    importAccount(store, ACCOUNT, { all: true });
    const app = makeTestApp(store);

    // Act
    const older = await readJson<AccountRoadmap>(
      await app.request("/api/account/roadmap?snapshot=2026-10-01"),
    );
    const missing = await app.request("/api/account/roadmap?snapshot=2026-01-01");

    // Assert
    expect(older).toEqual({
      snapshotId: "2026-10-01",
      items: [
        expect.objectContaining({ action: "Ruinous Blow 5 → 10", derived: true }),
        expect.objectContaining({ action: "Build the Main macro", derived: true }),
      ],
    });
    expect(missing.status).toBe(404);
  });
});
