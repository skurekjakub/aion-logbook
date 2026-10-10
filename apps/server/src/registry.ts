/**
 * The content-type registry: every durable table, in foreign-key-safe
 * insert order, with what the server layers derive from it. The repos, the
 * services, the snapshot's tables, its restore order and counts, and the
 * importer's replace-clear order all come from this one declaration.
 *
 * Adding a cited content type is a table, its input schemas and its
 * `CITED_ENTITY` value in `@aion/schema`, an entry here, a `.route()`
 * line in `app.ts` (kept explicit so the typed client keeps every route's
 * types) and a view. `test/registry.test.ts` fails if the route or the
 * entity is missing, or if a declared list filter doesn't narrow its list.
 *
 * Some list filters come without declaring them. A table with a `class`
 * column gets `?class=`: where the column is NOT NULL it keeps the rows of
 * that class; where it is nullable (a finding that applies to every class
 * its record covers stores `null`) it keeps the rows of that class and the
 * class-wide rows of the records that cover it.
 * A table with the obsolete lifecycle (an `obsoleteSince` column) gets
 * `?current=`.
 *
 * This module is layer-neutral: it holds declarations only, and imports no
 * repo, service, route or drizzle query builder.
 *
 * @module
 */
import type { CitedEntity, Values } from "@aion/schema";
import {
  BUILD_PURPOSE,
  CLASS,
  SKILL_KIND,
  SOURCE_SITE,
  accountMacroSteps,
  accountMacros,
  accountRoadmapItems,
  accountSkills,
  accountSnapshots,
  accountStigmas,
  buildInput,
  buildPatch,
  buildSkills,
  buildStigmas,
  builds,
  captures,
  citations,
  factClaims,
  glossary,
  macroInput,
  macroPatch,
  macroSteps,
  macros,
  mechanicInput,
  mechanicPatch,
  mechanics,
  recommendationInput,
  recommendationPatch,
  recommendations,
  recordClasses,
  researchRecords,
  rngFactorInput,
  rngFactorPatch,
  rngFactors,
  skillInput,
  skillPatch,
  skills,
  slug,
  sources,
  takeawayInput,
  takeawayPatch,
  takeaways,
  timeline,
  timelineEventInput,
  timelineEventPatch,
} from "@aion/schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";

/** A column of `Row`, named by its JS key. */
export type ColumnOf<Row> = Extract<keyof Row, string>;

/**
 * One key of a list order: a column, ascending, or a column with its
 * direction, whether `null`s sort after every value, and `rank`, the
 * column's values in the order they sort (a value it doesn't list sorts
 * after them all).
 */
export type OrderKey<Row> =
  | ColumnOf<Row>
  | { column: ColumnOf<Row>; desc?: boolean; nullsLast?: boolean; rank?: readonly string[] };

/**
 * How a list filter matches a view:
 * - `equals`: the view's column equals the value (a number column, the
 *   value read as a number);
 * - `equalsOrCovered`: the view's column equals the value, or is `null`
 *   (a row that applies to every class its record covers) and the row's
 *   research record (`recordSlug`) covers the value or is `null`;
 * - `includes`: the view's array field (e.g. a record's `classes`)
 *   contains the value;
 * - `isNull`: the value `true` keeps the views whose column is null, and
 *   `false` those whose column isn't.
 */
export type FilterMatch<Row> =
  | { equals: ColumnOf<Row> }
  | { equalsOrCovered: ColumnOf<Row> }
  | { includes: string }
  | { isNull: ColumnOf<Row> };

/** A declared list filter: the query param's schema, and how its value matches a view. */
export interface ListFilter<Row> {
  /** Validates the `?name=` query value; an omitted param doesn't filter. */
  schema: z.ZodType<string>;
  /** How a validated value selects views. */
  match: FilterMatch<Row>;
}

/**
 * A list filter of any row shape, for code that reads filters generically.
 * Every {@link ListFilter} is one.
 */
export interface AnyListFilter {
  /** Validates the query value. */
  schema: z.ZodType<string>;
  /** How a validated value selects views. */
  match:
    { equals: string } | { equalsOrCovered: string } | { includes: string } | { isNull: string };
}

/** Declared list filters of any row shape, by query param name. */
export type AnyFilters = Readonly<Record<string, AnyListFilter>>;

/** The request schemas of a type served by the generic CRUD router. */
export interface ApiSpec {
  /** The `:id` path parameter. */
  id: z.ZodType;
  /** The `POST /` body, `sources` included. */
  input: z.ZodType;
  /** The `PATCH /:id` body, `sources` included. */
  patch: z.ZodType;
}

/** How the generic repo and content service handle a cited table. */
export interface ContentSpec<Row> {
  /** List order; defaults to ascending `id`. */
  order?: readonly OrderKey<Row>[];
}

