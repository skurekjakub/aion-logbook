import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { ErrorBox } from "./ErrorBox";

/** Props for {@link QueryResult}. */
export interface QueryResultProps<T> {
  /** The query to render, as returned by `useQuery`. */
  query: UseQueryResult<T>;
  /** What the query loads, in words; named in the loading and error states. */
  resource: string;
  /** Renders the loaded data. */
  children: (data: T) => ReactNode;
}

/**
 * Renders a query's three states: "Loading …" while pending, an
 * {@link ErrorBox} naming `resource` on failure, and `children(data)` once
 * loaded. Takes the query result as a prop; it does no fetching itself.
 *
 * @param props - the query result, the resource's name, and the render function for its data
 * @returns the loading state, the error box, or the rendered data
 */
export function QueryResult<T>({ query, resource, children }: QueryResultProps<T>) {
  if (query.isPending) return <EmptyState>Loading {resource}…</EmptyState>;
  if (query.isError) return <ErrorBox resource={resource} error={query.error} />;
  return <>{children(query.data)}</>;
}
