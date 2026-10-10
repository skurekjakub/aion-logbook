import { Hono } from "hono";
import { httpStatus } from "./errors";
import { REGISTRY as R } from "./registry";
import { accountRouter } from "./routes/account";
import { capturesRouter } from "./routes/captures";
import { crudRouter } from "./routes/content";
import { exportRouter } from "./routes/export";
import { glossaryRouter } from "./routes/glossary";
import { recordsRouter } from "./routes/records";
import { sourcesRouter } from "./routes/sources";
import type { Services } from "./services";
import { contentEndpoints as endpoints } from "./services/content";

/**
 * Builds the server's Hono app: every registered type's routes under
 * `/api` at its registry path, the export, and a shared error mapping.
 *
 * The `.route()` calls stay spelled out, one per type, so `AppType` keeps
 * each route's request and response types; `test/registry.test.ts` checks
 * that every registered path is mounted.
 *
 * An error `httpStatus` knows answers with its status and body; anything
 * else is logged with `console.error` and answers 500.
 *
 * @param services - the service set every route delegates to
 * @returns the assembled Hono app
 */
export function createApp(services: Services) {
  return new Hono()
    .basePath("/api")
    .route(R.skills.path, crudRouter(endpoints(services.skills), R.skills))
    .route(R.builds.path, crudRouter(services.builds, R.builds))
    .route(R.macros.path, crudRouter(services.macros, R.macros))
    .route(R.mechanics.path, crudRouter(endpoints(services.mechanics), R.mechanics))
    .route(R.rngFactors.path, crudRouter(endpoints(services.rngFactors), R.rngFactors))
    .route(R.timeline.path, crudRouter(endpoints(services.timeline), R.timeline))
    .route(R.takeaways.path, crudRouter(endpoints(services.takeaways), R.takeaways))
    .route(
      R.recommendations.path,
      crudRouter(endpoints(services.recommendations), R.recommendations),
    )
    .route(R.sources.path, sourcesRouter(services.sources))
    .route(R.glossary.path, glossaryRouter(services.glossary))
    .route(R.researchRecords.path, recordsRouter(services.records))
    .route(R.captures.path, capturesRouter(services.captures))
    .route("/account", accountRouter(services.account, services.roadmap))
    .route("/export", exportRouter(services.export))
    .onError((err, c) => {
      const known = httpStatus(err);
      if (known) return c.json(known.body, known.status);
      console.error(err);
      return c.json({ error: "internal" as const }, 500);
    });
}

/** The full type of the app built by {@link createApp}, for the `hc` typed client. */
export type AppType = ReturnType<typeof createApp>;