/** One registered table. */
export interface TableSpec<T extends SQLiteTable = SQLiteTable> {
  /** The drizzle table. */
  table: T;
  /** The route the table is served under, relative to `/api`, when it has one. */
  path?: `/${string}`;
  /** The citation entity its rows are cited under, when they carry citations. */
  entity?: CitedEntity;
  /** The list filters `GET <path>` accepts, by query param name. */
  filters?: Readonly<Record<string, ListFilter<InferSelectModel<T>>>>;
  /** Request schemas, when the generic CRUD router serves it. */
  api?: ApiSpec;
  /** Present when the generic table repo and content service handle it. */
  content?: ContentSpec<InferSelectModel<T>>;
  /**
   * The column naming the research record that owns a row, when it isn't
   * `recordSlug` (see {@link recordColumnOf}).
   */
  record?: ColumnOf<InferSelectModel<T>>;
}

/** The `?class=` filter of a table whose `class` column is NOT NULL: the column equals a `CLASS`. */
const classFilter = { schema: z.enum(CLASS), match: { equals: "class" } } as const;

/**
 * The `?class=` filter of a table whose `class` column is nullable: the
 * column equals a `CLASS`, or is `null` on a row whose record covers it.
 */
const classWideFilter = { schema: z.enum(CLASS), match: { equalsOrCovered: "class" } } as const;

/** Either derived `?class=` filter. */
type ClassFilter = typeof classFilter | typeof classWideFilter;

/**
 * The `?current=` filter every table with the obsolete lifecycle gets:
 * `true` keeps the current rows, `false` the obsolete ones.
 */
const currentFilter = {
  schema: z.enum(["true", "false"]),
  match: { isNull: "obsoleteSince" },
} as const;

/** A column of the rows of `T`. */
type Columns<T extends SQLiteTable> = ColumnOf<InferSelectModel<T>>;

/**
 * A registry entry: the declared spec and its table, plus the derived
 * `class` filter when the table has a `class` column and the derived
 * `current` filter when it has the obsolete lifecycle.
 */
type Entry<T extends SQLiteTable, S> = S & { table: T } & ("class" extends Columns<T>
    ? { filters: { class: ClassFilter } }
    : unknown) &
  ("obsoleteSince" extends Columns<T> ? { filters: { current: typeof currentFilter } } : unknown);

/**
 * Declares one registry entry, keeping its literal types (the route path
 * above all) for the typed client. A table with a `class` column gets the
 * `class` list filter (the class-wide variant when the column is
 * nullable), and one with an `obsoleteSince` column the `current` filter,
 * without declaring them.
 *
 * @param table - the drizzle table
 * @param spec - everything else about it; a `filters.class` or
 *   `filters.current` it declares is replaced by the derived one
 * @returns the entry
 */
function entry<T extends SQLiteTable, const S extends Omit<TableSpec<T>, "table">>(
  table: T,
  spec: S,
): Entry<T, S> {
  const columns = table as unknown as Record<string, { notNull?: boolean } | undefined>;
  const classColumn = columns.class;
  const derived = {
    ...(classColumn !== undefined
      ? { class: classColumn.notNull ? classFilter : classWideFilter }
      : {}),
    ...(columns.obsoleteSince !== undefined ? { current: currentFilter } : {}),
  };
  const filters = Object.keys(derived).length > 0 ? { ...spec.filters, ...derived } : spec.filters;
  return { ...spec, table, ...(filters ? { filters } : {}) } as Entry<T, S>;
}

/** A positive integer `:id` path parameter, coerced from its string form. */
export const rowId = z.coerce.number().int().positive();

/** A non-empty free-text query value. */
const nonEmpty = z.string().min(1);

/** The `POST /api/macros` body: a macro chain and the build it belongs to. */
const macroCreate = z.intersection(macroInput, z.object({ buildId: slug }));

/**
 * Every durable table, keyed by its snapshot name, in foreign-key-safe
 * insert order: a table only references tables above it.
 */
