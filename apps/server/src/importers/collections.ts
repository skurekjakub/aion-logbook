/**
 * The curated collections an import reads: how each collection file is
 * validated, what its rows reference, and how its rows are mapped into
 * write steps. A new curated collection is an entry here plus its file in
 * the record's `curated/manifest.json`; the reader and the writer need no
 * edits.
 *
 * @module
 */
import type { BuildInput } from "@aion/schema";
import {
  buildInput,
  glossaryInput,
  isoDate,
  mechanicInput,
  recommendationInput,
  skillInput,
  sourceId,
  sourceInput,
  takeawayInput,
  timelineEventInput,
} from "@aion/schema";
import { z } from "zod";
import { ImportError } from "../errors";
import type { InsertOf } from "../registry";
import type { GlossaryInsert } from "../repos/glossary";
import type { SourceInsert } from "../repos/sources";
import type { Collection } from "./collection-kit";
import {
  assertDistinct,
  checkObsoleteDates,
  citedRows,
  collection,
  parseRows,
} from "./collection-kit";
import { parseFile } from "./files";
import {
  GLOSSARY_FIELDS,
  SKILL_FIELDS,
  SOURCE_FIELDS,
  crossRecordGlossaryWarnings,
  glossaryWarnings,
  writeShared,
} from "./shared";
import { citeObsolescence, lifecycleColumns } from "./steps";

export type { CheckContext, Collection, PrepareContext, RowRefs } from "./collection-kit";

/** A curated row's `obsolete` block: since when, why, and the sources that say so. */
const obsoleteBlock = z.strictObject({
  since: isoDate,
  reason: z.string().min(1),
  sources: z.array(sourceId).min(1, "cite at least one source"),
});

/** `meta.json`: the record's last update and its framing lines. */
const seedMeta = z.strictObject({
  updated: isoDate,
  seasonLabel: z.string().min(1).nullish(),
  lede: z.string().min(1).nullish(),
  caveat: z.string().min(1).nullish(),
});

/** A row of `sources.json`. */
const seedSource = sourceInput.omit({ recordSlug: true }).strict();

/** A row of `glossary.json`. */
const seedGlossary = glossaryInput.omit({ recordSlug: true }).strict();

/** A row of `skills.json`. */
const seedSkill = skillInput.strict();

/** A row of `builds.json`: a build input, and its `obsolete` block once it is no longer current. */
const seedBuild = buildInput.safeExtend({ obsolete: obsoleteBlock.optional() }).strict();

/**
 * Lists every skill id a build names: its priorities, stigmas and macro steps.
 *
 * @param build - the build
 * @returns the skill ids, each once, in that order
 */
function skillIdsOf(build: BuildInput): string[] {
  return [
    ...new Set([
      ...build.skills.map((s) => s.skillId),
      ...build.stigmas.map((s) => s.skillId),
      ...build.macros.flatMap((m) => m.steps.map((s) => s.skillId)),
    ]),
  ];
}

/**
 * Every curated collection, by its key in the curated manifest, in write
 * order: a collection's rows only reference rows written before them.
 */
