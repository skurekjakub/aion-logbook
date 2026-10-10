import { buildSkills, buildStigmas, builds, macroSteps, macros, skills } from "@aion/schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { asc, count, eq, inArray, max } from "drizzle-orm";
import type { Db } from "../db/client";

/** A row of `builds`. */
export type BuildRow = InferSelectModel<typeof builds>;
/** Insert payload for {@link BuildsRepo.insert}. */
export type BuildInsert = InferInsertModel<typeof builds>;
/** A row of `build_skills`. */
export type BuildSkillRow = InferSelectModel<typeof buildSkills>;
/** A skill priority of a build, without the `id`/`buildId` the repo assigns. */
export type BuildSkillInsert = Omit<InferInsertModel<typeof buildSkills>, "id" | "buildId">;
/** A row of `build_stigmas`. */
export type BuildStigmaRow = InferSelectModel<typeof buildStigmas>;
/** A stigma slot of a build, without the `id`/`buildId` the repo assigns. */
export type BuildStigmaInsert = Omit<InferInsertModel<typeof buildStigmas>, "id" | "buildId">;
/** A row of `macros`. */
export type MacroRow = InferSelectModel<typeof macros>;
/** Insert payload for {@link BuildsRepo.insertMacro}. */
export type MacroInsert = InferInsertModel<typeof macros>;
/** A row of `macro_steps`. */
export type MacroStepRow = InferSelectModel<typeof macroSteps>;
/** A step of a macro chain, without the `id`/`macroId` the repo assigns. */
export type MacroStepInsert = Omit<InferInsertModel<typeof macroSteps>, "id" | "macroId">;

/** A macro chain with its steps, as {@link BuildsRepo.insertAggregate} writes it. */
export interface MacroAggregate {
  /** The chain, without the build it belongs to. */
  macro: Omit<MacroInsert, "buildId">;
  /** Its steps, each with its position. */
  steps: readonly MacroStepInsert[];
}

/** A build with every child row, as {@link BuildsRepo.insertAggregate} writes it. */
export interface BuildAggregate {
  /** The build row. */
  build: BuildInsert;
  /** Its skill priorities. */
  skills: readonly BuildSkillInsert[];
  /** Its stigma slots. */
  stigmas: readonly BuildStigmaInsert[];
  /** Its macro chains. */
  macros: readonly MacroAggregate[];
}

/**
 * CRUD over the builds aggregate: `builds`, each build's skill priorities
 * (`build_skills`), stigma slots (`build_stigmas`) and macro chains
 * (`macros`, with their `macro_steps`). Child rows are replaced as a whole;
 * deleting a build cascades to all of them through the schema's foreign keys.
 */
