import { Hono } from "hono";
import { z } from "zod";
import { REGISTRY } from "../registry";
import type { RecordsService } from "../services/records";
import { listQuery } from "./content";
import { validate } from "./validate";

/** A `:slug` path parameter. */
const slugParam = z.object({ slug: z.string().min(1) });

/** Query params accepted by `GET /`: the registry's list filters for records. */
const recordsQuery = listQuery<typeof REGISTRY.researchRecords>(REGISTRY.researchRecords.filters);

/**
 * Builds the read-only router for `records`: `GET /` (filtered by the
 * registry's list filters for records, e.g. `?class=`) and `GET /:slug`.
 *
 * @param svc - the records service the router delegates to
 * @returns a Hono sub-app mountable with `.route()`
 */
export function recordsRouter(svc: RecordsService) {
  return new Hono()
    .get("/", validate("query", recordsQuery), (c) => c.json(svc.list(c.req.valid("query"))))
    .get("/:slug", validate("param", slugParam), (c) => {
      const { slug } = c.req.valid("param");
      return c.json(svc.get(slug));
    });
}
