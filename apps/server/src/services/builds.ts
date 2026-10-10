import type { BuildInput, MacroInput, buildPatch, macroPatch } from "@aion/schema";
import { OBSOLESCENCE, obsolescenceKey } from "@aion/schema";
import type { z } from "zod";
import { ConflictError, NotFoundError, UnknownRefsError } from "../errors";
import type { FiltersOf, RowOf } from "../registry";
import { REGISTRY } from "../registry";
import type { Repos, Store } from "../repos";
import type { BuildRow, MacroAggregate, MacroRow } from "../repos/builds";
import { assertSourcesExist } from "./citations";
import type { Cited } from "./citations";
import { applyFilters } from "./filters";

/** A skill as the views nest it: its full row. */
export type SkillRow = RowOf<"skills">;

/** A macro chain as returned to callers: its row and its steps, each with its skill. */
export type MacroView = MacroRow & {
  steps: Array<{ position: number; note: string | null; skill: SkillRow }>;
};

/**
 * A build as returned to callers: its row, its skill priorities by rank,
 * its stigma slots by level and its macro chains, each naming its skill in
 * full, plus its citing sources and the sources of its obsolete reason
 * (`obsoleteSources`, empty while it is current).
 */
export type BuildView = Cited<BuildRow> & {
  obsoleteSources: string[];
  skills: Array<{ rank: number; targetLevel: number; why: string; skill: SkillRow }>;
  stigmas: Array<{ slotLevel: number; why: string; skill: SkillRow }>;
  macros: MacroView[];
};

/** The `PATCH /api/builds/:id` body. */
export type BuildPatch = z.output<typeof buildPatch>;

/** The `POST /api/macros` body: a macro chain and its build. */
export type MacroCreate = MacroInput & { buildId: string };

/** The `PATCH /api/macros/:id` body. */
export type MacroPatch = z.output<typeof macroPatch>;

/**
 * CRUD over the builds aggregate: the build row, its skill priorities,
 * stigma slots and macro chains, and its citations. Every skill a build
 * names must exist.
 */
export interface BuildService {
  /**
   * Returns every build view, ordered by `position` then `id`.
   *
   * @param filter - the registry's list filters for builds, each applied when given
   */
  list(filter?: FiltersOf<"builds">): BuildView[];
  /**
   * Returns the build view for `id`.
   *
   * @param id - the build's slug id
   * @throws {NotFoundError} if `id` doesn't exist
   */
  get(id: string): BuildView;
  /**
   * Inserts a build with its children and citations, at the next free position.
   *
   * @param input - the build and its children
   * @throws {ConflictError} if the build id, or one of its macro ids, already exists
   * @throws {UnknownRefsError} `"skills"` naming every skill id that doesn't
   *   exist, or `"sources"` naming every cited source that doesn't
   */
  create(input: BuildInput): BuildView;
  /**
   * Updates the build's own fields; its children and citations stay.
   *
   * @param id - the build's slug id
   * @param patch - the fields to change
   * @throws {NotFoundError} if `id` doesn't exist
   */
  update(id: string, patch: BuildPatch): BuildView;
  /**
   * Deletes the build, its children (through the schema's cascades), its
   * citations and its obsolete reason's citations.
   *
   * @param id - the build's slug id
   * @throws {NotFoundError} if `id` doesn't exist
   */
  remove(id: string): void;
}

/** CRUD over macro chains, each nested with its steps' skills. */
export interface MacroService {
  /**
   * Returns every macro view, ordered by build, then position, then `id`.
   *
   * @param filter - the registry's list filters for macros (`build`), each applied when given
   */
  list(filter?: FiltersOf<"macros">): MacroView[];
  /**
   * Returns the macro view for `id`.
   *
   * @param id - the macro's slug id
   * @throws {NotFoundError} if `id` doesn't exist
   */
  get(id: string): MacroView;
  /**
   * Inserts a macro chain on a build, with its steps, after the build's other chains.
   *
   * @param input - the chain, its steps in the editor's order, and its build
   * @throws {ConflictError} if the macro id already exists
   * @throws {UnknownRefsError} `"builds"` if the build doesn't exist, or
   *   `"skills"` naming every step's skill that doesn't
   */
  create(input: MacroCreate): MacroView;
  /**
   * Updates the chain's own fields; its steps stay.
   *
   * @param id - the macro's slug id
   * @param patch - the fields to change
   * @throws {NotFoundError} if `id` doesn't exist
   */
  update(id: string, patch: MacroPatch): MacroView;
  /**
   * Deletes the chain and its steps.
   *
   * @param id - the macro's slug id
   * @throws {NotFoundError} if `id` doesn't exist
   */
  remove(id: string): void;
}

