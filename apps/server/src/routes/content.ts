import { Hono } from "hono";
import { z } from "zod";
import type { AnyFilters as Filters, ApiSpec } from "../registry";
import type { CrudEndpoints } from "../services/content";
import { validate } from "./validate";

/** A registry entry's list filters, when it declares any. */
export interface FilteredSpec {
  /** The list filters `GET /` accepts. */
  filters?: Filters;
}

/** What the generic CRUD router reads from a registry entry. */
export interface CrudRouteSpec extends FilteredSpec {
  /** The request schemas. */
  api: ApiSpec;
}

/** The zod shape of `S`'s list query: each declared filter's schema, optional. */
type ListShape<S extends FilteredSpec> = S extends { filters: infer F extends Filters }
  ? { [K in keyof F]: z.ZodOptional<F[K]["schema"]> }
  : Record<never, never>;

/** The list filter values `S`'s `GET /` passes on, by name. */
export type FilterValues<S extends FilteredSpec> = S extends { filters: infer F extends Filters }
  ? { [K in keyof F]?: string }
  : Record<never, never>;

/**
 * Builds the query schema of a list endpoint from its declared filters:
 * every filter is an optional query param validated by its own schema;
 * other params are ignored.
 *
 * @typeParam S - the registry entry whose filters these are
 * @param filters - the declared filters, by query param name
 * @returns the `z.object` schema
 */
export function listQuery<S extends FilteredSpec>(
  filters: S["filters"],
): z.ZodObject<ListShape<S>> {
  const declared: Filters = filters ?? {};
  return z.object(
    Object.fromEntries(
      Object.entries(declared).map(([name, filter]) => [name, filter.schema.optional()]),
    ),
  ) as unknown as z.ZodObject<ListShape<S>>;
}

/**
 * Builds the CRUD router of one registered type: `GET /` (filtered by its
 * declared list filters), `GET /:id`, `POST /` (201), `PATCH /:id` and
 * `DELETE /:id` (204). The request body goes to the service whole,
 * `sources` included; `:id` is parsed by the type's own id schema.
 *
 * @typeParam S - the type's registry entry
 * @typeParam View - what the service returns
 * @param svc - the endpoints the router delegates to
 * @param spec - the type's registry entry: request schemas and list filters
 * @returns a Hono sub-app mountable with `.route()`
 */
export function crudRouter<S extends CrudRouteSpec, View>(
  svc: CrudEndpoints<
    z.output<S["api"]["id"]>,
    z.output<S["api"]["input"]>,
    z.output<S["api"]["patch"]>,
    View,
    FilterValues<S>
  >,
  spec: S,
) {
  const query = listQuery<S>(spec.filters);
  const param = z.object({ id: spec.api.id });
  const input = spec.api.input as S["api"]["input"];
  const patch = spec.api.patch as S["api"]["patch"];
  return new Hono()
    .get("/", validate("query", query), (c) => {
      const filter = c.req.valid("query") as unknown as FilterValues<S>;
      return c.json(svc.list(filter));
    })
    .get("/:id", validate("param", param), (c) => {
      const { id } = c.req.valid("param") as { id: z.output<S["api"]["id"]> };
      return c.json(svc.get(id));
    })
    .post("/", validate("json", input), (c) => {
      const body = c.req.valid("json") as z.output<S["api"]["input"]>;
      return c.json(svc.create(body), 201);
    })
    .patch("/:id", validate("param", param), validate("json", patch), (c) => {
      const { id } = c.req.valid("param") as { id: z.output<S["api"]["id"]> };
      const body = c.req.valid("json") as z.output<S["api"]["patch"]>;
      return c.json(svc.update(id, body));
    })
    .delete("/:id", validate("param", param), (c) => {
      const { id } = c.req.valid("param") as { id: z.output<S["api"]["id"]> };
      svc.remove(id);
      return c.body(null, 204);
    });
}