export interface BuildsRepo {
  /** Returns every build, ordered by `position` then `id`. */
  list(): BuildRow[];
  /**
   * Returns the build with `id`, or `undefined` if there is none.
   *
   * @param id - the build's slug id
   */
  get(id: string): BuildRow | undefined;
  /**
   * Inserts a build.
   *
   * @param row - the build
   * @returns the inserted row
   * @throws if `id` already exists or a NOT NULL column is missing
   */
  insert(row: BuildInsert): BuildRow;
  /**
   * Inserts a build with its skill priorities, stigma slots, macro chains
   * (positioned from 1 in list order) and their steps. Run it inside a
   * transaction: a failure part-way leaves the rows written before it.
   *
   * @param aggregate - the build and its children
   * @returns the inserted build row
   * @throws if the build or a macro id already exists, a rank, slot or step
   *   position repeats, or a skill id doesn't exist
   */
  insertAggregate(aggregate: BuildAggregate): BuildRow;
  /**
   * Updates the build with `id`, merging in `patch`.
   *
   * @param id - the build's slug id
   * @param patch - the columns to change
   * @returns the updated row, or `undefined` if `id` doesn't exist
   */
  update(id: string, patch: Partial<BuildInsert>): BuildRow | undefined;
  /**
   * Deletes the build with `id`; its skills, stigmas, macros and steps cascade.
   *
   * @param id - the build's slug id
   * @returns `true` if a row was deleted, `false` if `id` didn't exist
   */
  remove(id: string): boolean;
  /** Returns one past the highest existing `position`, or `0` if `builds` is empty. */
  nextPosition(): number;
  /** Returns the number of builds. */
  count(): number;
  /**
   * Returns the skill priorities of `buildIds`, ordered by build then rank.
   *
   * @param buildIds - build ids to look up; `[]` returns `[]`
   */
  skills(buildIds: readonly string[]): BuildSkillRow[];
  /**
   * Returns the stigma slots of `buildIds`, ordered by build then slot level.
   *
   * @param buildIds - build ids to look up; `[]` returns `[]`
   */
  stigmas(buildIds: readonly string[]): BuildStigmaRow[];
  /**
   * Replaces every skill priority of `buildId`.
   *
   * @param buildId - the build
   * @param rows - the new priorities
   * @throws if a rank repeats or a skill id doesn't exist
   */
  replaceSkills(buildId: string, rows: readonly BuildSkillInsert[]): void;
  /**
   * Replaces every stigma slot of `buildId`.
   *
   * @param buildId - the build
   * @param rows - the new slots
   * @throws if a slot repeats or a skill id doesn't exist
   */
  replaceStigmas(buildId: string, rows: readonly BuildStigmaInsert[]): void;
  /** Returns every macro chain, ordered by build, then position, then `id`. */
  macros(): MacroRow[];
  /**
   * Returns the macro chains of `buildIds`, ordered by build, then position, then `id`.
   *
   * @param buildIds - build ids to look up; `[]` returns `[]`
   */
  macrosOf(buildIds: readonly string[]): MacroRow[];
  /**
   * Returns one past the highest macro position of `buildId`, or 1 when it has no chains.
   *
   * @param buildId - the build
   */
  nextMacroPosition(buildId: string): number;
  /**
   * Returns the macro chain with `id`, or `undefined` if there is none.
   *
   * @param id - the macro's slug id
   */
  getMacro(id: string): MacroRow | undefined;
  /**
   * Inserts a macro chain.
   *
   * @param row - the macro
   * @returns the inserted row
   * @throws if `id` already exists or its build doesn't
   */
  insertMacro(row: MacroInsert): MacroRow;
  /**
   * Updates the macro chain with `id`, merging in `patch`.
   *
   * @param id - the macro's slug id
   * @param patch - the columns to change
   * @returns the updated row, or `undefined` if `id` doesn't exist
   */
  updateMacro(id: string, patch: Partial<MacroInsert>): MacroRow | undefined;
  /**
   * Deletes the macro chain with `id`; its steps cascade.
   *
   * @param id - the macro's slug id
   * @returns `true` if a row was deleted, `false` if `id` didn't exist
   */
  removeMacro(id: string): boolean;
  /**
   * Returns the steps of `macroIds`, ordered by macro then position.
   *
   * @param macroIds - macro ids to look up; `[]` returns `[]`
   */
  steps(macroIds: readonly string[]): MacroStepRow[];
  /**
   * Replaces every step of `macroId`.
   *
   * @param macroId - the macro
   * @param rows - the new steps, each with its position
   * @throws if a position repeats or a skill id doesn't exist
   */
  replaceSteps(macroId: string, rows: readonly MacroStepInsert[]): void;
  /**
   * Returns the ids in `ids` that no skill has.
   *
   * @param ids - candidate skill ids
   * @returns the absent ids, each once, in their input order
   */
  missingSkills(ids: readonly string[]): string[];
  /**
   * Finds which of `ids` a stored macro chain already has.
   *
   * @param ids - candidate macro ids
   * @returns the ids already taken, mapped to the build that holds each
   */
  takenMacros(ids: readonly string[]): Map<string, string>;
}

/**
 * Builds a {@link BuildsRepo}.
 *
 * @param db - database or transaction handle
 * @returns the repo
 */
