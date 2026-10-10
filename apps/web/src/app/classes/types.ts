/**
 * The shapes of the app's sections: a class's section with its view copy,
 * and a shared section outside any class.
 *
 * @module
 */
import type { GameClass } from "../../api/queries";
import type { FileRoutesByTo } from "../../routeTree.gen";

/** A route path of the generated route tree, e.g. `/$class/skills` or `/sources`. */
export type RoutePath = keyof FileRoutesByTo;

/** A route path under a class: `/$class` itself or one of its pages. */
export type ClassRoutePath = Extract<RoutePath, "/$class" | `/$class/${string}`>;

/** A route path outside any class that takes no params. */
export type SharedRoutePath = Exclude<RoutePath, `${string}$${string}`>;

/** A concrete app path, as the address bar shows it, e.g. `/gladiator/skills`. */
export type AppPath = `/${string}`;

/**
 * Where a link goes, checked against the generated route tree: a page
 * under a class with the class's id as its `$class` param, or a shared page.
 */
export type LinkTarget =
  { to: ClassRoutePath; params: { class: string } } | { to: SharedRoutePath; params?: undefined };

/** A figure the header's stamp can show. */
export type StampStat = "updated" | "sources";

/** A sub-tab within a section. */
export interface SectionTab {
  /** Unique within the section. */
  id: string;
  label: string;
  /** The tab's concrete path. */
  to: AppPath;
  /** The tab's route, for a link. */
  link: LinkTarget;
}

/**
 * A view's heading and the lede under it. Copy is plain UI text: a research
 * claim the view needs to state goes in a mechanics row, named by `topic`.
 */
export interface ViewCopy {
  title: string;
  /**
   * What the view shows: 1–3 bullets of about 12 words or fewer (AGENTS.md:
   * UI, scannable, not prose). A single string is a one-line explainer.
   */
  lede: string | readonly string[];
  /**
   * The mechanics topic whose cited rows the view shows under its lede,
   * when it has one: rows filed under it, or under it among their `alsoTopics`.
   */
  topic?: string;
}

/** The views every class section has, by name. */
export type ClassView = "overview" | "skills" | "stigmas" | "macros";

/** What a top-level section has, whether a class or a shared page. */
interface SectionBase {
  /** The first path segment; `home` for `/`. */
  id: string;
  /** Navigation label. */
  label: string;
  /** The header's `<h1>`. */
  title: string;
  /** The section's concrete path. */
  to: AppPath;
  /** The section's landing route, for a link. */
  link: LinkTarget;
  /** The research record whose lede and update date fill the header; null for none. */
  recordSlug: string | null;
  /** Header lede when there's no record, or the record has none. */
  lede: string | null;
  /** Figures shown in the header stamp, in order. */
  stamp: readonly StampStat[];
  /** Sub-tabs, in order; the first is the section's landing page. Empty for none. */
  tabs: readonly SectionTab[];
}

/** A class's section: its build pages, filled from the research record that covers it. */
export interface ClassSection extends SectionBase {
  kind: "class";
  /** The class, as the API names it; its lists send it as `?class=`. */
  cls: GameClass;
  /** Each view's heading and lede. */
  copy: Readonly<Record<ClassView, ViewCopy>>;
}

/** A section outside any class. */
export interface SharedSection extends SectionBase {
  kind: "shared";
}

/** A top-level section: a class or a shared page. */
export type Section = ClassSection | SharedSection;
