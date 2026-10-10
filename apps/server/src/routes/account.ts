import { Hono } from "hono";
import { z } from "zod";
import type { AccountService } from "../services/account";
import { validate } from "./validate";

/** Query params accepted by `GET /`: the snapshot to show, by id. */
const overviewQuery = z.object({ snapshot: z.string().min(1).optional() });

/**
 * Builds the read-only router for the character: `GET /` returns the
 * latest snapshot and its roadmap (or the snapshot `?snapshot=` names),
 * and every loaded snapshot by id.
 *
 * @param svc - the account service the router delegates to
 * @returns a Hono sub-app mountable with `.route()`
 */
export function accountRouter(svc: AccountService) {
  return new Hono().get("/", validate("query", overviewQuery), (c) =>
    c.json(svc.overview(c.req.valid("query"))),
  );
}
