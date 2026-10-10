import { accountRoadmapItems, accountSkills, accountSnapshots } from "@aion/schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { asc, eq } from "drizzle-orm";
import type { Db } from "../db/client";

/** A row of `account_snapshots`. */
export type AccountSnapshotRow = InferSelectModel<typeof accountSnapshots>;
/** Insert payload for {@link AccountRepo.insertSnapshot}. */
export type AccountSnapshotInsert = InferInsertModel<typeof accountSnapshots>;
/** A row of `account_skills`. */
export type AccountSkillRow = InferSelectModel<typeof accountSkills>;
/** A skill as read in a snapshot, without the `id`/`snapshotId` the repo assigns. */
export type AccountSkillInsert = Omit<InferInsertModel<typeof accountSkills>, "id" | "snapshotId">;
/** A row of `account_roadmap_items`. */
export type AccountRoadmapItemRow = InferSelectModel<typeof accountRoadmapItems>;
/** A roadmap item, without the `id`/`snapshotId` the repo assigns. */
export type AccountRoadmapItemInsert = Omit<
  InferInsertModel<typeof accountRoadmapItems>,
  "id" | "snapshotId"
>;

/**
 * The character's snapshots, each keyed by its file's id (`YYYY-MM-DD`, or
 * a dated id such as `2026-10-10-after`), with the skills read in it and
 * the roadmap ranked against it. Deleting a snapshot cascades to both.
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
