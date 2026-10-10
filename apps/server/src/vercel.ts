/**
 * The data API as a Vercel function: an in-memory database seeded from the
 * committed snapshot, which the bundle carries, served read-only. Each
 * instance seeds its own copy on cold start, so a write could never
 * persist; `POST`, `PATCH` and `DELETE` answer 405 instead. Bundled by
 * `cli/build-vercel.ts`, which also places the migrations the bundle
 * reads next to it.
 */
import { getRequestListener } from "@hono/node-server";
import snapshot from "../../../data/snapshot.json" with { type: "json" };
import { createApp } from "./app";
import { openDb } from "./db/client";
import { createStore } from "./repos";
import { createServices } from "./services";
import type { Snapshot } from "./services/export";
import { restoreSnapshot } from "./services/export";

/**
 * Builds the read-only API over an in-memory database seeded from `seed`.
 *
 * @param seed - the snapshot to serve
 * @returns a fetch handler: the app's response to a `GET` or `HEAD`, and
 *   405 with an `Allow` header to anything else
 * @throws if the snapshot can't be restored (see `restoreSnapshot`)
 */
export function readOnlyHandler(
  seed: Snapshot,
): (request: Request) => Response | Promise<Response> {
  const store = createStore(openDb(":memory:"));
  restoreSnapshot(store, seed);
  const app = createApp(createServices(store));
  return (request) => {
    if (request.method === "GET" || request.method === "HEAD") return app.fetch(request);
    return Response.json(
      { error: "this deployment is read-only" },
      { status: 405, headers: { Allow: "GET, HEAD" } },
    );
  };
}

export default getRequestListener(readOnlyHandler(snapshot as unknown as Snapshot));
