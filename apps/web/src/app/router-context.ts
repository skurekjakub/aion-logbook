import type { QueryClient } from "@tanstack/react-query";

/** What every route's `beforeLoad`/`loader` receives as `context`. */
export interface RouterContext {
  /** The app's query client, for `context.queryClient.ensureQueryData(...)` in loaders. */
  queryClient: QueryClient;
}
