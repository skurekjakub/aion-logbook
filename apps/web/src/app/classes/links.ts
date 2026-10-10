/**
 * Builds a class's paths and links from its id and the routes under
 * `routes/$class/`, so a class's tabs name routes the route tree checks.
 *
 * @module
 */
import type { AppPath, ClassRoutePath, LinkTarget, SectionTab } from "./types";

/**
 * A route under a class, made concrete for one class.
 *
 * @param cls - the class's id, its first path segment
 * @param route - the route, e.g. `/$class/skills`
 * @returns the concrete path, e.g. `/gladiator/skills`
 */
export function classPath(cls: string, route: ClassRoutePath): AppPath {
  return `/${cls}${route.slice("/$class".length)}`;
}

/**
 * A link to a route under a class.
 *
 * @param cls - the class's id
 * @param route - the route; the class's landing page when omitted
 * @returns the link target
 */
export function classLink(cls: string, route: ClassRoutePath = "/$class"): LinkTarget {
  return { to: route, params: { class: cls } };
}

/**
 * One tab of a class.
 *
 * @param cls - the class's id
 * @param id - the tab's id, unique within the class
 * @param label - the tab's label
 * @param route - the route the tab shows
 * @returns the tab, with its concrete path and its link
 */
export function classTab(
  cls: string,
  id: string,
  label: string,
  route: ClassRoutePath,
): SectionTab {
  return { id, label, to: classPath(cls, route), link: classLink(cls, route) };
}