export function createBuildsRepo(db: Db): BuildsRepo {
  const repo: BuildsRepo = {
    /** @inheritdoc */
    list: () => db.select().from(builds).orderBy(asc(builds.position), asc(builds.id)).all(),
    /** @inheritdoc */
    get: (id) => db.select().from(builds).where(eq(builds.id, id)).get(),
    /** @inheritdoc */
    insert: (row) => db.insert(builds).values(row).returning().get(),
    /** @inheritdoc */
    insertAggregate: (aggregate) => {
      const row = repo.insert(aggregate.build);
      repo.replaceSkills(row.id, aggregate.skills);
      repo.replaceStigmas(row.id, aggregate.stigmas);
      aggregate.macros.forEach(({ macro, steps }, index) => {
        repo.insertMacro({ ...macro, buildId: row.id, position: index + 1 });
        repo.replaceSteps(macro.id, steps);
      });
      return row;
    },
    /** @inheritdoc */
    update: (id, patch) => db.update(builds).set(patch).where(eq(builds.id, id)).returning().get(),
    /** @inheritdoc */
    remove: (id) =>
      db.delete(builds).where(eq(builds.id, id)).returning({ id: builds.id }).all().length > 0,
    /** @inheritdoc */
    nextPosition: () => {
      const row = db
        .select({ max: max(builds.position) })
        .from(builds)
        .get();
      return row?.max == null ? 0 : row.max + 1;
    },
    /** @inheritdoc */
    count: () => db.select({ n: count() }).from(builds).get()!.n,
    /** @inheritdoc */
    skills: (buildIds) =>
      buildIds.length === 0
        ? []
        : db
            .select()
            .from(buildSkills)
            .where(inArray(buildSkills.buildId, [...buildIds]))
            .orderBy(asc(buildSkills.buildId), asc(buildSkills.rank))
            .all(),
    /** @inheritdoc */
    stigmas: (buildIds) =>
      buildIds.length === 0
        ? []
        : db
            .select()
            .from(buildStigmas)
            .where(inArray(buildStigmas.buildId, [...buildIds]))
            .orderBy(asc(buildStigmas.buildId), asc(buildStigmas.slotLevel))
            .all(),
    /** @inheritdoc */
    replaceSkills: (buildId, rows) => {
      db.delete(buildSkills).where(eq(buildSkills.buildId, buildId)).run();
      if (rows.length > 0) {
        db.insert(buildSkills)
          .values(rows.map((row) => ({ ...row, buildId })))
          .run();
      }
    },
    /** @inheritdoc */
    replaceStigmas: (buildId, rows) => {
      db.delete(buildStigmas).where(eq(buildStigmas.buildId, buildId)).run();
      if (rows.length > 0) {
        db.insert(buildStigmas)
          .values(rows.map((row) => ({ ...row, buildId })))
          .run();
      }
    },
    /** @inheritdoc */
    macros: () =>
      db
        .select()
        .from(macros)
        .orderBy(asc(macros.buildId), asc(macros.position), asc(macros.id))
        .all(),
    /** @inheritdoc */
    macrosOf: (buildIds) =>
      buildIds.length === 0
        ? []
        : db
            .select()
            .from(macros)
            .where(inArray(macros.buildId, [...buildIds]))
            .orderBy(asc(macros.buildId), asc(macros.position), asc(macros.id))
            .all(),
    /** @inheritdoc */
    nextMacroPosition: (buildId) => {
      const row = db
        .select({ max: max(macros.position) })
        .from(macros)
        .where(eq(macros.buildId, buildId))
        .get();
      return (row?.max ?? 0) + 1;
    },
    /** @inheritdoc */
    getMacro: (id) => db.select().from(macros).where(eq(macros.id, id)).get(),
    /** @inheritdoc */
    insertMacro: (row) => db.insert(macros).values(row).returning().get(),
    /** @inheritdoc */
    updateMacro: (id, patch) =>
      db.update(macros).set(patch).where(eq(macros.id, id)).returning().get(),
    /** @inheritdoc */
    removeMacro: (id) =>
      db.delete(macros).where(eq(macros.id, id)).returning({ id: macros.id }).all().length > 0,
    /** @inheritdoc */
    steps: (macroIds) =>
      macroIds.length === 0
        ? []
        : db
            .select()
            .from(macroSteps)
            .where(inArray(macroSteps.macroId, [...macroIds]))
            .orderBy(asc(macroSteps.macroId), asc(macroSteps.position))
            .all(),
    /** @inheritdoc */
    replaceSteps: (macroId, rows) => {
      db.delete(macroSteps).where(eq(macroSteps.macroId, macroId)).run();
      if (rows.length > 0) {
        db.insert(macroSteps)
          .values(rows.map((row) => ({ ...row, macroId })))
          .run();
      }
    },
    /** @inheritdoc */
    missingSkills: (ids) => {
      const distinct = [...new Set(ids)];
      if (distinct.length === 0) return [];
      const found = new Set(
        db
          .select({ id: skills.id })
          .from(skills)
          .where(inArray(skills.id, distinct))
          .all()
          .map((row) => row.id),
      );
      return distinct.filter((id) => !found.has(id));
    },
    /** @inheritdoc */
    takenMacros: (ids) => {
      const distinct = [...new Set(ids)];
      if (distinct.length === 0) return new Map();
      const rows = db
        .select({ id: macros.id, buildId: macros.buildId })
        .from(macros)
        .where(inArray(macros.id, distinct))
        .all();
      return new Map(rows.map((row) => [row.id, row.buildId]));
    },
  };
  return repo;
}