export const COLLECTIONS = {
  meta: collection({
    /** @inheritdoc */
    parse: (file, raw) => parseFile(file, raw, seedMeta),
    /** @inheritdoc */
    refs: () => [],
    /** @inheritdoc */
    prepare: (meta, { manifest }) => {
      const { classes, ...record } = manifest.record;
      const row = {
        ...record,
        updatedAt: meta.updated,
        seasonLabel: meta.seasonLabel ?? null,
        lede: meta.lede ?? null,
        caveat: meta.caveat ?? null,
      };
      return [
        (repos) => {
          repos.records.upsert(row);
          repos.records.replaceClasses(row.slug, classes);
        },
      ];
    },
  }),
  sources: collection({
    /** @inheritdoc */
    parse: (file, raw) => parseRows(file, raw, seedSource),
    /** @inheritdoc */
    refs: () => [],
    /** @inheritdoc */
    check: (file, sources) => {
      assertDistinct(
        file,
        "source id",
        sources.map((source) => source.id),
      );
    },
    /** @inheritdoc */
    prepare: (sources, { summaries }) => {
      const rows: SourceInsert[] = sources.map((source) => ({
        ...source,
        site: source.id.startsWith("yt:") ? "yt" : "web",
        summaryEn: source.summaryEn ?? summaries.get(source.id) ?? null,
      }));
      return [
        (repos, context) => {
          for (const row of rows) {
            const existing = repos.sources.get(row.id);
            /**
             * Stores the source.
             *
             * @param owned - the source, owned by the record
             */
            const write = (owned: SourceInsert) => {
              if (existing) repos.sources.update(row.id, owned);
              else repos.sources.insert(owned);
            };
            writeShared(existing, row, context, write, `source ${row.id}`, SOURCE_FIELDS);
          }
        },
      ];
    },
  }),
  glossary: collection({
    optional: true,
    /** @inheritdoc */
    parse: (file, raw) => parseRows(file, raw, seedGlossary),
    /** @inheritdoc */
    refs: () => [],
    /** @inheritdoc */
    check: (file, entries) => {
      assertDistinct(
        file,
        "kr",
        entries.map((entry) => entry.kr),
      );
    },
    /** @inheritdoc */
    warnings: (entries) => glossaryWarnings(entries),
    /** @inheritdoc */
    prepare: (entries) => [
      (repos, context) => {
        for (const row of entries) {
          /**
           * Upserts the entry.
           *
           * @param owned - the entry, owned by the record
           */
          const write = (owned: GlossaryInsert) => {
            repos.glossary.upsert(owned);
          };
          const label = `glossary entry "${row.kr}"`;
          writeShared(repos.glossary.get(row.kr), row, context, write, label, GLOSSARY_FIELDS);
        }
        for (const warning of crossRecordGlossaryWarnings(repos.glossary.list(), context.record)) {
          context.warn(warning);
        }
      },
    ],
  }),
  skills: collection({
    optional: true,
    /** @inheritdoc */
    parse: (file, raw) => parseRows(file, raw, seedSkill),
    /** @inheritdoc */
    refs: (skills) => skills.map((skill, index) => ({ row: index, sources: skill.sources })),
    /** @inheritdoc */
    check: (file, skills) => {
      assertDistinct(
        file,
        "skill id",
        skills.map((skill) => skill.id),
      );
    },
    /** @inheritdoc */
    prepare: (skills) => [
      (repos, context) => {
        for (const { sources, ...values } of skills) {
          const existing = repos.skills.get(values.id);
          /**
           * Stores the skill and its citations.
           *
           * @param owned - the skill, owned by the record
           */
          const write = (owned: InsertOf<"skills">) => {
            if (existing) repos.skills.update(values.id, owned);
            else repos.skills.insert(owned);
            repos.citations.replace("skill", values.id, sources);
          };
          writeShared(existing, values, context, write, `skill ${values.id}`, SKILL_FIELDS);
        }
      },
    ],
  }),
  builds: collection({
    optional: true,
    /** @inheritdoc */
    parse: (file, raw) => parseRows(file, raw, seedBuild),
    /** @inheritdoc */
    refs: (builds) =>
      builds.map((build, index) => ({
        row: index,
        sources: [...build.sources, ...(build.obsolete?.sources ?? [])],
      })),
    /** @inheritdoc */
    check: (file, builds, context) => {
      checkObsoleteDates(file, builds, context);
      assertDistinct(
        file,
        "build id",
        builds.map((build) => build.id),
      );
      const owners = new Map<string, string>();
      for (const build of builds) {
        for (const { id } of build.macros) {
          const other = owners.get(id);
          if (other !== undefined) {
            throw new ImportError(
              file,
              null,
              `record ${context.record}: builds[${other}] and builds[${build.id}] share macro id ${id}`,
            );
          }
          owners.set(id, build.id);
        }
      }
    },
    /** @inheritdoc */
    guard:
      (builds, { file, skillIds }) =>
      (repos, { record }) => {
        const outside = [...new Set(builds.flatMap(skillIdsOf))].filter((id) => !skillIds.has(id));
        const missing = new Set(repos.builds.missingSkills(outside));
        for (const build of builds) {
          const unknown = skillIdsOf(build).find((id) => missing.has(id));
          if (unknown !== undefined) {
            throw new ImportError(
              file,
              null,
              `record ${record}: builds[${build.id}] names unknown skill ${unknown}`,
            );
          }
          const held = repos.builds.get(build.id);
          if (held) {
            throw new ImportError(
              file,
              null,
              `record ${record}: builds[${build.id}] is already loaded by record ${held.recordSlug ?? "(none)"}`,
            );
          }
          const [taken] = repos.builds.takenMacros(build.macros.map((m) => m.id));
          if (taken) {
            const [macro, holder] = taken;
            const owner = repos.builds.get(holder)?.recordSlug ?? "(none)";
            throw new ImportError(
              file,
              null,
              `record ${record}: builds[${build.id}] and builds[${holder}] of record ${owner} share macro id ${macro}`,
            );
          }
        }
      },
    /** @inheritdoc */
    prepare: (builds) => [
      (repos, { record }) => {
        // Positions continue past the builds already loaded, so a record imported later lists after them.
        const first = repos.builds.nextPosition();
        builds.forEach((build, index) => {
          const { skills, stigmas, macros, sources, obsolete, ...values } = build;
          const position = first + index;
          repos.builds.insertAggregate({
            build: { ...values, position, recordSlug: record, ...lifecycleColumns(obsolete) },
            skills,
            stigmas,
            macros: macros.map(({ steps, ...macro }) => ({ macro, steps })),
          });
          repos.citations.replace("build", build.id, sources);
          citeObsolescence(repos, "build", build.id, obsolete);
        });
      },
    ],
  }),
  mechanics: citedRows(
    "mechanics",
    mechanicInput.omit({ recordSlug: true }).strict(),
    ({ sources: _sources, ...values }) => values,
  ),
  timeline: citedRows(
    "timeline",
    timelineEventInput.omit({ recordSlug: true }).strict(),
    ({ sources: _sources, ...values }) => values,
  ),
  takeaways: citedRows(
    "takeaways",
    takeawayInput.omit({ recordSlug: true, position: true }).strict(),
    ({ sources: _sources, ...values }, position) => ({ ...values, position }),
  ),
  recommendations: citedRows(
    "recommendations",
    recommendationInput.omit({ recordSlug: true }).strict(),
    ({ sources: _sources, ...values }) => values,
  ),
};

/** The curated collections by manifest key. */
export type Collections = typeof COLLECTIONS;

/** A curated collection's manifest key. */
export type CollectionName = keyof Collections;

/** The validated content of every collection, by manifest key. */
export type ParsedCollections = {
  [N in CollectionName]: Collections[N] extends Collection<infer P> ? P : never;
};

/**
 * `curated/manifest.json`: which file holds each collection, relative to
 * the curated directory. A collection marked `optional` may be left out;
 * an unknown collection fails.
 */
export const curatedManifest = z.strictObject({
  collections: z.strictObject(
    Object.fromEntries(
      Object.entries(COLLECTIONS).map(([name, c]) => [
        name,
        (c as Collection<unknown>).optional ? z.string().min(1).optional() : z.string().min(1),
      ]),
    ) as unknown as Record<CollectionName, z.ZodType<string | undefined>>,
  ),
});