/**
 * Checks that every skill id exists.
 *
 * @param repos - the repos to check against
 * @param ids - the skill ids named
 * @throws {UnknownRefsError} `"skills"` naming every id that doesn't exist
 */
function assertSkillsExist(repos: Repos, ids: readonly string[]): void {
  const missing = repos.builds.missingSkills(ids);
  if (missing.length > 0) throw new UnknownRefsError("skills", missing);
}

/**
 * Checks that no macro id is taken.
 *
 * @param repos - the repos to check against
 * @param ids - the macro ids about to be written
 * @throws {ConflictError} naming the first taken id and the build holding it
 */
function assertMacrosFree(repos: Repos, ids: readonly string[]): void {
  const [taken] = repos.builds.takenMacros(ids);
  if (taken) throw new ConflictError(`macro ${taken[0]} already exists on build ${taken[1]}`);
}

/**
 * Lists every skill id a build names: its priorities, stigmas and macro steps.
 *
 * @param input - the build
 * @returns the skill ids, in that order, repeats included
 */
function skillIdsOf(input: BuildInput): string[] {
  return [
    ...input.skills.map((s) => s.skillId),
    ...input.stigmas.map((s) => s.skillId),
    ...input.macros.flatMap((m) => m.steps.map((s) => s.skillId)),
  ];
}

/**
 * Maps a macro chain as submitted onto the rows the repo writes.
 *
 * @param input - the chain with its positioned steps
 * @returns the chain's columns and its steps
 */
function macroAggregate({ steps, ...macro }: MacroInput): MacroAggregate {
  return { macro, steps };
}

/**
 * Builds the views of macro chains, each step naming its skill.
 *
 * @param repos - the repos to read steps and skills from
 * @param rows - the macro rows
 * @param skills - every skill, by id
 * @returns one view per row, in `rows` order
 */
function macroViews(
  repos: Repos,
  rows: readonly MacroRow[],
  skills: ReadonlyMap<string, SkillRow>,
): MacroView[] {
  const steps = repos.builds.steps(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    steps: steps
      .filter((step) => step.macroId === row.id)
      .map((step) => ({
        position: step.position,
        note: step.note,
        skill: skills.get(step.skillId)!,
      })),
  }));
}

/**
 * Reads every skill, by id, for nesting into views.
 *
 * @param repos - the repos to read from
 * @returns skill id → its row
 */
function skillMap(repos: Repos): Map<string, SkillRow> {
  return new Map(repos.skills.list().map((skill) => [skill.id, skill]));
}

/**
 * Builds the views of builds, with their children and citations.
 *
 * @param repos - the repos to read from
 * @param rows - the build rows
 * @returns one view per row, in `rows` order
 */
function buildViews(repos: Repos, rows: readonly BuildRow[]): BuildView[] {
  const ids = rows.map((row) => row.id);
  const skills = skillMap(repos);
  const priorities = repos.builds.skills(ids);
  const stigmas = repos.builds.stigmas(ids);
  const macros = macroViews(repos, repos.builds.macrosOf(ids), skills);
  const sources = repos.citations.sourcesFor("build", ids);
  const reasons = repos.citations.sourcesFor(
    OBSOLESCENCE,
    ids.map((id) => obsolescenceKey("build", id)),
  );
  return rows.map((row) => ({
    ...row,
    sources: sources.get(row.id) ?? [],
    obsoleteSources: reasons.get(obsolescenceKey("build", row.id)) ?? [],
    skills: priorities
      .filter((p) => p.buildId === row.id)
      .map((p) => ({
        rank: p.rank,
        targetLevel: p.targetLevel,
        why: p.why,
        skill: skills.get(p.skillId)!,
      })),
    stigmas: stigmas
      .filter((s) => s.buildId === row.id)
      .map((s) => ({ slotLevel: s.slotLevel, why: s.why, skill: skills.get(s.skillId)! })),
    macros: macros.filter((m) => m.buildId === row.id),
  }));
}

