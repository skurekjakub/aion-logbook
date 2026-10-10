import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod";
import { captureTool, evidencePath, isoDateTime, sha256Hex } from "./ledger";
import * as t from "./tables";

/**
 * Reports whether a `YYYY-MM-DD` string names a day on the calendar.
 *
 * @param value - the string, already in `YYYY-MM-DD` shape
 * @returns `true` when the month and day exist in that year (so `2024-02-29`
 *   is one and `2026-02-30` isn't)
 */
function onCalendar(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * ISO calendar date, `YYYY-MM-DD`, of a day that exists. Rejects anything
 * else, including a full timestamp and a day past the month's end.
 */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
  .refine((value) => !/^\d{4}-\d{2}-\d{2}$/.test(value) || onCalendar(value), {
    message: "not a date on the calendar",
  });

/** A citable source id: `<site>:<key>`, e.g. `yt:dQw4w9WgXcQ` or `web:eloboost24-gladiator`. */
export const sourceId = z.string().regex(/^(web|yt):.+$/, "expected <site>:<key>");

/** A list of non-empty strings, used for json string-array columns. */
export const nameList = z.array(z.string().min(1));

/**
 * Insert schema for `sources`. `id` must be `<site>:<key>`; `date`, when
 * present, must be `YYYY-MM-DD`; `relevance`, when present, is an integer
 * 0-3.
 */
export const sourceInsert = createInsertSchema(t.sources, {
  id: () => sourceId,
  url: (s) => s.min(1),
  date: () => isoDate.nullish(),
  relevance: (s) => s.int().min(0).max(3).nullish(),
});
/** Select schema for `sources`, mirroring the stored row shape. */
export const sourceSelect = createSelectSchema(t.sources);
/** A row selected from `sources`. */
export type SourceRow = typeof t.sources.$inferSelect;

/** Insert schema for `research_records`. */
export const researchRecordInsert = createInsertSchema(t.researchRecords);
/** Select schema for `research_records`, mirroring the stored row shape. */
export const researchRecordSelect = createSelectSchema(t.researchRecords);
/** A row selected from `research_records`. */
export type ResearchRecordRow = typeof t.researchRecords.$inferSelect;

/** Insert schema for `record_classes`. */
export const recordClassInsert = createInsertSchema(t.recordClasses);
/** Select schema for `record_classes`, mirroring the stored row shape. */
export const recordClassSelect = createSelectSchema(t.recordClasses);
/** A row selected from `record_classes`. */
export type RecordClassRow = typeof t.recordClasses.$inferSelect;

/**
 * Insert schema for `glossary`. `kr` must be non-empty; `shorthand` and
 * `extra` are optional on insert (both have a runtime default).
 */
export const glossaryInsert = createInsertSchema(t.glossary, {
  kr: (s) => s.min(1),
  shorthand: () => nameList.optional(),
  extra: () => z.record(z.string(), z.unknown()).optional(),
});
/** Select schema for `glossary`, with `shorthand`/`extra` typed precisely. */
export const glossarySelect = createSelectSchema(t.glossary, {
  shorthand: () => nameList,
  extra: () => z.record(z.string(), z.unknown()),
});
/** A row selected from `glossary`. */
export type GlossaryRow = typeof t.glossary.$inferSelect;

/** Insert schema for `mechanics`. `alsoTopics`, when given, is a list of non-empty topics. */
export const mechanicInsert = createInsertSchema(t.mechanics, {
  alsoTopics: () => nameList.optional(),
});
/** Select schema for `mechanics`, with `alsoTopics` typed precisely. */
export const mechanicSelect = createSelectSchema(t.mechanics, { alsoTopics: () => nameList });
/** A row selected from `mechanics`. */
export type MechanicRow = typeof t.mechanics.$inferSelect;

/** Insert schema for `rng_factors`. */
export const rngFactorInsert = createInsertSchema(t.rngFactors);
/** Select schema for `rng_factors`, mirroring the stored row shape. */
export const rngFactorSelect = createSelectSchema(t.rngFactors);
/** A row selected from `rng_factors`. */
export type RngFactorRow = typeof t.rngFactors.$inferSelect;

/** Insert schema for `timeline`. `date` must be `YYYY-MM-DD`. */
export const timelineEventInsert = createInsertSchema(t.timeline, {
  date: () => isoDate,
});
/** Select schema for `timeline`, mirroring the stored row shape. */
export const timelineEventSelect = createSelectSchema(t.timeline);
/** A row selected from `timeline`. */
export type TimelineEventRow = typeof t.timeline.$inferSelect;

/** Insert schema for `takeaways`. */
export const takeawayInsert = createInsertSchema(t.takeaways);
/** Select schema for `takeaways`, mirroring the stored row shape. */
export const takeawaySelect = createSelectSchema(t.takeaways);
/** A row selected from `takeaways`. */
export type TakeawayRow = typeof t.takeaways.$inferSelect;

/** Insert schema for `recommendations`. `changes` must have at least one entry. */
export const recommendationInsert = createInsertSchema(t.recommendations, {
  changes: () => nameList.min(1),
});
/** Select schema for `recommendations`, with `changes` typed precisely. */
export const recommendationSelect = createSelectSchema(t.recommendations, {
  changes: () => nameList.min(1),
});
/** A row selected from `recommendations`. */
export type RecommendationRow = typeof t.recommendations.$inferSelect;

/** Insert schema for `citations`. */
export const citationInsert = createInsertSchema(t.citations);
/** Select schema for `citations`, mirroring the stored row shape. */
export const citationSelect = createSelectSchema(t.citations);
/** A row selected from `citations`. */
export type CitationRow = typeof t.citations.$inferSelect;

/** A row selected from `fact_claims`. */
export type FactClaimRow = typeof t.factClaims.$inferSelect;

/**
 * Insert schema for `captures`. `path` is record-relative under
 * `evidence/`; `capturedAt` is ISO 8601 with an offset; `tool` is a
 * {@link captureTool}; `sha256` is a lowercase hex digest.
 */
export const captureInsert = createInsertSchema(t.captures, {
  recordSlug: (s) => s.min(1),
  path: () => evidencePath,
  url: (s) => s.min(1).nullish(),
  capturedAt: () => isoDateTime,
  tool: () => captureTool,
  sha256: () => sha256Hex,
});
/** Select schema for `captures`, mirroring the stored row shape. */
export const captureSelect = createSelectSchema(t.captures);
/** A row selected from `captures`. */
export type CaptureRow = typeof t.captures.$inferSelect;
