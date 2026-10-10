import {
  accountMacroSteps,
  accountMacros,
  accountRoadmapItems,
  accountSkills,
  accountSnapshots,
  accountStigmas,
} from "@aion/schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { asc, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client";

/** A row of `account_snapshots`. */
export type AccountSnapshotRow = InferSelectModel<typeof accountSnapshots>;
/** Insert payload for {@link AccountRepo.insertSnapshot}. */
export type AccountSnapshotInsert = InferInsertModel<typeof accountSnapshots>;
/** A row of `account_skills`. */
export type AccountSkillRow = InferSelectModel<typeof accountSkills>;
/** A skill as read in a snapshot, without the `id`/`snapshotId` the repo assigns. */
export type AccountSkillInsert = Omit<InferInsertModel<typeof accountSkills>, "id" | "snapshotId">;
/** A row of `account_stigmas`. */
export type AccountStigmaRow = InferSelectModel<typeof accountStigmas>;
/** A stigma slot as read in a snapshot, without the `id`/`snapshotId` the repo assigns. */
export type AccountStigmaInsert = Omit<
  InferInsertModel<typeof accountStigmas>,
  "id" | "snapshotId"
>;
/** A row of `account_macros`. */
export type AccountMacroRow = InferSelectModel<typeof accountMacros>;
/** A row of `account_macro_steps`. */
export type AccountMacroStepRow = InferSelectModel<typeof accountMacroSteps>;
/** A macro chain as read in a snapshot, with its steps, as {@link AccountRepo.insertMacros} writes it. */
export interface AccountMacroInsert {
  /** The chain, without the `id`/`snapshotId` the repo assigns. */
  macro: Omit<InferInsertModel<typeof accountMacros>, "id" | "snapshotId">;
  /** Its steps, without the `id`/`macroId` the repo assigns. */
  steps: ReadonlyArray<Omit<InferInsertModel<typeof accountMacroSteps>, "id" | "macroId">>;
}
/** A row of `account_roadmap_items`. */
export type AccountRoadmapItemRow = InferSelectModel<typeof accountRoadmapItems>;
/** A roadmap item, without the `id`/`snapshotId` the repo assigns. */
export type AccountRoadmapItemInsert = Omit<
  InferInsertModel<typeof accountRoadmapItems>,
  "id" | "snapshotId"
>;

/**
 * The character's snapshots, each keyed by its file's id (`YYYY-MM-DD`, or
 * a dated id such as `2026-10-10-after`), with the skills, stigma slots and
 * macro chains read in it and the roadmap ranked against it. Deleting a
 * snapshot cascades to all of them.
 */
export interface AccountRepo {
  /** Returns every snapshot, ordered by `id`. */
  snapshots(): AccountSnapshotRow[];
  /**
   * Returns the snapshot with `id`, or `undefined` if there is none.
   *
   * @param id - the snapshot's id
   */
  getSnapshot(id: string): AccountSnapshotRow | undefined;
  /**
   * Inserts a snapshot.
   *
   * @param row - the snapshot
   * @throws if `id` already exists
   */
  insertSnapshot(row: AccountSnapshotInsert): void;
  /**
   * Deletes the snapshot with `id`, its skills and its roadmap.
   *
   * @param id - the snapshot's id
   */
  removeSnapshot(id: string): void;
  /**
   * Returns the skills read in snapshot `snapshotId`, in the order they were inserted.
   *
   * @param snapshotId - the snapshot's id
   */
  skills(snapshotId: string): AccountSkillRow[];
  /**
   * Inserts the skills read in snapshot `snapshotId`.
   *
   * @param snapshotId - the snapshot's id
   * @param rows - the skills; `[]` inserts nothing
   * @throws if the snapshot doesn't exist
   */
  insertSkills(snapshotId: string, rows: readonly AccountSkillInsert[]): void;
  /**
   * Returns the stigma slots read in snapshot `snapshotId`, ordered by slot level.
   *
   * @param snapshotId - the snapshot's id
   */
  stigmas(snapshotId: string): AccountStigmaRow[];
  /**
   * Inserts the stigma slots read in snapshot `snapshotId`.
   *
   * @param snapshotId - the snapshot's id
   * @param rows - the slots; `[]` inserts nothing
   * @throws if the snapshot doesn't exist or a slot level repeats
   */
  insertStigmas(snapshotId: string, rows: readonly AccountStigmaInsert[]): void;
  /**
   * Returns the macro chains read in snapshot `snapshotId`, ordered by position.
   *
   * @param snapshotId - the snapshot's id
   */
  macros(snapshotId: string): AccountMacroRow[];
  /**
   * Returns the steps of `macroIds`, ordered by macro then position.
   *
   * @param macroIds - the chains' ids; `[]` returns `[]`
   */
  macroSteps(macroIds: readonly number[]): AccountMacroStepRow[];
  /**
   * Inserts the macro chains read in snapshot `snapshotId`, each with its steps.
   *
   * @param snapshotId - the snapshot's id
   * @param macros - the chains; `[]` inserts nothing
   * @throws if the snapshot doesn't exist, or a chain or step position repeats
   */
  insertMacros(snapshotId: string, macros: readonly AccountMacroInsert[]): void;
  /**
   * Returns the roadmap ranked against snapshot `snapshotId`, ordered by rank.
   *
   * @param snapshotId - the snapshot's id
   */
  roadmap(snapshotId: string): AccountRoadmapItemRow[];
  /**
   * Inserts the roadmap ranked against snapshot `snapshotId`.
   *
   * @param snapshotId - the snapshot's id
   * @param rows - the items; `[]` inserts nothing
   * @throws if the snapshot doesn't exist
   */
  insertRoadmap(snapshotId: string, rows: readonly AccountRoadmapItemInsert[]): void;
}

