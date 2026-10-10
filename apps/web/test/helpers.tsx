import { QueryClient } from "@tanstack/react-query";
import { vi } from "vitest";

/** A canned API response: a JSON body, optionally with a non-200 status. */
export type Canned = { status?: number; body: unknown };

/**
 * The path and query of a fetch input, without the origin.
 *
 * @param input - what `fetch` was called with
 * @returns e.g. `/api/builds?class=gladiator`
 */
export function requestPath(input: RequestInfo | URL): string {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return url.replace(/^https?:\/\/[^/]+/, "");
}

/**
 * Replaces the global `fetch` with one that answers `/api/...` paths from
 * `routes` (keyed by path with its query string). Unknown paths answer 404.
 *
 * @param routes - path (e.g. `/api/builds?class=gladiator`) → canned response
 * @returns the mock, for asserting on calls
 */
export function stubApi(routes: Record<string, Canned>) {
  const mock = vi.fn((input: RequestInfo | URL) => {
    const path = requestPath(input);
    const canned = routes[path] ?? { status: 404, body: { error: "not_found", message: path } };
    const status = canned.status ?? 200;
    return Promise.resolve(
      new Response(JSON.stringify(canned.body), {
        status,
        statusText: status === 200 ? "OK" : "Error",
        headers: { "content-type": "application/json" },
      }),
    );
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

/**
 * Builds a query client that never retries, so failed queries settle at once in tests.
 *
 * @returns the client
 */
export function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}
