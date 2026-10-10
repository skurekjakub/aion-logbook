/**
 * Loads the character from `account/` into the database: snapshots
 * (`snapshots/<id>.json`, an `aion-account-snapshot/1` document) and the
 * roadmap ranked against each (`roadmap-<id>.json`, when present), keyed by
 * the snapshot's id, so older snapshots stay loaded next to the latest. An
 * id leads with the day it was read (`2026-10-10`, `2026-10-10-after`).
 * Everything is read and checked before anything is written, and the write
 * is one transaction.
 *
 * @module
 */
import { existsSync, readdirSync } from "node:fs";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import type { AccountSnapshotFile, GameClass } from "@aion/schema";
import { ACCOUNT_PRIORITY, accountSnapshotFile, isoDate } from "@aion/schema";
import { z } from "zod";
import { ImportError } from "../errors";
import type { TableKey } from "../registry";
import type { Repos, Store } from "../repos";
import type { AccountSkillInsert } from "../repos/account";
import { stigmaSlot } from "../services/account-slots";
import { parseFile, readJson } from "./files";

/** The folder under `account/` that holds the snapshots. */
const SNAPSHOT_DIR = "snapshots";

/**
 * The `aion-account-roadmap/1` document: the next actions for the
 * character, most urgent first, each against the research it follows.
 */
export const accountRoadmapFile = z.strictObject({
  schema: z.literal("aion-account-roadmap/1"),
  items: z.array(
    z.strictObject({
      priority: z.enum(ACCOUNT_PRIORITY),
      area: z.string().min(1),
      action: z.string().min(1),
      why: z.string().min(1),
      refs: z.array(
        z.strictObject({ record: z.string().min(1), id: z.string().min(1).optional() }),
      ),
    }),
  ),
});

/** Output of {@link accountRoadmapFile}. */
export type AccountRoadmapFile = z.output<typeof accountRoadmapFile>;

/** Which snapshots {@link importAccount} loads. */
export interface AccountImportOptions {
  /** Every snapshot under `snapshots/`, not only the latest. */
  all?: boolean;
  /** These snapshot files (absolute, or relative to the account folder) instead of the latest. */
  files?: readonly string[];
  /**
   * Replace a snapshot that is already loaded. Without it, a file named in
   * `files` is refused, and any other loaded snapshot is skipped.
   */
  replace?: boolean;
}

/** What {@link importAccount} did. */
export interface AccountImportResult {
  /** The ids of the snapshots loaded, oldest first. */
  snapshots: string[];
  /** The ids of the snapshots skipped because they were already loaded. */
  skipped: string[];
  /** Rows inserted per account table; a replaced snapshot's rows count as inserted. */
  counts: Record<Extract<TableKey, `account${string}`>, number>;
  /** Non-fatal findings: skill names no loaded skill has, and what a snapshot holds that isn't stored. */
  warnings: string[];
}

/** A snapshot file found on disk, before it is read. */
interface SnapshotFile {
  /** The file's name without `.json`. */
  id: string;
  /** The file's path as errors name it: relative to the account folder when under it, else absolute. */
  file: string;
  /** Whether the caller named the file. */
  named: boolean;
}

/** A snapshot, read and validated, with its roadmap. */
interface SnapshotPlan extends SnapshotFile {
  data: AccountSnapshotFile;
  roadmap: AccountRoadmapFile | undefined;
}

/**
 * Reports whether a snapshot id leads with a calendar day.
 *
 * @param id - a file's id, e.g. `2026-10-07` or `2026-10-07-after`
 * @returns `true` when it starts with a `YYYY-MM-DD` day, alone or followed by a non-digit
 */
function isDatedId(id: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(?:$|[^\d])/.test(id) && isoDate.safeParse(id.slice(0, 10)).success;
}

/**
 * Describes a snapshot file.
 *
 * @param accountDir - absolute path to the account folder
 * @param path - the file's absolute path
 * @param named - whether the caller named it
 * @returns the file
 */
function snapshotFile(accountDir: string, path: string, named: boolean): SnapshotFile {
  const rel = relative(accountDir, path);
  const file = rel.startsWith("..") || isAbsolute(rel) ? path : rel.split(sep).join("/");
  return { id: basename(path, ".json"), file, named };
}

/**
 * Lists the snapshot files under `<accountDir>/snapshots/` whose ids lead
 * with a day, sorted by id; other files are skipped.
 *
 * @param accountDir - absolute path to the account folder
 * @returns the files, oldest id first
 */
