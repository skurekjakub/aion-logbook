/**
 * The app's navigation and class config: one section per Aion 2 class
 * (its tabs, view copy and API scope) and the shared sections outside any
 * class. The root route renders the header, the navigation and the class
 * tabs from this module and the loaded research records alone.
 *
 * A class appears in the navigation only once a research record covers it
 * ({@link classSectionsWithContent}); the record that does fills its
 * header.
 *
 * @module
 */
import type { GameClass } from "../../api/queries";
import { classLink, classTab } from "./links";
import { HOME, SHARED_SECTIONS } from "./shared";
import type { ClassSection, ClassView, Section, SectionTab, ViewCopy } from "./types";

export type * from "./types";
export { classLink, classPath, classTab } from "./links";
export { APP_TITLE, HOME, SHARED_SECTIONS } from "./shared";

/** Each class's label, in the client's class-select order. */
export const CLASS_LABELS: Readonly<Record<GameClass, string>> = {
  gladiator: "Gladiator",
  templar: "Templar",
  assassin: "Assassin",
  ranger: "Ranger",
  sorcerer: "Sorcerer",
  spiritmaster: "Spiritmaster",
  cleric: "Cleric",
  chanter: "Chanter",
};

/** The mechanics topic that holds the built-in macro editor's rules. */
export const MACROS_TOPIC = "macros";

/** Every class's view copy; the class's name goes in the header, not here. */
const COPY: Readonly<Record<ClassView, ViewCopy>> = {
  overview: {
    title: "Builds",
    lede: ["One card per build: purpose, confidence, why.", "Open a page to apply it."],
  },
  skills: {
    title: "Skill levels",
    lede: ["Level in rank order, up to each target.", "A badge flags a skill below its target."],
  },
  stigmas: {
    title: "Stigmas",
    lede: ["One stigma per slot, by unlock level.", "A lock marks a slot above your level."],
  },
  macros: {
    title: "Macro chains",
    lede: ["Built-in macro editor: key, delay, steps top to bottom."],
    topic: MACROS_TOPIC,
  },
};

/**
 * Builds a class's section, before any record covers it.
 *
 * @param cls - the class
 * @returns the section, with no record
 */
function classSection(cls: GameClass): ClassSection {
  const tabs: SectionTab[] = [
    classTab(cls, "overview", "Builds", "/$class"),
    classTab(cls, "skills", "Skills", "/$class/skills"),
    classTab(cls, "stigmas", "Stigmas", "/$class/stigmas"),
    classTab(cls, "macros", "Macros", "/$class/macros"),
  ];
  return {
    id: cls,
    kind: "class",
    cls,
    label: CLASS_LABELS[cls],
    title: CLASS_LABELS[cls],
    to: `/${cls}`,
    link: classLink(cls),
    recordSlug: null,
    lede: null,
    stamp: ["updated", "sources"],
    tabs,
    copy: COPY,
  };
}

/** Every class's section, in {@link CLASS_LABELS} order, none with a record yet. */
export const CLASS_SECTIONS: readonly ClassSection[] = (
  Object.keys(CLASS_LABELS) as GameClass[]
).map(classSection);

/**
 * The class sections that have content: one per class some record covers,
 * its `recordSlug` the last such record by slug (the newest research).
 *
 * @param records - the loaded research records, each with the classes it covers
 * @returns the sections, in {@link CLASS_SECTIONS} order
 */
export function classSectionsWithContent(
  records: ReadonlyArray<{ slug: string; classes: readonly string[] }>,
): ClassSection[] {
  const sorted = [...records].sort((a, b) => a.slug.localeCompare(b.slug));
  return CLASS_SECTIONS.flatMap((section) => {
    const record = sorted.findLast((r) => r.classes.includes(section.cls));
    return record ? [{ ...section, recordSlug: record.slug }] : [];
  });
}

/**
 * Every top-level section, in navigation order: home, the classes with
 * content, then the shared pages.
 *
 * @param classes - the class sections with content
 * @returns the sections
 */
export function allSections(classes: readonly ClassSection[]): Section[] {
  return [HOME, ...classes, ...SHARED_SECTIONS];
}

/**
 * Reports whether `pathname` is `to` or lies under it, in any case, as the
 * router matches a static segment.
 *
 * @param pathname - the current path
 * @param to - a route path, lower case
 * @returns `true` if `pathname` is `to` or inside it
 */
function isUnder(pathname: string, to: string): boolean {
  const path = pathname.toLowerCase();
  return path === to || path.startsWith(`${to}/`);
}

/**
 * The section a path belongs to, by its first segment.
 *
 * @param sections - the sections to look in
 * @param pathname - a location pathname, e.g. `/gladiator/skills`
 * @returns the section, or undefined for an unknown path
 */
export function sectionForPath(
  sections: readonly Section[],
  pathname: string,
): Section | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return sections.find((s) => isUnder(path, s.to));
}

/**
 * The sub-tab a path selects: the tab whose path is the longest prefix of it.
 *
 * @param tabs - a section's tabs
 * @param pathname - a location pathname; a trailing slash is ignored
 * @returns the selected tab, or undefined when none matches
 */
export function activeTab(tabs: readonly SectionTab[], pathname: string): SectionTab | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return tabs
    .filter((t) => isUnder(path, t.to))
    .reduce<SectionTab | undefined>(
      (best, t) => (!best || t.to.length > best.to.length ? t : best),
      undefined,
    );
}
