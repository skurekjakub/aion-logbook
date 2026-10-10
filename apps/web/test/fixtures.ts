/**
 * API bodies the view tests answer with: a gladiator record and its
 * builds, the sources they cite, and a gladiator character snapshot.
 *
 * @module
 */
import type { AccountOverview, Build, ResearchRecord, Skill, Source } from "../src/api/types";

/** The research record that gives the gladiator section its content. */
export const RECORD = {
  slug: "900-fixture",
  question: "Which skills does a gladiator level first?",
  status: "active",
  startedAt: "2026-10-01",
  updatedAt: "2026-10-02",
  seasonLabel: null,
  lede: "Level the opener first; slot Wrath Wave at 22.",
  caveat: null,
  classes: ["gladiator"],
} satisfies ResearchRecord;

/** The sources the fixtures cite. */
export const SOURCES = [
  {
    id: "web:fixture-guide",
    site: "web",
    url: "https://example.test/gladiator-guide",
    title: "Gladiator leveling guide",
    titleEn: null,
    date: "2026-09-30",
    relevance: 3,
    note: null,
    summaryEn: null,
    capturePath: null,
    recordSlug: "900-fixture",
    records: ["900-fixture"],
    capture: null,
  },
] satisfies Source[];

/**
 * A gladiator skill row.
 *
 * @param id - the slug after `gladiator-`
 * @param name - the skill's name
 * @param unlockLevel - the level that grants it
 * @returns the row
 */
function skill(id: string, name: string, unlockLevel: number): Skill {
  return {
    id: `gladiator-${id}`,
    class: "gladiator",
    name,
    nameKr: null,
    kind: "active",
    unlockLevel,
    cooldownSec: null,
    summary: null,
    recordSlug: "900-fixture",
  };
}

/** The skills the leveling build names. */
export const SKILLS = {
  ruinous: skill("ruinous-blow", "Ruinous Blow", 10),
  wrath: skill("wrath-wave", "Wrath Wave", 22),
  sever: skill("sever", "Sever", 4),
};

/** The gladiator leveling build: two skill priorities, a stigma and a macro chain. */
export const LEVELING = {
  id: "gladiator-leveling",
  class: "gladiator",
  purpose: "leveling",
  title: "Leveling",
  why: "Fast clears with one opener.",
  confidence: "posted",
  position: 1,
  recordSlug: "900-fixture",
  obsoleteSince: null,
  obsoleteReason: null,
  sources: ["web:fixture-guide"],
  obsoleteSources: [],
  skills: [
    { rank: 2, targetLevel: 5, why: "Bleed filler.", skill: SKILLS.sever },
    { rank: 1, targetLevel: 10, why: "Opener.", skill: SKILLS.ruinous },
  ],
  stigmas: [{ slotLevel: 22, why: "Area pull.", skill: SKILLS.wrath }],
  macros: [
    {
      id: "gladiator-leveling-main",
      buildId: "gladiator-leveling",
      position: 1,
      name: "Main",
      key: "R",
      delayMs: 100,
      why: "One key for the opener.",
      steps: [{ position: 1, note: null, skill: SKILLS.ruinous }],
    },
  ],
} satisfies Build;

/**
 * A gladiator character at level 34, Ruinous Blow read at 8 and Sever at 5:
 * Wrath Wave slotted at 22 and the 27 slot empty, a chain bound to R, and
 * an unbound chain whose step matched no skill.
 */
export const ACCOUNT = {
  snapshots: [{ id: "2026-10-07", capturedAt: "2026-10-07T21:30:00+02:00", level: 34 }],
  snapshot: {
    id: "2026-10-07",
    capturedAt: "2026-10-07T21:30:00+02:00",
    character: "Fixture",
    class: "gladiator",
    level: 34,
    gearScore: 1520,
    server: "Siel",
    unread: ["the gear score tooltip"],
    skills: [
      { name: "Ruinous Blow", skillId: SKILLS.ruinous.id, level: 8, slot: "1" },
      { name: "Sever", skillId: SKILLS.sever.id, level: 5, slot: "2" },
      { name: "Unknown Strike", skillId: null, level: 2, slot: null },
    ],
    stigmas: [
      { slotLevel: 22, name: "Wrath Wave", skillId: SKILLS.wrath.id },
      { slotLevel: 27, name: null, skillId: null },
    ],
    macros: [
      {
        position: 1,
        name: "Opener",
        key: "R",
        steps: [
          { position: 2, name: "Sever", skillId: SKILLS.sever.id },
          { position: 1, name: "Ruinous Blow", skillId: SKILLS.ruinous.id },
        ],
      },
      {
        position: 2,
        name: "Pull",
        key: null,
        steps: [{ position: 1, name: "Mystery Pull", skillId: null }],
      },
    ],
  },
  roadmap: [
    {
      id: 1,
      rank: 1,
      priority: "now",
      area: "skills",
      action: "Level Ruinous Blow to 10",
      why: "The build's opener.",
      refs: [{ record: "900-fixture", id: "gladiator-leveling" }],
    },
    {
      id: 2,
      rank: 2,
      priority: "later",
      area: "stigmas",
      action: "Slot a stigma at 27",
      why: "The slot is empty.",
      refs: [],
    },
  ],
} satisfies AccountOverview;

/** The account answer when no snapshot is loaded. */
export const NO_ACCOUNT = { snapshots: [], snapshot: null, roadmap: [] } satisfies AccountOverview;