export function listSnapshots(accountDir: string): SnapshotFile[] {
  const dir = join(accountDir, SNAPSHOT_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json") && isDatedId(basename(name, ".json")))
    .sort()
    .map((name) => snapshotFile(accountDir, join(dir, name), false));
}

/**
 * Picks the snapshot files an import loads.
 *
 * @param accountDir - absolute path to the account folder
 * @param opts - the files named, or `all`
 * @returns the files, in load order
 * @throws {ImportError} if a named file doesn't exist, or there is no snapshot to import
 */
function choose(accountDir: string, opts: AccountImportOptions): SnapshotFile[] {
  if (opts.files && opts.files.length > 0) {
    return opts.files.map((name) => {
      const path = isAbsolute(name) ? name : join(accountDir, name);
      if (!existsSync(path)) throw new ImportError(name, null, "file not found");
      return snapshotFile(accountDir, path, true);
    });
  }
  const found = listSnapshots(accountDir);
  if (found.length === 0) {
    throw new ImportError(accountDir, null, `no snapshot to import under ${SNAPSHOT_DIR}/`);
  }
  return opts.all ? found : [found.at(-1)!];
}

/**
 * Reads and validates a snapshot and the roadmap ranked against it.
 *
 * @param accountDir - absolute path to the account folder
 * @param file - the snapshot file
 * @returns the snapshot and its roadmap, `undefined` when it has none
 * @throws {ImportError} naming the file and every issue's path, if either
 *   file isn't JSON or fails its schema
 */
function readSnapshot(accountDir: string, file: SnapshotFile): SnapshotPlan {
  const data = parseFile(
    file.file,
    readJson(isAbsolute(file.file) ? "" : accountDir, file.file),
    accountSnapshotFile,
  );
  const roadmapName = `roadmap-${file.id}.json`;
  const roadmap = existsSync(join(accountDir, roadmapName))
    ? parseFile(roadmapName, readJson(accountDir, roadmapName), accountRoadmapFile)
    : undefined;
  return { ...file, data, roadmap };
}

/**
 * Indexes the loaded skills by class and lower-cased name.
 *
 * @param repos - the repos to read the skills from
 * @returns `<class>|<lower-cased name>` → the skill's id
 */
function skillIndex(repos: Repos): Map<string, string> {
  return new Map(
    repos.skills.list().map((skill) => [`${skill.class}|${skill.name.toLowerCase()}`, skill.id]),
  );
}

/**
 * Maps a snapshot's skills and stigmas onto the rows `account_skills`
 * stores, each name resolved to a loaded skill of the character's class.
 *
 * @param plan - the snapshot
 * @param index - the loaded skills, by class and lower-cased name
 * @param warn - records a name no loaded skill has
 * @returns the rows: the skills as read, then each filled stigma slot
 */
function skillRows(
  plan: SnapshotPlan,
  index: ReadonlyMap<string, string>,
  warn: (message: string) => void,
): AccountSkillInsert[] {
  const cls: GameClass = plan.data.character.class;
  /**
   * Resolves a name as read to a skill id.
   *
   * @param name - the name as read
   * @returns the skill's id, or `null` when no loaded skill of the class has the name
   */
  const resolve = (name: string): string | null => {
    const id = index.get(`${cls}|${name.toLowerCase()}`);
    if (id !== undefined) return id;
    warn(`snapshot ${plan.id}: no loaded ${cls} skill is named ${name}; its skillId stays null`);
    return null;
  };
  const skills = plan.data.skills.map((skill) => ({
    skillName: skill.name,
    skillId: resolve(skill.name),
    level: skill.level,
    slot: skill.slot,
  }));
  const stigmas = plan.data.stigmas.flatMap((stigma) =>
    stigma.name === null
      ? []
      : [
          {
            skillName: stigma.name,
            skillId: resolve(stigma.name),
            level: null,
            slot: stigmaSlot(stigma.slotLevel),
          },
        ],
  );
  return [...skills, ...stigmas];
}

/**
 * Loads the character's snapshots from `accountDir`: the latest snapshot
 * by id, every one with `all`, or the files named in `files`, each with the
 * roadmap ranked against it when `roadmap-<id>.json` exists. Each skill and
 * stigma name is resolved to a loaded skill of the character's class by its
 * lower-cased name; an unresolved name keeps `skillId: null` and is
 * reported. A stigma is stored as a skill row whose slot is
 * `stigma:<slot level>`; macro chains aren't stored, and a snapshot that
 * lists some is reported.
 *
 * @param store - the store to load into
 * @param accountDir - absolute path to the account folder
 * @param opts - which snapshots to load, and whether to replace loaded ones
 * @returns the snapshots loaded and skipped, the rows inserted, and warnings
 * @throws {ImportError} naming the file, if a file is missing, isn't JSON
 *   or fails its schema, or there is no snapshot to import; nothing is written
 * @throws {ImportError} `"snapshot <id> is already loaded; pass --replace
 *   to load it again"` for a named file that is loaded, without `replace`
 */
export function importAccount(
  store: Store,
  accountDir: string,
  opts: AccountImportOptions = {},
): AccountImportResult {
  const plans = choose(accountDir, opts).map((file) => readSnapshot(accountDir, file));
  // See `createBuildService`'s implementation for why the inner return is cast `as never`.
  return store.transaction((repos) => {
    const counts = { accountSnapshots: 0, accountSkills: 0, accountRoadmapItems: 0 };
    const index = skillIndex(repos);
    const warnings: string[] = [];
    const loaded: string[] = [];
    const skipped: string[] = [];
    for (const plan of plans) {
      if (repos.account.getSnapshot(plan.id)) {
        if (!opts.replace) {
          if (plan.named) {
            throw new ImportError(
              plan.file,
              null,
              `snapshot ${plan.id} is already loaded; pass --replace to load it again`,
            );
          }
          skipped.push(plan.id);
          continue;
        }
        repos.account.removeSnapshot(plan.id);
      }
      const { character, capturedAt, unread, macros } = plan.data;
      repos.account.insertSnapshot({
        id: plan.id,
        capturedAt,
        character: character.name,
        class: character.class,
        level: character.level,
        gearScore: character.gearScore,
        server: character.server,
        unread,
      });
      const skills = skillRows(plan, index, (message) => warnings.push(message));
      const roadmap = (plan.roadmap?.items ?? []).map((item, i) => ({ ...item, rank: i + 1 }));
      repos.account.insertSkills(plan.id, skills);
      repos.account.insertRoadmap(plan.id, roadmap);
      counts.accountSnapshots += 1;
      counts.accountSkills += skills.length;
      counts.accountRoadmapItems += roadmap.length;
      if (macros.length > 0) {
        warnings.push(`snapshot ${plan.id}: its macro chains aren't stored; no table holds them`);
      }
      loaded.push(plan.id);
    }
    return { snapshots: loaded, skipped, counts, warnings } as never;
  });
}
