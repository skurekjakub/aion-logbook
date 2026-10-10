import { z } from "zod";
import { BUILD_PURPOSE, CLASS, CONFIDENCE, SKILL_KIND } from "./enums";
import {
  glossaryInsert,
  mechanicInsert,
  recommendationInsert,
  rngFactorInsert,
  sourceId,
  sourceInsert,
  takeawayInsert,
  timelineEventInsert,
} from "./zod";

/** A non-empty list of source ids a submitted entity must cite. */
export const sourceIds = z.array(sourceId).min(1, "cite at least one source");

/**
 * The create input and the patch of a cited content type, from its table's
 * insert schema. The input drops the server-assigned `id` and requires the
 * `sources` the row cites; the patch makes every field optional, `sources`
 * included, and still rejects an empty `sources`.
 *
 * @typeParam Shape - the insert schema's fields, `id` among them
 * @typeParam Config - the insert schema's object config
 * @param insert - the table's insert schema
 * @returns `input` and `patch`
 */
function citedInputs<
  Shape extends z.core.$ZodShape & { id: z.core.$ZodType },
  Config extends z.core.$ZodObjectConfig,
>(insert: z.ZodObject<Shape, Config>) {
  // zod's `omit` checks the mask against the shape's keys, which a generic shape can't resolve.
  const idOnly = { id: true } as { id: true } & Record<Exclude<"id", keyof Shape>, never>;
  const fields = insert.omit(idOnly);
  return {
    input: fields.extend({ sources: sourceIds }),
    patch: fields.partial().extend({ sources: sourceIds.optional() }),
  };
}

/**
 * Input for creating a source. `site` is derived server-side from the id
 * prefix (`web:`/`yt:`), so it isn't accepted from the client.
 */
export const sourceInput = sourceInsert.omit({ site: true });
/** Output of {@link sourceInput}. */
export type SourceInput = z.output<typeof sourceInput>;

/** Patch for updating a source. `id` is immutable; every other field is optional. */
export const sourcePatch = sourceInput.omit({ id: true }).partial();
/** Output of {@link sourcePatch}. */
export type SourcePatch = z.output<typeof sourcePatch>;

/** Input for creating or replacing a glossary entry, keyed by `kr`. */
export const glossaryInput = glossaryInsert;
/** Output of {@link glossaryInput}. */
export type GlossaryInput = z.output<typeof glossaryInput>;

const mechanic = citedInputs(mechanicInsert);
/** Input for creating a mechanic writeup, with the sources that support it. */
export const mechanicInput = mechanic.input;
/** Output of {@link mechanicInput}. */
export type MechanicInput = z.output<typeof mechanicInput>;
/** Patch for updating a mechanic writeup. `sources`, if given, must be non-empty. */
export const mechanicPatch = mechanic.patch;
/** Output of {@link mechanicPatch}. */
export type MechanicPatch = z.output<typeof mechanicPatch>;

const rngFactor = citedInputs(rngFactorInsert);
/** Input for creating an RNG factor writeup, with the sources that support it. */
export const rngFactorInput = rngFactor.input;
/** Output of {@link rngFactorInput}. */
export type RngFactorInput = z.output<typeof rngFactorInput>;
/** Patch for updating an RNG factor writeup. `sources`, if given, must be non-empty. */
export const rngFactorPatch = rngFactor.patch;
/** Output of {@link rngFactorPatch}. */
export type RngFactorPatch = z.output<typeof rngFactorPatch>;

const timelineEvent = citedInputs(timelineEventInsert);
/** Input for creating a timeline event, with the sources that support it. */
export const timelineEventInput = timelineEvent.input;
/** Output of {@link timelineEventInput}. */
export type TimelineEventInput = z.output<typeof timelineEventInput>;
/** Patch for updating a timeline event. `sources`, if given, must be non-empty. */
export const timelineEventPatch = timelineEvent.patch;
/** Output of {@link timelineEventPatch}. */
export type TimelineEventPatch = z.output<typeof timelineEventPatch>;

const takeaway = citedInputs(takeawayInsert);
/** Input for creating a takeaway, with the sources that support it. */
export const takeawayInput = takeaway.input;
/** Output of {@link takeawayInput}. */
export type TakeawayInput = z.output<typeof takeawayInput>;
/** Patch for updating a takeaway. `sources`, if given, must be non-empty. */
export const takeawayPatch = takeaway.patch;
/** Output of {@link takeawayPatch}. */
export type TakeawayPatch = z.output<typeof takeawayPatch>;