export const REGISTRY = {
  sources: entry(sources, {
    path: "/sources",
    filters: {
      site: { schema: z.enum(SOURCE_SITE), match: { equals: "site" } },
      record: { schema: nonEmpty, match: { includes: "records" } },
    },
  }),
  researchRecords: entry(researchRecords, {
    path: "/records",
    record: "slug",
    filters: { class: { schema: z.enum(CLASS), match: { includes: "classes" } } },
  }),
  recordClasses: entry(recordClasses, {}),
  captures: entry(captures, {
    path: "/captures",
    filters: {
      record: { schema: nonEmpty, match: { equals: "recordSlug" } },
      path: { schema: nonEmpty, match: { equals: "path" } },
    },
  }),
  glossary: entry(glossary, { path: "/glossary" }),
  skills: entry(skills, {
    path: "/skills",
    entity: "skill",
    filters: { kind: { schema: z.enum(SKILL_KIND), match: { equals: "kind" } } },
    api: { id: slug, input: skillInput, patch: skillPatch },
    content: { order: ["class", "unlockLevel", "id"] },
  }),
  builds: entry(builds, {
    path: "/builds",
    entity: "build",
    filters: { purpose: { schema: z.enum(BUILD_PURPOSE), match: { equals: "purpose" } } },
    api: { id: slug, input: buildInput, patch: buildPatch },
  }),
  buildSkills: entry(buildSkills, {}),
  buildStigmas: entry(buildStigmas, {}),
  macros: entry(macros, {
    path: "/macros",
    entity: "macro",
    filters: { build: { schema: slug, match: { equals: "buildId" } } },
    api: { id: slug, input: macroCreate, patch: macroPatch },
  }),
  macroSteps: entry(macroSteps, {}),
  mechanics: entry(mechanics, {
    path: "/mechanics",
    entity: "mechanic",
    filters: { topic: { schema: nonEmpty, match: { equals: "topic" } } },
    api: { id: rowId, input: mechanicInput, patch: mechanicPatch },
    content: {},
  }),
  rngFactors: entry(rngFactors, {
    path: "/rng-factors",
    entity: "rng_factor",
    api: { id: rowId, input: rngFactorInput, patch: rngFactorPatch },
    content: {},
  }),
  timeline: entry(timeline, {
    path: "/timeline",
    entity: "timeline_event",
    api: { id: rowId, input: timelineEventInput, patch: timelineEventPatch },
    content: { order: ["date", "id"] },
  }),
  takeaways: entry(takeaways, {
    path: "/takeaways",
    entity: "takeaway",
    api: { id: rowId, input: takeawayInput, patch: takeawayPatch },
    content: { order: [{ column: "recordSlug", nullsLast: true }, "position", "id"] },
  }),
  recommendations: entry(recommendations, {
    path: "/recommendations",
    entity: "recommendation",
    filters: { record: { schema: nonEmpty, match: { equals: "recordSlug" } } },
    api: { id: rowId, input: recommendationInput, patch: recommendationPatch },
    content: {},
  }),
  citations: entry(citations, {}),
  factClaims: entry(factClaims, {}),
  // The character, owned by no record: `pnpm import:account` loads it, and `/api/account` serves it.
  accountSnapshots: entry(accountSnapshots, {}),
  accountSkills: entry(accountSkills, {}),
  accountStigmas: entry(accountStigmas, {}),
  accountMacros: entry(accountMacros, {}),
  accountMacroSteps: entry(accountMacroSteps, {}),
  accountRoadmapItems: entry(accountRoadmapItems, {}),
};

/** The registry's type. */
export type Registry = typeof REGISTRY;

/** A registered table's snapshot name. */
export type TableKey = keyof Registry;

/** A selected row of the registered table `K`. */
export type RowOf<K extends TableKey> = InferSelectModel<Registry[K]["table"]>;

/** An insert payload for the registered table `K`. */
export type InsertOf<K extends TableKey> = InferInsertModel<Registry[K]["table"]>;

/** A table the generic repo and content service handle. */
export type ContentKey = {
  [K in TableKey]: Registry[K] extends { content: object } ? K : never;
}[TableKey];

/** The column values a content type's create accepts: its input without `sources`. */
export type ValuesOf<K extends ContentKey> = Registry[K] extends {
  api: { input: infer I extends z.ZodType };
}
  ? Values<z.output<I>>
  : never;

/** The list filters of `K`, by name, each optional; empty when it declares none. */
export type FiltersOf<K extends TableKey> = Registry[K] extends { filters: infer F }
  ? { [N in keyof F]?: string }
  : Record<never, never>;

/** Every table's snapshot name, in registry (insert) order. */
export const TABLE_KEYS = Object.keys(REGISTRY) as TableKey[];

/** Every table the generic repo and content service handle, in registry order. */
export const CONTENT_KEYS = TABLE_KEYS.filter(
  (key): key is ContentKey => "content" in REGISTRY[key],
);

/**
 * The registry entry of `key`, widened to {@link TableSpec} for code that
 * reads any entry generically.
 *
 * @param key - a table's snapshot name
 * @returns its entry
 */
export function specOf(key: TableKey): TableSpec {
  return REGISTRY[key];
}

/**
 * The column naming the research record that owns a row of `key`: the
 * entry's declared `record` column, else `recordSlug` when the table has
 * one. A record's re-import clears the rows it owns.
 *
 * @param key - a table's snapshot name
 * @returns the column's JS name, or `undefined` for a table whose rows no
 *   record owns directly (child rows, citations, the character)
 */
export function recordColumnOf(key: TableKey): string | undefined {
  const { record, table } = specOf(key);
  if (record) return record;
  return (table as unknown as Record<string, unknown>).recordSlug !== undefined
    ? "recordSlug"
    : undefined;
}