/**
 * Builds an {@link AccountRepo}.
 *
 * @param db - database or transaction handle
 * @returns the repo
 */
export function createAccountRepo(db: Db): AccountRepo {
  return {
    /** @inheritdoc */
    snapshots: () => db.select().from(accountSnapshots).orderBy(asc(accountSnapshots.id)).all(),
    /** @inheritdoc */
    getSnapshot: (id) =>
      db.select().from(accountSnapshots).where(eq(accountSnapshots.id, id)).get(),
    /** @inheritdoc */
    insertSnapshot: (row) => {
      db.insert(accountSnapshots).values(row).run();
    },
    /** @inheritdoc */
    removeSnapshot: (id) => {
      db.delete(accountSnapshots).where(eq(accountSnapshots.id, id)).run();
    },
    /** @inheritdoc */
    skills: (snapshotId) =>
      db
        .select()
        .from(accountSkills)
        .where(eq(accountSkills.snapshotId, snapshotId))
        .orderBy(asc(accountSkills.id))
        .all(),
    /** @inheritdoc */
    insertSkills: (snapshotId, rows) => {
      if (rows.length === 0) return;
      db.insert(accountSkills)
        .values(rows.map((row) => ({ ...row, snapshotId })))
        .run();
    },
    /** @inheritdoc */
    stigmas: (snapshotId) =>
      db
        .select()
        .from(accountStigmas)
        .where(eq(accountStigmas.snapshotId, snapshotId))
        .orderBy(asc(accountStigmas.slotLevel))
        .all(),
    /** @inheritdoc */
    insertStigmas: (snapshotId, rows) => {
      if (rows.length === 0) return;
      db.insert(accountStigmas)
        .values(rows.map((row) => ({ ...row, snapshotId })))
        .run();
    },
    /** @inheritdoc */
    macros: (snapshotId) =>
      db
        .select()
        .from(accountMacros)
        .where(eq(accountMacros.snapshotId, snapshotId))
        .orderBy(asc(accountMacros.position))
        .all(),
    /** @inheritdoc */
    macroSteps: (macroIds) =>
      macroIds.length === 0
        ? []
        : db
            .select()
            .from(accountMacroSteps)
            .where(inArray(accountMacroSteps.macroId, [...macroIds]))
            .orderBy(asc(accountMacroSteps.macroId), asc(accountMacroSteps.position))
            .all(),
    /** @inheritdoc */
    insertMacros: (snapshotId, macros) => {
      for (const { macro, steps } of macros) {
        const { id } = db
          .insert(accountMacros)
          .values({ ...macro, snapshotId })
          .returning({ id: accountMacros.id })
          .get();
        if (steps.length > 0) {
          db.insert(accountMacroSteps)
            .values(steps.map((step) => ({ ...step, macroId: id })))
            .run();
        }
      }
    },
    /** @inheritdoc */
    roadmap: (snapshotId) =>
      db
        .select()
        .from(accountRoadmapItems)
        .where(eq(accountRoadmapItems.snapshotId, snapshotId))
        .orderBy(asc(accountRoadmapItems.rank))
        .all(),
    /** @inheritdoc */
    insertRoadmap: (snapshotId, rows) => {
      if (rows.length === 0) return;
      db.insert(accountRoadmapItems)
        .values(rows.map((row) => ({ ...row, snapshotId })))
        .run();
    },
  };
}
