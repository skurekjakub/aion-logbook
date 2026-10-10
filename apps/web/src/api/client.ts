import type { AppType } from "@aion/server";
import { hc } from "hono/client";

/**
 * The typed client for the server's `/api` routes, e.g.
 * `api.builds.$get()`. Requests go to this page's origin (`/api/...`),
 * which the Vite dev server proxies to the API server. Only the server's
 * types are imported; none of its runtime code reaches the bundle.
 */
export const api = hc<AppType>("/").api;