const recommendation = citedInputs(recommendationInsert);
/** Input for creating a recommendation, with the sources that support it. */
export const recommendationInput = recommendation.input;
/** Output of {@link recommendationInput}. */
export type RecommendationInput = z.output<typeof recommendationInput>;
/** Patch for updating a recommendation. `sources`, if given, must be non-empty. */
export const recommendationPatch = recommendation.patch;
/** Output of {@link recommendationPatch}. */
export type RecommendationPatch = z.output<typeof recommendationPatch>;

/** The column values of an input without its citations. */
export type Values<I> = Omit<I, "sources">;

/** A lowercase, hyphen-separated id. */
export const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "expected a lowercase slug");

/** Input for a skill. */
export const skillInput = z.object({
  id: slug,
  class: z.enum(CLASS),
  name: z.string().min(1),
  nameKr: z.string().min(1).nullish(),
  kind: z.enum(SKILL_KIND),
  unlockLevel: z.number().int().min(1),
  cooldownSec: z.number().nonnegative().nullish(),
  summary: z.string().min(1).nullish(),
  sources: z.array(sourceId).default([]),
});
/**
 * Patch for a skill. `sources`, when left out, stays out, so a patch that
 * doesn't name the citations leaves them as they are.
 */
export const skillPatch = skillInput
  .omit({ id: true, sources: true })
  .partial()
  .extend({ sources: z.array(sourceId).optional() });

/** A step of a macro chain as curated: positions are assigned from the list order. */
const macroStepInput = z.object({ skillId: slug, note: z.string().min(1).nullish() });

/** Input for a macro chain; `steps` are in the editor's order, top first. */
export const macroInput = z
  .object({
    id: slug,
    name: z.string().min(1),
    key: z.string().min(1),
    delayMs: z.number().int().min(0),
    why: z.string().min(1),
    steps: z.array(macroStepInput),
  })
  .superRefine((m, ctx) => {
    if (m.steps.length === 0) {
      ctx.addIssue({ code: "custom", message: `macro ${m.id} has no steps`, path: ["steps"] });
    }
  })
  .transform((m) => ({ ...m, steps: m.steps.map((s, i) => ({ ...s, position: i + 1 })) }));
/** Output of {@link macroInput}. */
export type MacroInput = z.output<typeof macroInput>;
/** Patch for a macro chain's own fields. */
export const macroPatch = z
  .object({
    name: z.string().min(1),
    key: z.string().min(1),
    delayMs: z.number().int().min(0),
    why: z.string().min(1),
  })
  .partial();

/**
 * Input for a build with its skill priorities, stigmas and macro chains.
 * Rejects a repeated skill rank, a stigma slot filled twice, and a macro id
 * used twice, each with a message naming the build.
 */
export const buildInput = z
  .object({
    id: slug,
    class: z.enum(CLASS),
    purpose: z.enum(BUILD_PURPOSE),
    title: z.string().min(1),
    why: z.string().min(1),
    confidence: z.enum(CONFIDENCE),
    skills: z.array(
      z.object({
        skillId: slug,
        rank: z.number().int().min(1),
        targetLevel: z.number().int().min(1),
        why: z.string().min(1),
      }),
    ),
    stigmas: z.array(
      z.object({ slotLevel: z.number().int().min(1), skillId: slug, why: z.string().min(1) }),
    ),
    macros: z.array(macroInput),
    sources: z.array(sourceId).default([]),
  })
  .superRefine((b, ctx) => {
    const ranks = b.skills.map((s) => s.rank);
    if (new Set(ranks).size !== ranks.length) {
      ctx.addIssue({
        code: "custom",
        message: `build ${b.id} repeats a skill rank`,
        path: ["skills"],
      });
    }
    const slots = b.stigmas.map((s) => s.slotLevel);
    if (new Set(slots).size !== slots.length) {
      ctx.addIssue({
        code: "custom",
        message: `build ${b.id} fills a stigma slot twice`,
        path: ["stigmas"],
      });
    }
    const seen = new Set<string>();
    for (const m of b.macros) {
      if (seen.has(m.id)) {
        ctx.addIssue({
          code: "custom",
          message: `build ${b.id} repeats macro id ${m.id}`,
          path: ["macros"],
        });
      }
      seen.add(m.id);
    }
  });
/** Output of {@link buildInput}. */
export type BuildInput = z.output<typeof buildInput>;
/** Patch for a build's own fields. */
export const buildPatch = z
  .object({ title: z.string().min(1), why: z.string().min(1), confidence: z.enum(CONFIDENCE) })
  .partial();
