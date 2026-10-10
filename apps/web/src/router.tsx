import type { QueryClient } from "@tanstack/react-query";
import type { RouterHistory } from "@tanstack/react-router";
import { createRouter } from "@tanstack/react-router";
import { EmptyState } from "./components/EmptyState";
import { ErrorBox } from "./components/ErrorBox";
import { routeTree } from "./routeTree.gen";

/** Options for {@link createAppRouter}. */
export interface AppRouterOptions {
  queryClient: QueryClient;
  /** Defaults to browser history; tests pass a memory history. */
  history?: RouterHistory;
}

/**
 * Builds the app's router over the generated file-route tree. A view that
 * throws while rendering shows an error box in the panel, and an unknown
 * path (or a class with no research yet) shows an empty state; the chrome
 * stays up in both cases.
 *
 * @param options - the query client (passed to routes as context) and an optional history
 * @returns the router
 */
export function createAppRouter({ queryClient, history }: AppRouterOptions) {
  return createRouter({
    routeTree,
    context: { queryClient },
    ...(history ? { history } : {}),
    scrollRestoration: true,
    defaultErrorComponent: ({ error }) => <ErrorBox resource="this view" error={error} />,
    defaultNotFoundComponent: () => (
      <EmptyState>Nothing lives at this address. Pick a section from the menu.</EmptyState>
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
