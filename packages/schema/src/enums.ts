/** The playable classes of Aion 2, as the global client names them. */
export const CLASS = [
  "gladiator",
  "templar",
  "assassin",
  "ranger",
  "sorcerer",
  "spiritmaster",
  "cleric",
  "chanter",
] as const;
/** One of {@link CLASS}. */
export type GameClass = (typeof CLASS)[number];

/** What a build is for. */
export const BUILD_PURPOSE = ["leveling", "pve", "pvp"] as const;
/** One of {@link BUILD_PURPOSE}. */
export type BuildPurpose = (typeof BUILD_PURPOSE)[number];

/** How a skill is used: pressed, always on, or slotted as a stigma. */
export const SKILL_KIND = ["active", "passive", "stigma"] as const;
/** One of {@link SKILL_KIND}. */
export type SkillKind = (typeof SKILL_KIND)[number];

/** How well a recommendation is backed: measured, posted by players, or read from skill data. */
export const CONFIDENCE = ["tested", "posted", "theory"] as const;
/** One of {@link CONFIDENCE}. */
export type Confidence = (typeof CONFIDENCE)[number];

/** Where a source lives: a web page or a YouTube video. */
export const SOURCE_SITE = ["web", "yt"] as const;
/** One of {@link SOURCE_SITE}. */
export type SourceSite = (typeof SOURCE_SITE)[number];

/** Lifecycle status of a research record. */
export const RECORD_STATUS = ["active", "done"] as const;
/** One of {@link RECORD_STATUS}. */
export type RecordStatus = (typeof RECORD_STATUS)[number];

/** Kind of entity a glossary entry defines: a class, a skill, a stat, an item, or a general term. */
export const GLOSSARY_KIND = ["class", "skill", "stat", "item", "term"] as const;
/** One of {@link GLOSSARY_KIND}. */
export type GlossaryKind = (typeof GLOSSARY_KIND)[number];

/**
 * What took a capture: a named tool (`agent-browser`, `curl`, `yt-dlp`,
 * `manual`), one of `pnpm capture`'s scrapers (`capture:<scraper>`), or
 * `unknown`, which only a backfill writes.
 */
export const CAPTURE_TOOL = [
  "agent-browser",
  "curl",
  "yt-dlp",
  "manual",
  "unknown",
  "capture:youtube",
  "capture:web",
] as const;
/** One of {@link CAPTURE_TOOL}. */
export type CaptureTool = (typeof CAPTURE_TOOL)[number];

/**
 * How a backfilled capture-ledger line knows its capture time: from the
 * capture's own `captured:` header line (`header`), from the post an image
 * belongs to (`post`), or only from the file's first commit (`git`). A line
 * written at capture time has none.
 */
export const CAPTURE_APPROX = ["header", "post", "git"] as const;
/** One of {@link CAPTURE_APPROX}. */
export type CaptureApprox = (typeof CAPTURE_APPROX)[number];

/**
 * Entities that carry citations; `citations.entity` takes one of these.
 * `obsolescence` cites why a build became obsolete: its entity id is the
 * row's `obsolescenceKey` (see `obsolete.ts`), not a row of its own.
 */
export const CITED_ENTITY = [
  "skill",
  "build",
  "macro",
  "mechanic",
  "rng_factor",
  "timeline_event",
  "takeaway",
  "recommendation",
  "obsolescence",
] as const;
/** One of {@link CITED_ENTITY}. */
export type CitedEntity = (typeof CITED_ENTITY)[number];

/**
 * When a roadmap item for the character is due: do it now, next, or later.
 * The account view groups and colours the items by it.
 */
export const ACCOUNT_PRIORITY = ["now", "next", "later"] as const;
/** One of {@link ACCOUNT_PRIORITY}. */
export type AccountPriority = (typeof ACCOUNT_PRIORITY)[number];
