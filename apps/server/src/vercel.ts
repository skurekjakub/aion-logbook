/**
 * The data API as a Vercel function: an in-memory database seeded from the
 * committed snapshot, which the bundle carries, served read-only. Each
 * instance seeds its own copy on cold start, so a write could never
 * persist; `POST`, `PATCH` and `DELETE` answer 405 instead, but for the
 * sync button's `POST /api/account/sync`, which dispatches the GitHub
 * sync workflow when `SYNC_GITHUB_TOKEN` is set and otherwise answers
 * with the workflow's page. Bundled by `cli/build-vercel.ts`, which also
 * places the migrations the bundle reads next to it.
 */
import { getRequestListener } from "@hono/node-server";
import snapshot from "../../../data/snapshot.json" with { type: "json" };
import { createApp } from "./app";
import { openDb } from "./db/client";
import { createStore } from "./repos";
import { createServices } from "./services";
import type { Snapshot } from "./services/export";
import { restoreSnapshot } from "./services/export";
import type { SyncService } from "./services/sync";
import { githubSyncService, manualSyncService } from "./services/sync";

/** The one write the deployment takes: the sync button's press. */
const SYNC_PATH = "/api/account/sync";

/**
 * Builds the read-only API over an in-memory database seeded from `seed`.
 *
 * @param seed - the snapshot to serve
 * @param sync - how the sync button starts a sync; by hand on GitHub when omitted
 * @returns a fetch handler: the app's response to a `GET` or `HEAD` and to
 *   a `POST` of the sync button, and 405 with an `Allow` header to anything else
 * @throws if the snapshot can't be restored (see `restoreSnapshot`)
 */
export function readOnlyHandler(
  seed: Snapshot,
  sync: SyncService = manualSyncService(),
): (request: Request) => Response | Promise<Response> {
  const store = createStore(openDb(":memory:"));
  restoreSnapshot(store, seed);
  const app = createApp(createServices(store, sync));
  return (request) => {
    if (request.method === "GET" || request.method === "HEAD") return app.fetch(request);
    if (request.method === "POST" && new URL(request.url).pathname === SYNC_PATH) {
      return app.fetch(request);
    }
    return Response.json(
      { error: "this deployment is read-only" },
      { status: 405, headers: { Allow: "GET, HEAD" } },
    );
  };
}

const token = process.env.SYNC_GITHUB_TOKEN;
export default getRequestListener(
  readOnlyHandler(
    snapshot as unknown as Snapshot,
    token ? githubSyncService(token) : manualSyncService(),
  ),
);
