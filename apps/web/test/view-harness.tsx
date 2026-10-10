import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { createAppRouter } from "../src/router";
import { ACCOUNT, RECORD, ROADMAP, SOURCES } from "./fixtures";
import type { Canned } from "./helpers";
import { stubApi, testQueryClient } from "./helpers";

/** What every rendered route is answered with unless a test overrides it. */
const DEFAULT_API: Record<string, Canned> = {
  "/api/records": { body: [RECORD] },
  [`/api/records/${RECORD.slug}`]: { body: RECORD },
  "/api/sources": { body: SOURCES },
  [`/api/sources?record=${RECORD.slug}`]: { body: SOURCES },
  "/api/account": { body: ACCOUNT },
  "/api/account/roadmap": { body: ROADMAP },
};

/**
 * Renders the whole app at `path` against a stubbed API: the gladiator
 * record, its sources, the character and its roadmap are answered unless
 * `api` overrides them.
 *
 * @param path - the URL to open, query string included
 * @param api - extra (or overriding) canned responses by request path
 * @returns the router, for asserting on its location
 */
export async function renderRoute(path: string, api: Record<string, Canned> = {}) {
  stubApi({ ...DEFAULT_API, ...api });
  const router = createAppRouter({
    queryClient: testQueryClient(),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}
