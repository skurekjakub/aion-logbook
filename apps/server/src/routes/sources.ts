import { sourceId, sourceInput, sourcePatch } from "@aion/schema";
import { Hono } from "hono";
import { z } from "zod";
import { REGISTRY } from "../registry";
import type { SourcesService } from "../services/sources";
import { listQuery } from "./content";
import { validate } from "./validate";

/** A `:id` path parameter, validated as a `<site>:<key>` source id. */
const idParam = z.object({ id: sourceId });

/** Query params accepted by `GET /`: the registry's list filters for sources. */
const sourcesQuery = listQuery<typeof REGISTRY.sources>(REGISTRY.sources.filters);

/**
 * Builds the CRUD router for `sources`: `GET /` (filtered by the registry's
 * list filters for sources, `?site=` and `?record=`), `GET /:id`, `POST /`
 * (201), `PATCH /:id`, `DELETE /:id` (204).
 * `:id` is a `<site>:<key>` string (e.g. `yt:dQw4w9WgXcQ`), sent URL-encoded
 * (`yt%3AdQw4w9WgXcQ`); Hono decodes path params before they reach `idParam`.
 *
 * @param svc - the sources service the router delegates to
 * @returns a Hono sub-app mountable with `.route()`
 */
export function sourcesRouter(svc: SourcesService) {
  return new Hono()
    .get("/", validate("query", sourcesQuery), (c) => c.json(svc.list(c.req.valid("query"))))
    .get("/:id", validate("param", idParam), (c) => {
      const { id } = c.req.valid("param");
      return c.json(svc.get(id));
    })
    .post("/", validate("json", sourceInput), (c) => {
      const input = c.req.valid("json");
      return c.json(svc.create(input), 201);
    })
    .patch("/:id", validate("param", idParam), validate("json", sourcePatch), (c) => {
      const { id } = c.req.valid("param");
      const patch = c.req.valid("json");
      return c.json(svc.update(id, patch));
    })
    .delete("/:id", validate("param", idParam), (c) => {
      const { id } = c.req.valid("param");
      svc.remove(id);
      return c.body(null, 204);
    });
}
