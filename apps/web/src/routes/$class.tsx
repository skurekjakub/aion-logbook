import { createFileRoute } from "@tanstack/react-router";
import { recordsQuery } from "../api/queries";
import { resolveClass } from "../app/class-route";

export const Route = createFileRoute("/$class")({
  beforeLoad: async ({ params, context }) =>
    resolveClass(
      params.class,
      // A cached list answers at once; the root's own query keeps it fresh.
      await context.queryClient.query({ ...recordsQuery(), staleTime: "static" }),
    ),
});
