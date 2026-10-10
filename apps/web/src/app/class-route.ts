/**
 * What the routes under `routes/$class/` share: resolving the `$class`
 * path segment to its section. A class is data here: its pages are the
 * route files its tabs name, and it has them once a record covers it.
 *
 * @module
 */
import { notFound } from "@tanstack/react-router";
import type { ClassSection } from "./classes";
import { classSectionsWithContent } from "./classes";

/**
 * Resolves the `$class` path segment to its class's section, in any case,
 * as the router matches a static segment.
 *
 * @param id - the segment, e.g. `gladiator` or `Gladiator`
 * @param records - the loaded research records, each with the classes it covers
 * @returns the class's section with the record that covers it, for the route context
 * @throws the router's not-found error when no class has that id, or no record covers it
 */
export function resolveClass(
  id: string,
  records: ReadonlyArray<{ slug: string; classes: readonly string[] }>,
): { section: ClassSection } {
  const section = classSectionsWithContent(records).find((s) => s.id === id.toLowerCase());
  if (!section) throw notFound();
  return { section };
}
