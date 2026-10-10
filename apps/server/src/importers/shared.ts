/**
 * Rows several records can load: sources, glossary entries and skills
 * written as shared rows (the first record to load one keeps it), and the
 * warnings about glossary keys more than one entry claims.
 *
 * @module
 */
import type { GlossaryRow } from "@aion/schema";
import type { InsertOf } from "../registry";
import type { GlossaryInsert } from "../repos/glossary";
import type { SourceInsert } from "../repos/sources";
import { lookupKeys } from "../services/names";
import type { WriteContext } from "./steps";

/**
 * Lists every normalized glossary lookup key (see `lookupKeys`) that more
 * than one entry claims, and which entry's gloss the name resolver ends up
 * using for it (the last claimant in `kr` order).
 *
 * @param entries - the glossary rows about to be written
 * @returns one human-readable warning per contested key; `[]` if none
 */
export function glossaryWarnings(entries: readonly GlossaryInsert[]): string[] {
  const sorted = [...entries].sort((a, b) => (a.kr < b.kr ? -1 : a.kr > b.kr ? 1 : 0));
  const claims = new Map<string, GlossaryInsert[]>();
  for (const entry of sorted) {
    for (const key of lookupKeys(entry)) {
      const list = claims.get(key);
      if (list) list.push(entry);
      else claims.set(key, [entry]);
    }
  }
  const warnings: string[] = [];
  for (const [key, claimants] of claims) {
    if (claimants.length < 2) continue;
    const who = claimants.map((e) => `"${e.kr}" (${e.en ?? "no en"})`).join(", ");
    const winner = claimants[claimants.length - 1]!;
    warnings.push(`glossary key "${key}" is claimed by ${who}; it resolves to "${winner.kr}"`);
  }
  return warnings;
}

/**
 * Names the fields in which two versions of a shared row differ.
 *
 * @param kept - the row already in the database
 * @param incoming - the row this import would have written
 * @param fields - the fields to compare, by value
 * @returns the differing field names, in `fields` order
 */
function differences<T>(kept: T, incoming: T, fields: readonly (keyof T)[]): string[] {
  return fields
    .filter(
      (field) => JSON.stringify(kept[field] ?? null) !== JSON.stringify(incoming[field] ?? null),
    )
    .map(String);
}

/**
 * Writes a row several records can share, keyed by its natural id: inserts
 * it when absent, rewrites it when the record being written owns it, and
 * otherwise keeps the row already there (the first record to load it
 * wins), warning when this record's version differs.
 *
 * @param existing - the row already stored under the same id, if any
 * @param incoming - this record's version, without an owner
 * @param context - the write context: the record, and where warnings go
 * @param write - stores `incoming` owned by the record, as an insert or an
 *   overwrite
 * @param label - how a warning names the row, e.g. `source dc:1`
 * @param fields - the fields a warning compares
 */
export function writeShared<T extends { recordSlug?: string | null }>(
  existing: T | undefined,
  incoming: T,
  context: WriteContext,
  write: (row: T) => void,
  label: string,
  fields: readonly (keyof T)[],
): void {
  if (!existing || existing.recordSlug === context.record) {
    write({ ...incoming, recordSlug: context.record });
    return;
  }
  const changed = differences(existing, incoming, fields);
  if (changed.length === 0) return;
  context.warn(
    `${label} is already loaded by record ${existing.recordSlug ?? "(none)"}; keeping that row (this record's differs in ${changed.join(", ")})`,
  );
}

/** The source fields a shared-source warning compares. */
export const SOURCE_FIELDS = [
  "url",
  "title",
  "titleEn",
  "date",
  "relevance",
  "note",
  "summaryEn",
  "capturePath",
] as const satisfies readonly (keyof SourceInsert)[];

/** The glossary fields a shared-entry warning compares. */
export const GLOSSARY_FIELDS = [
  "shorthand",
  "en",
  "kind",
  "extra",
] as const satisfies readonly (keyof GlossaryInsert)[];

/** The skill fields a shared-skill warning compares. */
export const SKILL_FIELDS = [
  "class",
  "name",
  "nameKr",
  "kind",
  "unlockLevel",
  "cooldownSec",
  "summary",
] as const satisfies readonly (keyof InsertOf<"skills">)[];

/**
 * Lists the lookup keys of `record`'s glossary entries that another
 * record's entries also claim, once both are stored.
 *
 * @param entries - every stored glossary row
 * @param record - the record whose entries to check
 * @returns one warning per contested key and other entry
 */
export function crossRecordGlossaryWarnings(
  entries: readonly GlossaryRow[],
  record: string,
): string[] {
  const others = new Map<string, GlossaryRow[]>();
  for (const entry of entries) {
    if (entry.recordSlug === record) continue;
    for (const key of lookupKeys(entry)) others.set(key, [...(others.get(key) ?? []), entry]);
  }
  return entries
    .filter((entry) => entry.recordSlug === record)
    .flatMap((entry) =>
      lookupKeys(entry).flatMap((key) =>
        (others.get(key) ?? []).map(
          (other) =>
            `glossary key "${key}" of "${entry.kr}" (${entry.en ?? "no en"}) is also claimed by "${other.kr}" (${other.en ?? "no en"}) of record ${other.recordSlug ?? "(none)"}; each record's rows resolve it with their own record's entry`,
        ),
      ),
    );
}
