import type { GameClass, SourceSite } from "@aion/schema";
import { CITED_ENTITY, OBSOLESCENCE, OBSOLETE_ENTITIES } from "@aion/schema";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import type { hc } from "hono/client";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { AppType } from "../src/app";
import type { Registry, TableKey } from "../src/registry";
import { CONTENT_KEYS, REGISTRY, TABLE_KEYS, specOf } from "../src/registry";
import type { Store } from "../src/repos";
import { createServices } from "../src/services";
import { makeTestApp, testStore } from "./helpers";

/** The typed client's routes under `/api`, by first path segment. */
type ClientRoutes = ReturnType<typeof hc<AppType>>["api"];

/** Every registered route path, without its leading slash. */
type RegisteredPath = {
  [K in TableKey]: Registry[K] extends { path: `/${infer P}` } ? P : never;
}[TableKey];

/**
 * Creates one valid row of a table, with `over` applied on top.
 *
 * @returns the view field that identifies the row, and its value
 */
type Seed = (store: Store, over: Record<string, unknown>) => [string, unknown];

/** Two rows that differ on one filter, and the query value that selects the first. */
interface FilterCase {
  /** Overrides for the row the filter keeps. */
  match: Record<string, unknown>;
  /** Overrides for the row it drops. */
  other: Record<string, unknown>;
  /** The query value. */
  value: string;
}

let serial = 0;

/**
 * Returns a value no earlier call returned.
 *
 * @returns the next serial number
 */
const next = () => ++serial;

/** A finding's required columns, for the findings' seeds. */
const FINDING = { recordSlug: null };

