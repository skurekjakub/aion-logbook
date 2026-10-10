import { Hono } from "hono";
import type { ExportService } from "../services/export";

/**
 * Builds the read-only router for a full database snapshot: `GET /`.
 *
 * @param svc - the export service the router delegates to
 * @returns a Hono sub-app mountable with `.route()`
 */
export function exportRouter(svc: ExportService) {
  return new Hono().get("/", (c) => c.json(svc.run()));
}
