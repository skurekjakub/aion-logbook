import { Hono } from "hono";
import { REGISTRY } from "../registry";
import type { CapturesService } from "../services/captures";
import { listQuery } from "./content";
import { validate } from "./validate";

/** Query params accepted by `GET /`: the registry's list filters for captures. */
const capturesQuery = listQuery<typeof REGISTRY.captures>(REGISTRY.captures.filters);

/**
 * Builds the read-only router for `captures`: `GET /`, filtered by the
 * registry's list filters for captures (`?record=`, `?path=`).
 *
 * @param svc - the captures service the router delegates to
 * @returns a Hono sub-app mountable with `.route()`
 */
export function capturesRouter(svc: CapturesService) {
  return new Hono().get("/", validate("query", capturesQuery), (c) =>
    c.json(svc.list(c.req.valid("query"))),
  );
}