/**
 * Builds a {@link BuildService} over `store`.
 *
 * @param store - the store to persist through
 * @returns the service
 */
export function createBuildService(store: Store): BuildService {
  return {
    /** @inheritdoc */
    list: (filter) => {
      const repos = store.repos;
      return applyFilters(buildViews(repos, repos.builds.list()), REGISTRY.builds.filters, filter);
    },
    /** @inheritdoc */
    get: (id) => {
      const repos = store.repos;
      const row = repos.builds.get(id);
      if (!row) throw new NotFoundError("build", id);
      return buildViews(repos, [row])[0]!;
    },
    // `Store.transaction` can't infer its type parameter through its own
    // conditional return type, so the inner return is cast `as never`.
    /** @inheritdoc */
    create: (input) =>
      store.transaction((repos) => {
        if (repos.builds.get(input.id))
          throw new ConflictError(`build already exists: ${input.id}`);
        assertSourcesExist(repos, input.sources);
        assertSkillsExist(repos, skillIdsOf(input));
        assertMacrosFree(
          repos,
          input.macros.map((m) => m.id),
        );
        const { skills, stigmas, macros, sources, ...build } = input;
        const row = repos.builds.insertAggregate({
          build: { ...build, position: repos.builds.nextPosition() },
          skills,
          stigmas,
          macros: macros.map(macroAggregate),
        });
        repos.citations.replace("build", row.id, sources);
        return buildViews(repos, [row])[0] as never;
      }),
    /** @inheritdoc */
    update: (id, patch) =>
      store.transaction((repos) => {
        const row =
          Object.keys(patch).length > 0 ? repos.builds.update(id, patch) : repos.builds.get(id);
        if (!row) throw new NotFoundError("build", id);
        return buildViews(repos, [row])[0] as never;
      }),
    /** @inheritdoc */
    remove: (id) =>
      store.transaction((repos) => {
        if (!repos.builds.get(id)) throw new NotFoundError("build", id);
        repos.citations.removeAll("build", id);
        repos.citations.removeAll(OBSOLESCENCE, obsolescenceKey("build", id));
        repos.builds.remove(id);
      }),
  };
}

/**
 * Builds a {@link MacroService} over `store`.
 *
 * @param store - the store to persist through
 * @returns the service
 */
export function createMacroService(store: Store): MacroService {
  return {
    /** @inheritdoc */
    list: (filter) => {
      const repos = store.repos;
      const views = macroViews(repos, repos.builds.macros(), skillMap(repos));
      return applyFilters(views, REGISTRY.macros.filters, filter);
    },
    /** @inheritdoc */
    get: (id) => {
      const repos = store.repos;
      const row = repos.builds.getMacro(id);
      if (!row) throw new NotFoundError("macro", id);
      return macroViews(repos, [row], skillMap(repos))[0]!;
    },
    /** @inheritdoc */
    create: ({ buildId, ...input }) =>
      store.transaction((repos) => {
        if (!repos.builds.get(buildId)) throw new UnknownRefsError("builds", [buildId]);
        assertMacrosFree(repos, [input.id]);
        assertSkillsExist(
          repos,
          input.steps.map((s) => s.skillId),
        );
        const { macro, steps } = macroAggregate(input);
        const position = repos.builds.nextMacroPosition(buildId);
        const row = repos.builds.insertMacro({ ...macro, buildId, position });
        repos.builds.replaceSteps(row.id, steps);
        return macroViews(repos, [row], skillMap(repos))[0] as never;
      }),
    /** @inheritdoc */
    update: (id, patch) =>
      store.transaction((repos) => {
        const row =
          Object.keys(patch).length > 0
            ? repos.builds.updateMacro(id, patch)
            : repos.builds.getMacro(id);
        if (!row) throw new NotFoundError("macro", id);
        return macroViews(repos, [row], skillMap(repos))[0] as never;
      }),
    /** @inheritdoc */
    remove: (id) =>
      store.transaction((repos) => {
        if (!repos.builds.removeMacro(id)) throw new NotFoundError("macro", id);
      }),
  };
}
