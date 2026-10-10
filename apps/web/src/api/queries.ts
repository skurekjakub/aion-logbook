/**
 * One TanStack Query options factory per API resource. Use them with
 * `useQuery(buildsQuery("gladiator"))` in components, or
 * `context.queryClient.ensureQueryData(recordsQuery())` in route loaders.
 *
 * Every `queryFn` goes through hono's `parseResponse`: it resolves to the
 * route's success body, typed from the server, and throws a `DetailedError`
 * (status plus error body) for any non-2xx response, which `ErrorBox`
 * describes.
 *
 * A list whose rows belong to a class takes the class: it goes on the
 * request as `?class=` (rows that apply to every class come back too) and
 * in the query key, so each class's lists are cached apart.
 *
 * @module
 */
import { queryOptions } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { parseResponse } from "hono/client";
import { api } from "./client";

/** An Aion 2 class, as the server's `?class=` list filter accepts it. */
export type GameClass = NonNullable<InferRequestType<typeof api.builds.$get>["query"]["class"]>;

/** Glossary kinds accepted by `/api/glossary?kind=`. */
export type GlossaryKindFilter = NonNullable<
  InferRequestType<typeof api.glossary.$get>["query"]["kind"]
>;

/** Source sites accepted by `/api/sources?site=`. */
export type SourceSiteFilter = NonNullable<
  InferRequestType<typeof api.sources.$get>["query"]["site"]
>;

/**
 * All research records, by slug, each with the classes it covers.
 *
 * @returns the query options
 */
export const recordsQuery = () =>
  queryOptions({
    queryKey: ["records"],
    queryFn: () => parseResponse(api.records.$get({ query: {} })),
  });

/**
 * One research record: the header's lede, caveat, season label and update date.
 *
 * @param slug - the record's slug, e.g. `001-gladiator-build`
 * @returns the query options
 */
export const recordQuery = (slug: string) =>
  queryOptions({
    queryKey: ["records", slug],
    queryFn: () => parseResponse(api.records[":slug"].$get({ param: { slug } })),
  });

/**
 * Sources, each with the records it belongs to and its capture. Feed the
 * unfiltered list to `useSourceIndex` for chips.
 *
 * @param filter - restrict to one site, and/or to the sources one research
 *   record (by slug) owns or cites
 * @returns the query options
 */
export const sourcesQuery = (filter: { site?: SourceSiteFilter; record?: string } = {}) =>
  queryOptions({
    queryKey: ["sources", { site: filter.site ?? null, record: filter.record ?? null }],
    queryFn: () =>
      parseResponse(api.sources.$get({ query: { site: filter.site, record: filter.record } })),
  });

/**
 * One research record's capture ledger, ordered by path.
 *
 * @param record - the record's slug
 * @returns the query options
 */
export const capturesQuery = (record: string) =>
  queryOptions({
    queryKey: ["captures", { record }],
    queryFn: () => parseResponse(api.captures.$get({ query: { record } })),
  });

/**
 * Glossary entries.
 *
 * @param kind - restrict to one kind
 * @returns the query options
 */
export const glossaryQuery = (kind?: GlossaryKindFilter) =>
  queryOptions({
    queryKey: ["glossary", { kind: kind ?? null }],
    queryFn: () => parseResponse(api.glossary.$get({ query: { kind } })),
  });

/**
 * A class's builds, current and obsolete, each with its skill priorities,
 * stigma slots and macro chains, every skill named in full.
 *
 * @param cls - the class
 * @returns the query options
 */
export const buildsQuery = (cls: GameClass) =>
  queryOptions({
    queryKey: ["builds", { class: cls }],
    queryFn: () => parseResponse(api.builds.$get({ query: { class: cls } })),
  });

/**
 * A class's mechanics writeups, the class-wide ones included.
 *
 * @param cls - the class
 * @returns the query options
 */
export const mechanicsQuery = (cls: GameClass) =>
  queryOptions({
    queryKey: ["mechanics", { class: cls }],
    queryFn: () => parseResponse(api.mechanics.$get({ query: { class: cls } })),
  });

/**
 * A class's ranked takeaways, the class-wide ones included.
 *
 * @param cls - the class
 * @returns the query options
 */
export const takeawaysQuery = (cls: GameClass) =>
  queryOptions({
    queryKey: ["takeaways", { class: cls }],
    queryFn: () => parseResponse(api.takeaways.$get({ query: { class: cls } })),
  });

/**
 * "For your character" recommendations, which belong to a research record.
 *
 * @param record - the record whose recommendations to list; null for every record's
 * @returns the query options
 */
export const recommendationsQuery = (record: string | null) =>
  queryOptions({
    queryKey: ["recommendations", { record }],
    queryFn: () =>
      parseResponse(api.recommendations.$get({ query: { record: record ?? undefined } })),
  });

/**
 * The character: a snapshot (the latest unless named) with its skills,
 * stigmas and macro chains as read, its roadmap, and every loaded snapshot
 * by id.
 *
 * @param snapshot - the snapshot id to show; the latest when omitted
 * @returns the query options
 */
export const accountQuery = (snapshot?: string) =>
  queryOptions({
    queryKey: ["account", { snapshot: snapshot ?? null }],
    queryFn: () => parseResponse(api.account.$get({ query: { snapshot } })),
  });
