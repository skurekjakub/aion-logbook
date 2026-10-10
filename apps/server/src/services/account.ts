import { NotFoundError } from "../errors";
import type { Repos, Store } from "../repos";
import type { AccountRoadmapItemRow, AccountSnapshotRow } from "../repos/account";
import { stigmaSlotLevel } from "./account-slots";

/** A skill as read in a snapshot: its name as read, the skill it resolved to, its level and hotbar slot. */
export interface AccountSkillView {
  /** The name as read from the client. */
  name: string;
  /** The `skills.id` the name resolved to, or `null` when no loaded skill has it. */
  skillId: string | null;
  /** The skill's level, or `null` when it wasn't read. */
  level: number | null;
  /** The hotbar slot it sits in, or `null` when it isn't on the bar. */
  slot: string | null;
}

/** A stigma as read in a snapshot. */
export interface AccountStigmaView {
  /** The slot's unlock level. */
  slotLevel: number;
  /** The stigma's name as read. */
  name: string;
  /** The `skills.id` the name resolved to, or `null`. */
  skillId: string | null;
}

/** A snapshot as returned to callers: its row, its skills and its stigmas. */
export type AccountSnapshotView = AccountSnapshotRow & {
  skills: AccountSkillView[];
  stigmas: AccountStigmaView[];
};

/** A roadmap item as returned to callers. */
export type AccountItemView = Omit<AccountRoadmapItemRow, "snapshotId">;

/** One loaded snapshot, as the overview lists it. */
export interface AccountEntry {
  /** The snapshot's id. */
  id: string;
  /** When it was read, ISO 8601. */
  capturedAt: string;
  /** The character's level then. */
  level: number;
}

/** The character: the chosen snapshot, its roadmap, and every snapshot loaded. */
export interface AccountOverview {
  /** Every loaded snapshot, oldest id first. */
  snapshots: AccountEntry[];
  /** The chosen snapshot, or `null` when none is loaded. */
  snapshot: AccountSnapshotView | null;
  /** The roadmap ranked against the chosen snapshot, by rank; `[]` without one. */
  roadmap: AccountItemView[];
}

/** Read access to the character. */
export interface AccountService {
  /**
   * Returns the character as a snapshot shows it.
   *
   * @param choice - `snapshot` names the snapshot to show; the latest when omitted
   * @throws {NotFoundError} if `choice.snapshot` names a snapshot that isn't loaded
   */
  overview(choice?: { snapshot?: string | undefined }): AccountOverview;
}

/**
 * Builds the view of a stored snapshot.
 *
 * @param repos - the repos to read from
 * @param row - the snapshot row
 * @returns the snapshot with its skills and stigmas, each in the order it was read
 */
function snapshotView(repos: Repos, row: AccountSnapshotRow): AccountSnapshotView {
  const skills: AccountSkillView[] = [];
  const stigmas: AccountStigmaView[] = [];
  for (const skill of repos.account.skills(row.id)) {
    const slotLevel = stigmaSlotLevel(skill.slot);
    if (slotLevel === undefined) {
      skills.push({
        name: skill.skillName,
        skillId: skill.skillId,
        level: skill.level,
        slot: skill.slot,
      });
    } else {
      stigmas.push({ slotLevel, name: skill.skillName, skillId: skill.skillId });
    }
  }
  return { ...row, skills, stigmas };
}

/**
 * Builds an {@link AccountService} over `store`.
 *
 * @param store - the store to read through
 * @returns the service
 */
export function createAccountService(store: Store): AccountService {
  return {
    /** @inheritdoc */
    overview: (choice = {}) => {
      const repos = store.repos;
      const rows = repos.account.snapshots();
      const snapshots = rows.map(({ id, capturedAt, level }) => ({ id, capturedAt, level }));
      const chosen =
        choice.snapshot === undefined ? rows.at(-1) : repos.account.getSnapshot(choice.snapshot);
      if (choice.snapshot !== undefined && !chosen) {
        throw new NotFoundError("account snapshot", choice.snapshot);
      }
      if (!chosen) return { snapshots, snapshot: null, roadmap: [] };
      const roadmap = repos.account
        .roadmap(chosen.id)
        .map(({ snapshotId: _snapshotId, ...item }) => item);
      return { snapshots, snapshot: snapshotView(repos, chosen), roadmap };
    },
  };
}
