/**
 * Starting a character sync from the web app, the way picked where the
 * server is composed: locally the server runs `pnpm sync` itself; on the
 * deployment it dispatches the GitHub workflow (`.github/workflows/sync.yml`)
 * when it holds a token, and otherwise points at the workflow's page, where
 * "Run workflow" starts it by hand.
 *
 * @module
 */

/** The repository the sync workflow runs in. */
export const SYNC_REPO = "skurekjakub/aion-logbook";

/** The sync workflow's page on GitHub, where it can be run by hand. */
export const SYNC_WORKFLOW_URL = `https://github.com/${SYNC_REPO}/actions/workflows/sync.yml`;

/** How long after a run starts another dispatch is refused, in milliseconds. */
export const SYNC_COOLDOWN_MS = 15 * 60_000;

/** How a sync starts: run here, dispatched to GitHub, or by hand on GitHub. */
export type SyncMode = "local" | "github" | "manual";

/** What the web app needs to draw the sync button. */
export interface SyncInfo {
  /** How a press starts the sync. */
  mode: SyncMode;
  /** The workflow's page on GitHub. */
  url: string;
}

/** What a press did. */
export type SyncStart =
  /** The local sync ran to the end; `message` is its last line of output. */
  | { status: "synced"; message: string }
  /** The workflow was dispatched; the deployment carries the result once it commits. */
  | { status: "dispatched"; url: string }
  /** A sync is running or ran moments ago; `url` shows it. */
  | { status: "busy"; url: string }
  /** This server can't start a sync; `url` is where to run it by hand. */
  | { status: "manual"; url: string }
  /** The sync failed; `message` says why. */
  | { status: "failed"; message: string };

/** Starts character syncs. */
export interface SyncService {
  /**
   * Says how a press starts the sync.
   *
   * @returns the mode and the workflow's page
   */
  info(): SyncInfo;
  /**
   * Starts a sync.
   *
   * @returns what the press did; a failure is an outcome, never a throw
   */
  start(): Promise<SyncStart>;
}

/** What a finished `pnpm sync` left. */
export interface SyncRun {
  /** Its exit code. */
  code: number;
  /** Its standard output and error, interleaved. */
  output: string;
}

/**
 * Takes the last non-empty line of a program's output.
 *
 * @param output - the output
 * @param fallback - what to say for empty output
 * @returns the line, or `fallback` when there is none
 */
function lastLine(output: string, fallback: string): string {
  return (
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1) ?? fallback
  );
}

/**
 * Builds the sync service that runs `pnpm sync` on this machine, one run
 * at a time; a press while one runs answers busy.
 *
 * @param runSync - runs `pnpm sync` in the repo root and resolves when it exits
 * @returns the service
 */
export function localSyncService(runSync: () => Promise<SyncRun>): SyncService {
  let running = false;
  return {
    info: () => ({ mode: "local", url: SYNC_WORKFLOW_URL }),
    /**
     * Runs `pnpm sync` unless a run is under way.
     *
     * @returns synced or failed with the run's last line, or busy
     */
    async start() {
      if (running) return { status: "busy", url: SYNC_WORKFLOW_URL };
      running = true;
      try {
        const run = await runSync();
        const message = lastLine(run.output, `pnpm sync exited ${run.code}`);
        return run.code === 0 ? { status: "synced", message } : { status: "failed", message };
      } catch (err) {
        return { status: "failed", message: err instanceof Error ? err.message : String(err) };
      } finally {
        running = false;
      }
    },
  };
}

/** The fields of a workflow run the cooldown reads. */
interface WorkflowRun {
  status: string;
  created_at: string;
  html_url: string;
}

/**
 * Builds the sync service that dispatches the GitHub workflow on `main`.
 * It refuses, as busy, while the latest run is queued or in progress or
 * was created less than {@link SYNC_COOLDOWN_MS} ago, so a public button
 * can't queue runs back to back. Inside the cooldown of a run it has seen,
 * it answers busy from memory, so repeated presses don't spend the token's
 * API rate limit.
 *
 * @param token - a GitHub token allowed to dispatch the repository's workflows
 * @param fetchFn - the HTTP client
 * @param now - the clock
 * @returns the service
 */
export function githubSyncService(
  token: string,
  fetchFn: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): SyncService {
  const api = `https://api.github.com/repos/${SYNC_REPO}/actions/workflows/sync.yml`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "aion-logbook",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  let quietUntil = 0;
  let quietUrl = SYNC_WORKFLOW_URL;
  /**
   * Answers busy from memory until `until`.
   *
   * @param until - when the cooldown ends, in epoch milliseconds
   * @param url - the page a busy answer points at
   * @returns the busy answer
   */
  const quiet = (until: number, url: string): SyncStart => {
    quietUntil = until;
    quietUrl = url;
    return { status: "busy", url };
  };
  return {
    info: () => ({ mode: "github", url: SYNC_WORKFLOW_URL }),
    /**
     * Dispatches the workflow unless the latest run is unfinished or too recent.
     *
     * @returns dispatched, busy with the latest run's page, or failed with GitHub's status
     */
    async start() {
      const at = now().getTime();
      if (at < quietUntil) return { status: "busy", url: quietUrl };
      try {
        const runs = await fetchFn(`${api}/runs?per_page=1`, { headers });
        if (!runs.ok) return { status: "failed", message: `GitHub answered ${runs.status}` };
        const latest = ((await runs.json()) as { workflow_runs?: WorkflowRun[] })
          .workflow_runs?.[0];
        if (latest) {
          const started = Date.parse(latest.created_at);
          if (at - started < SYNC_COOLDOWN_MS) {
            return quiet(started + SYNC_COOLDOWN_MS, latest.html_url);
          }
          if (latest.status !== "completed") return { status: "busy", url: latest.html_url };
        }
        const dispatch = await fetchFn(`${api}/dispatches`, {
          method: "POST",
          headers,
          body: JSON.stringify({ ref: "main" }),
        });
        if (!dispatch.ok) {
          return { status: "failed", message: `GitHub answered ${dispatch.status}` };
        }
        quiet(at + SYNC_COOLDOWN_MS, SYNC_WORKFLOW_URL);
        return { status: "dispatched", url: SYNC_WORKFLOW_URL };
      } catch (err) {
        return { status: "failed", message: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

/**
 * Builds the sync service of a server that can't start a sync: a press
 * answers with the workflow's page.
 *
 * @returns the service
 */
export function manualSyncService(): SyncService {
  return {
    info: () => ({ mode: "manual", url: SYNC_WORKFLOW_URL }),
    start: () => Promise.resolve({ status: "manual", url: SYNC_WORKFLOW_URL }),
  };
}
