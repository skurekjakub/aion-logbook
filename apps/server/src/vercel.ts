/**
 * The data API as a Vercel function: an in-memory database seeded from the
 * committed snapshot, which the bundle carries, served read-only. Each
 * instance seeds its own copy on cold start, so a write could never
 * persist; `POST`, `PATCH` and `DELETE` answer 405 instead, but for the
 * sync button's `POST /api/account/sync`. That reads the character from
 * the official site into this instance's memory, where it lives until the
 * next cold start, and saves a change for good by dispatching the GitHub
 * sync workflow when `SYNC_GITHUB_TOKEN` is set, or otherwise answers with
 * the workflow's page. Bundled by `cli/build-vercel.ts`, which also places
 * the migrations the bundle reads next to it.
 */
import { sameSnapshot } from "@aion/armory/changes";
import { characterFile, fetchCharacter, fetchHttp } from "@aion/armory/fetch";
import { toSnapshot } from "@aion/armory/map";
import { getRequestListener } from "@hono/node-server";
import character from "../../../account/character.json" with { type: "json" };
import snapshot from "../../../data/snapshot.json" with { type: "json" };
import { createApp } from "./app";
import { openDb } from "./db/client";
import type { Store } from "./repos";
import { createStore } from "./repos";
import { createServices } from "./services";
import { createAccountService } from "./services/account";
import type { Snapshot } from "./services/export";
import { restoreSnapshot } from "./services/export";
import { liveSyncService } from "./services/live-sync";
import type { SyncService } from "./services/sync";
import { githubSyncService, manualSyncService } from "./services/sync";

/** The one write the deployment takes: the sync button's press. */
const SYNC_PATH = "/api/account/sync";

/**
 * Builds the read-only API over an in-memory database seeded from `seed`.
 *
 * @param seed - the snapshot to serve
 * @param sync - builds the sync button's service over the in-memory store;
 *   by hand on GitHub when omitted
 * @returns a fetch handler: the app's response to a `GET` or `HEAD` and to
 *   a `POST` of the sync button, and 405 with an `Allow` header to anything else
 * @throws if the snapshot can't be restored (see `restoreSnapshot`)
 */
export function readOnlyHandler(
  seed: Snapshot,
  sync: (store: Store) => SyncService = () => manualSyncService(),
): (request: Request) => Response | Promise<Response> {
  const store = createStore(openDb(":memory:"));
  restoreSnapshot(store, seed);
  const app = createApp(createServices(store, sync(store)));
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
const who = characterFile.parse(character);
export default getRequestListener(
  readOnlyHandler(snapshot as unknown as Snapshot, (store) =>
    liveSyncService({
      store,
      account: createAccountService(store),
      fetchSnapshot: async (previous, capturedAt) =>
        toSnapshot(await fetchCharacter(who, fetchHttp), previous, capturedAt),
      same: sameSnapshot,
      save: token ? githubSyncService(token) : manualSyncService(),
    }),
  ),
);
