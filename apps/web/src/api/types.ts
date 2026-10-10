/**
 * Response row types, inferred from the server's routes through the typed
 * client, so they track the API without a hand-written copy. The
 * character's types are the exception: {@link AccountOverview} is the shape
 * the views read, which `account.ts` maps the response onto.
 *
 * @module
 */
import type { InferResponseType } from "hono/client";
import type { api } from "./client";

/** A research record: slug, question, status, dates, season label, lede, caveat and the classes it covers. */
export type ResearchRecord = InferResponseType<(typeof api.records)[":slug"]["$get"], 200>;

/** A source: id, site, url, titles, date, relevance, notes, the records it belongs to and its capture. */
export type Source = InferResponseType<typeof api.sources.$get, 200>[number];

/** One capture-ledger line of a loaded record: path, URL, time, tool, approximation and hash. */
export type Capture = InferResponseType<typeof api.captures.$get, 200>[number];

/** A glossary entry: the name a guide uses, shorthand, the client's English name and kind. */
export type GlossaryEntry = InferResponseType<typeof api.glossary.$get, 200>[number];

/** A build: its row, skill priorities, stigma slots, macro chains, sources and lifecycle. */
export type Build = InferResponseType<typeof api.builds.$get, 200>[number];

/** One skill priority of a {@link Build}: rank, target level, why and the skill. */
export type BuildSkill = Build["skills"][number];

/** One stigma slot of a {@link Build}: the slot's unlock level, why and the skill. */
export type BuildStigma = Build["stigmas"][number];

/** One macro chain of a {@link Build}: its key, delay, why and steps in the editor's order. */
export type Macro = Build["macros"][number];

/** A class skill as the game names it: kind, unlock level, cooldown and summary. */
export type Skill = BuildSkill["skill"];

/** A mechanics writeup with its confidence and topic. */
export type Mechanic = InferResponseType<typeof api.mechanics.$get, 200>[number];

/** A ranked takeaway. */
export type Takeaway = InferResponseType<typeof api.takeaways.$get, 200>[number];

/** A "for your character" recommendation. */
export type Recommendation = InferResponseType<typeof api.recommendations.$get, 200>[number];

/** `GET /api/account` as the server answers it. */
export type AccountResponse = InferResponseType<typeof api.account.$get, 200>;

/** A stigma as read in a snapshot: its slot, its name as read and the skill it resolved to. */
export interface AccountStigma {
  /** The slot's unlock level. */
  slotLevel: number;
  /** The stigma's name as read. */
  skillName: string;
  /** The skill id it resolved to, or `null` when no loaded skill has the name. */
  skillId: string | null;
}

/** One step of a macro chain as read, in the editor's order. */
export interface AccountMacroStep {
  /** 1 is the editor's first slot. */
  position: number;
  /** The skill's name as read. */
  skillName: string;
  /** The skill id it resolved to, or `null`. */
  skillId: string | null;
}

/** A macro chain as read from the client's macro editor. */
export interface AccountMacro {
  /** Its place in the editor's list. */
  position: number;
  /** Its name in the editor. */
  name: string;
  /** The key it is bound to. */
  key: string;
  /** Its steps, in the editor's order. */
  steps: AccountMacroStep[];
}

/** A character snapshot: its row, the skills read in it, its stigmas by slot and its macro chains. */
export type AccountSnapshot = Omit<
  NonNullable<AccountResponse["snapshot"]>,
  "stigmas" | "macros"
> & {
  stigmas: AccountStigma[];
  macros: AccountMacro[];
};

/** The character: the chosen snapshot, its roadmap, and every loaded snapshot. */
export type AccountOverview = Omit<AccountResponse, "snapshot"> & {
  snapshot: AccountSnapshot | null;
};

/** One skill as read in a snapshot: its name as read, the skill it resolved to, level and hotbar slot. */
export type AccountSkill = AccountSnapshot["skills"][number];

/** One roadmap item: rank, priority, area, action, why and refs. */
export type AccountItem = AccountOverview["roadmap"][number];
