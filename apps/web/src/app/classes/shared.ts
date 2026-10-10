/**
 * The sections outside any class: the character's home page, and the
 * pages every record feeds.
 *
 * @module
 */
import type { SharedSection } from "./types";

/** The app's name, the shared sections' heading. */
export const APP_TITLE = "Aion Logbook";

/** The character card and what to do next, at `/`. */
export const HOME: SharedSection = {
  id: "home",
  kind: "shared",
  label: "Home",
  title: APP_TITLE,
  to: "/",
  link: { to: "/" },
  recordSlug: null,
  lede: null,
  stamp: [],
  tabs: [],
};

/** The sections after the classes, in navigation order. */
export const SHARED_SECTIONS: readonly SharedSection[] = [
  {
    id: "account",
    kind: "shared",
    label: "Character",
    title: APP_TITLE,
    to: "/account",
    link: { to: "/account" },
    recordSlug: null,
    lede: null,
    stamp: [],
    tabs: [],
  },
  {
    id: "research",
    kind: "shared",
    label: "Research",
    title: APP_TITLE,
    to: "/research",
    link: { to: "/research" },
    recordSlug: null,
    lede: null,
    stamp: [],
    tabs: [],
  },
  {
    id: "sources",
    kind: "shared",
    label: "Sources",
    title: APP_TITLE,
    to: "/sources",
    link: { to: "/sources" },
    recordSlug: null,
    lede: null,
    stamp: ["sources"],
    tabs: [],
  },
  {
    id: "glossary",
    kind: "shared",
    label: "Glossary",
    title: APP_TITLE,
    to: "/glossary",
    link: { to: "/glossary" },
    recordSlug: null,
    lede: null,
    stamp: [],
    tabs: [],
  },
];