/** How the filter test creates a row of each filtered table. */
const SEEDS: Partial<Record<TableKey, Seed>> = {
  sources: (store, over) => {
    const id = (over.id as string | undefined) ?? `web:s${next()}`;
    const site = id.split(":")[0] as SourceSite;
    store.repos.sources.insert({ url: "https://example.test", ...over, id, site });
    return ["id", id];
  },
  researchRecords: (store, over) => {
    const slug = `00${next()}-r`;
    store.repos.records.upsert({
      slug,
      question: "q",
      status: "active",
      startedAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    store.repos.records.replaceClasses(slug, (over.classes as GameClass[] | undefined) ?? []);
    return ["slug", slug];
  },
  captures: (store, over) => {
    const path = (over.path as string | undefined) ?? `evidence/c${next()}.md`;
    store.repos.captures.insertMany([
      {
        recordSlug: "001-a",
        capturedAt: "2026-01-01T00:00:00Z",
        tool: "manual",
        sha256: "0".repeat(64),
        ...over,
        path,
      },
    ]);
    return ["path", path];
  },
  skills: (store, over) => {
    const id = `gladiator-s${next()}`;
    store.repos.skills.insert({
      class: "gladiator",
      name: id,
      kind: "active",
      unlockLevel: 1,
      ...over,
      id,
    });
    return ["id", id];
  },
  builds: (store, over) => {
    const id = `b${next()}`;
    store.repos.builds.insert({
      class: "gladiator",
      purpose: "pve",
      title: "t",
      why: "w",
      confidence: "theory",
      ...over,
      id,
    });
    return ["id", id];
  },
  macros: (store, over) => {
    const buildId = (over.buildId as string | undefined) ?? `b${next()}`;
    if (!store.repos.builds.get(buildId)) {
      store.repos.builds.insert({
        id: buildId,
        class: "gladiator",
        purpose: "pve",
        title: "t",
        why: "w",
        confidence: "theory",
      });
    }
    const id = `m${next()}`;
    store.repos.builds.insertMacro({ id, buildId, name: "n", key: "R", delayMs: 0, why: "w" });
    return ["id", id];
  },
  mechanics: (store, over) => {
    const title = `m${next()}`;
    store.repos.mechanics.insert({ ...FINDING, body: "b", confidence: "posted", ...over, title });
    return ["title", title];
  },
  rngFactors: (store, over) => {
    const factor = `f${next()}`;
    store.repos.rngFactors.insert({ ...FINDING, effect: "e", ...over, factor });
    return ["factor", factor];
  },
  timeline: (store, over) => {
    const event = `e${next()}`;
    store.repos.timeline.insert({ ...FINDING, date: "2026-01-01", ...over, event });
    return ["event", event];
  },
  takeaways: (store, over) => {
    const text = `t${next()}`;
    store.repos.takeaways.insert({ ...FINDING, position: 0, ...over, text });
    return ["text", text];
  },
  recommendations: (store, over) => {
    const summary = `r${next()}`;
    store.repos.recommendations.insert({ changes: ["c"], ...over, summary });
    return ["summary", summary];
  },
};

/** The cases of the filters a table declares, by table then query param. */
const FILTER_CASES: Partial<Record<TableKey, Record<string, FilterCase>>> = {
  sources: {
    site: { match: { id: "yt:a" }, other: { id: "web:b" }, value: "yt" },
    record: { match: { recordSlug: "001-a" }, other: { recordSlug: null }, value: "001-a" },
  },
  researchRecords: {
    class: { match: { classes: ["cleric"] }, other: { classes: ["gladiator"] }, value: "cleric" },
  },
  captures: {
    record: { match: { recordSlug: "001-a" }, other: { recordSlug: "002-b" }, value: "001-a" },
    path: {
      match: { path: "evidence/a.md" },
      other: { path: "evidence/b.md" },
      value: "evidence/a.md",
    },
  },
  skills: { kind: { match: { kind: "stigma" }, other: { kind: "active" }, value: "stigma" } },
  builds: { purpose: { match: { purpose: "pvp" }, other: { purpose: "pve" }, value: "pvp" } },
  macros: { build: { match: { buildId: "bx" }, other: { buildId: "by" }, value: "bx" } },
  mechanics: { topic: { match: { topic: "macros" }, other: { topic: null }, value: "macros" } },
  recommendations: {
    record: { match: { recordSlug: "001-a" }, other: { recordSlug: null }, value: "001-a" },
  },
};

/** The derived `?class=` filter's case. */
const CLASS_CASE: FilterCase = {
  match: { class: "cleric" },
  other: { class: "gladiator" },
  value: "cleric",
};

/** The derived `?current=` filter's case. */
const CURRENT_CASE: FilterCase = {
  match: { obsoleteSince: null },
  other: { obsoleteSince: "2026-01-01", obsoleteReason: "r" },
  value: "true",
};

/**
 * Lists the routes the app mounts.
 *
 * @returns each route as `METHOD /path`
 */
function mountedRoutes(): Set<string> {
  return new Set(makeTestApp().routes.map((route) => `${route.method} ${route.path}`));
}

/**
 * Reads whether a table has a column, and whether it is NOT NULL.
 *
 * @param key - the table
 * @param name - the column's SQL name
 * @returns `undefined` without the column, else whether it is NOT NULL
 */
function column(key: TableKey, name: string): boolean | undefined {
  return getTableConfig(specOf(key).table).columns.find((c) => c.name === name)?.notNull;
}

describe("the content-type registry", () => {
  it("mounts every registered path, with the full CRUD verbs where the type declares request schemas", () => {
    // Act
    const routes = mountedRoutes();

    // Assert
    for (const key of TABLE_KEYS) {
      const { path, api } = specOf(key);
      if (!path) continue;
      const base = `/api${path}`;
      expect(routes, `${key}: GET ${base}`).toContain(`GET ${base}`);
      if (!api) continue;
      for (const route of [
        `GET ${base}/:id`,
        `POST ${base}`,
        `PATCH ${base}/:id`,
        `DELETE ${base}/:id`,
      ]) {
        expect(routes, `${key}: ${route}`).toContain(route);
      }
    }
  });

  it("types every registered path into the hono client", () => {
    // Assert
    expectTypeOf<Exclude<RegisteredPath, keyof ClientRoutes>>().toBeNever();
    expectTypeOf<ClientRoutes>().toHaveProperty("builds");
  });

  it("registers every cited entity exactly once, but obsolescence, which cites other tables' rows", () => {
    // Act
    const entities = TABLE_KEYS.flatMap((key) => specOf(key).entity ?? []);

    // Assert
    expect([...entities].sort()).toEqual(CITED_ENTITY.filter((e) => e !== OBSOLESCENCE).sort());
  });

  it("gives every content type a path, an entity and request schemas", () => {
    // Assert
    for (const key of CONTENT_KEYS) {
      const { path, entity, api } = specOf(key);
      expect(path, key).toBeDefined();
      expect(entity, key).toBeDefined();
      expect(api, key).toBeDefined();
    }
  });

  it("builds a repo and a service for every content type", () => {
    // Arrange
    const store = testStore();

    // Act
    const services = createServices(store);

    // Assert
    for (const key of CONTENT_KEYS) {
      expect(store.repos[key].count(), key).toBe(0);
      expect(services[key].list(), key).toEqual([]);
    }
  });

  it("gives every table with a class column a ?class= filter, keeping class-wide rows where the column is nullable", () => {
    // Assert
    for (const key of TABLE_KEYS) {
      const notNull = column(key, "class");
      const match = specOf(key).filters?.class?.match;
      if (notNull === true) expect(match, key).toEqual({ equals: "class" });
      else if (notNull === false) expect(match, key).toEqual({ equalsOrNull: "class" });
      else if (key === "researchRecords") expect(match, key).toEqual({ includes: "classes" });
      else expect(match, key).toBeUndefined();
    }
    expect(REGISTRY.mechanics.filters.class.match).toEqual({ equalsOrNull: "class" });
    expect(REGISTRY.builds.filters.class.schema.safeParse("chanter").success).toBe(true);
    expect(REGISTRY.builds.filters.class.schema.safeParse("warrior").success).toBe(false);
  });

  it("gives every table with an obsolete_since column a ?current= filter on it, and no other table one", () => {
    // Assert
    for (const key of TABLE_KEYS) {
      const { filters } = specOf(key);
      if (column(key, "obsolete_since") !== undefined) {
        expect(filters?.current?.match, key).toEqual({ isNull: "obsoleteSince" });
      } else {
        expect(filters?.current, key).toBeUndefined();
      }
    }
    expect(REGISTRY.builds.filters.current.schema.safeParse("yes").success).toBe(false);
  });

  it("gives the obsolete lifecycle to the tables whose entity OBSOLETE_ENTITIES names, and to no other", () => {
    // Act
    const withLifecycle = TABLE_KEYS.filter((key) => column(key, "obsolete_since") !== undefined);

    // Assert
    expect(withLifecycle.map((key) => specOf(key).entity).sort()).toEqual(
      [...OBSOLETE_ENTITIES].sort(),
    );
  });

  it("serves every declared list filter: each one narrows GET <path> to the matching row", async () => {
    // Arrange
    const filtered = TABLE_KEYS.filter(
      (key) => specOf(key).path && Object.keys(specOf(key).filters ?? {}).length > 0,
    );

    // Act & Assert
    expect(filtered.length).toBeGreaterThan(0);
    for (const key of filtered) {
      const seed = SEEDS[key];
      expect(seed, `${key} needs a seed in SEEDS`).toBeDefined();
      for (const name of Object.keys(specOf(key).filters!)) {
        const probe =
          FILTER_CASES[key]?.[name] ??
          (name === "class" ? CLASS_CASE : name === "current" ? CURRENT_CASE : undefined);
        expect(probe, `${key}?${name}= needs a case in FILTER_CASES`).toBeDefined();
        const store = testStore();
        const app = makeTestApp(store);
        const [field, wanted] = seed!(store, probe!.match);
        seed!(store, probe!.other);
        const url = `/api${specOf(key).path!}`;
        const all = (await (await app.request(url)).json()) as Record<string, unknown>[];
        expect(all, `${key}: both rows listed unfiltered`).toHaveLength(2);
        const res = await app.request(`${url}?${name}=${encodeURIComponent(probe!.value)}`);
        expect(res.status, `${key}?${name}=`).toBe(200);
        const rows = (await res.json()) as Record<string, unknown>[];
        expect(
          rows.map((row) => row[field]),
          `${key}?${name}=${probe!.value}`,
        ).toEqual([wanted]);
      }
    }
  }, 30_000);

  it("lists tables in foreign-key-safe order: every referenced table comes first", () => {
    // Arrange
    const position = new Map(TABLE_KEYS.map((key, index) => [REGISTRY[key].table, index] as const));

    // Assert
    for (const [index, key] of TABLE_KEYS.entries()) {
      for (const fk of getTableConfig(specOf(key).table).foreignKeys) {
        const referenced = position.get(fk.reference().foreignTable as never);
        expect(referenced, `${key} references a registered table`).toBeDefined();
        expect(referenced!, `${key} comes after the tables it references`).toBeLessThan(index);
      }
    }
  });
});
