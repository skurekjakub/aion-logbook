/**
 * The deployment's sync button: reads the character from the official site
 * into the in-memory database right away, then asks a second sync service
 * (the GitHub workflow, or its page) to save it for good. What it loads
 * lives as long as the function instance, and a cold start or a deploy
 * serves the committed snapshot again.
 *
 * @module
 */
import type { AccountSnapshotFile } from "@aion/schema";
import { loadSnapshot } from "../importers/account";
import type { Store } from "../repos";
import type { AccountService, AccountSnapshotView } from "./account";
import type { SyncService, SyncStart } from "./sync";
import { SYNC_WORKFLOW_URL } from "./sync";

/** How long a live read is reused before a press reads the site again, in milliseconds. */
export const LIVE_REUSE_MS = 60_000;

/** What the live sync reaches outside itself. */
export interface LiveSyncDeps {
  /** The store the live snapshot is loaded into. */
  store: Store;
  /** Reads the latest loaded snapshot, which the live one carries macros and slots from. */
  account: AccountService;
  /**
   * Reads the character from the official site and maps it onto a snapshot.
   *
   * @param previous - the snapshot to carry what the site doesn't publish from, or `null`
   * @param capturedAt - when it was read, ISO 8601 with an offset
   * @returns the snapshot
   * @throws if the site can't be read or its answer can't be mapped
   */
  fetchSnapshot: (
    previous: AccountSnapshotFile | null,
    capturedAt: string,
  ) => Promise<AccountSnapshotFile>;
  /**
   * Reports whether two snapshots hold the same character, ignoring when they were read.
   *
   * @param a - one snapshot
   * @param b - the other
   * @returns `true` when nothing worth saving changed
   */
  same: (a: AccountSnapshotFile, b: AccountSnapshotFile) => boolean;
  /** Saves a changed character for good: the GitHub workflow, or its page. */
  save: SyncService;
  /**
   * The current time.
   *
   * @returns now
   */
  now?: () => Date;
}

/**
 * Turns a loaded snapshot back into the snapshot file it was read from.
 *
 * @param view - the loaded snapshot
 * @returns the file; `screens` is empty, since the database doesn't keep it
 */
export function toSnapshotFile(view: AccountSnapshotView): AccountSnapshotFile {
  return {
    schema: "aion-account-snapshot/1",
    capturedAt: view.capturedAt,
    character: {
      name: view.character,
      class: view.class,
      level: view.level,
      gearScore: view.gearScore,
      server: view.server,
    },
    skills: view.skills.map(({ name, level, slot }) => ({ name, level, slot })),
    stigmas: view.stigmas.map(({ slotLevel, name }) => ({ slotLevel, name })),
    macros: view.macros.map(({ name, key, steps }) => ({
      name,
      key,
      steps: steps.map((step) => step.name),
    })),
    screens: [],
    unread: view.unread,
  };
}

/**
 * The id a live snapshot is loaded under: the minute it was read, which
 * sorts after every snapshot filed under that day or earlier, so it shows
 * as the latest.
 *
 * @param at - when it was read
 * @returns the id, e.g. `2026-10-10T11:05Z`
 */
export function liveId(at: Date): string {
  return `${at.toISOString().slice(0, 16)}Z`;
}

/**
 * Builds the deployment's sync service: a press reads the character into
 * memory (reusing a read under {@link LIVE_REUSE_MS} old, so a public
 * button can't hammer the official site), replaces the previous live
 * snapshot, and, when the character changed since the latest committed
 * snapshot, starts `save`.
 *
 * @param deps - the store, the reads, the comparison and the saving service
 * @returns the service
 */
export function liveSyncService(deps: LiveSyncDeps): SyncService {
  const now = deps.now ?? (() => new Date());
  let last: { at: number; id: string; result: SyncStart } | null = null;
  return {
    info: () => ({ mode: "live", url: SYNC_WORKFLOW_URL }),
    /**
     * Reads the character into memory and starts saving it when it changed.
     *
     * @returns live with the level read and what saving did, or failed
     */
    async start() {
      const at = now();
      if (last && at.getTime() - last.at < LIVE_REUSE_MS) return last.result;
      try {
        const base = latestCommitted(deps.account, last?.id ?? null);
        const previous = base ? toSnapshotFile(base) : null;
        const snapshot = await deps.fetchSnapshot(previous, at.toISOString());
        const id = liveId(at);
        loadSnapshot(deps.store, id, snapshot, last ? [last.id] : []);
        const changed = previous === null || !deps.same(previous, snapshot);
        const save: SyncStart = changed ? await deps.save.start() : { status: "unchanged" };
        const { level, gearScore } = snapshot.character;
        const message = `Lv ${level}${gearScore === null ? "" : ` · GS ${gearScore}`}`;
        const result: SyncStart = { status: "live", message, save };
        last = { at: at.getTime(), id, result };
        return result;
      } catch (err) {
        return { status: "failed", message: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

/**
 * Finds the latest loaded snapshot other than the live one: the one a live
 * read carries macros and slots from and is compared with.
 *
 * @param account - the account service
 * @param liveSnapshot - the live snapshot's id, or `null` before the first read
 * @returns the snapshot, or `null` when none other is loaded
 */
function latestCommitted(
  account: AccountService,
  liveSnapshot: string | null,
): AccountSnapshotView | null {
  const id = account
    .overview()
    .snapshots.map((s) => s.id)
    .filter((s) => s !== liveSnapshot)
    .at(-1);
  return id === undefined ? null : account.overview({ snapshot: id }).snapshot;
}
