import { Hono } from "hono";
import { z } from "zod";
import type { AccountService } from "../services/account";
import type { RoadmapService } from "../services/roadmap";
import { validate } from "./validate";

/** Query params accepted by both routes: the snapshot to show, by id. */
const snapshotQuery = z.object({ snapshot: z.string().min(1).optional() });

/**
 * Builds the read-only router for the character: `GET /` returns the
 * latest snapshot (or the one `?snapshot=` names) and every loaded
 * snapshot by id; `GET /roadmap` returns the roadmap ranked against it,
 * derived items first, then curated ones.
 *
 * @param svc - the account service `GET /` delegates to
 * @param roadmap - the roadmap service `GET /roadmap` delegates to
 * @returns a Hono sub-app mountable with `.route()`
 */
export function accountRouter(svc: AccountService, roadmap: RoadmapService) {
  return new Hono()
    .get("/", validate("query", snapshotQuery), (c) => c.json(svc.overview(c.req.valid("query"))))
    .get("/roadmap", validate("query", snapshotQuery), (c) =>
      c.json(roadmap.roadmap(c.req.valid("query"))),
    );
}
