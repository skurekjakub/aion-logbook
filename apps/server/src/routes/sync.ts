import { Hono } from "hono";
import type { SyncService } from "../services/sync";

/**
 * Reports whether a request comes from another site. A browser's
 * `Sec-Fetch-Site` decides when present, since a proxy (Vite's, locally)
 * rewrites `Host`; without it, an `Origin` naming another host than the
 * one the request was sent to does. A request with neither (curl, say)
 * isn't cross-site.
 *
 * @param headers - the request's headers
 * @returns `true` when the press must be refused
 */
export function crossSite(headers: Headers): boolean {
  const site = headers.get("sec-fetch-site");
  if (site !== null) return site !== "same-origin" && site !== "none";
  const origin = headers.get("origin");
  if (origin === null) return false;
  try {
    return new URL(origin).host !== headers.get("host");
  } catch {
    return true;
  }
}

/**
 * Builds the router behind the sync button: `GET /` says how a press
 * starts the sync, `POST /` starts one and answers what it did, with 502
 * when the sync failed and 403 when another site sent the press.
 *
 * @param svc - the sync service both routes delegate to
 * @returns a Hono sub-app mountable with `.route()`
 */
export function syncRouter(svc: SyncService) {
  return new Hono()
    .get("/", (c) => c.json(svc.info()))
    .post("/", async (c) => {
      if (crossSite(c.req.raw.headers)) {
        return c.json({ status: "forbidden" as const, message: "cross-site press refused" }, 403);
      }
      const result = await svc.start();
      return result.status === "failed" ? c.json(result, 502) : c.json(result, 200);
    });
}
