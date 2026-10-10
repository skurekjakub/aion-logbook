import type { GlossaryRow } from "@aion/schema";

/** A name paired with the glossary's resolution of it. */
export interface NameRef {
  /** The name exactly as it appeared in the source data. */
  kr: string;
  /** The matched glossary entry's English gloss, or `null` if unresolved. */
  en: string | null;
}

/**
 * The fields of a glossary entry that it can be looked up by, and the
 * record whose glossary it came from.
 */
export type LookupEntry = Pick<GlossaryRow, "kr"> & {
  shorthand?: readonly string[];
  en?: string | null;
  recordSlug?: string | null;
};

/**
 * Resolves a name, as written, to a {@link NameRef}.
 *
 * @param name - the name
 * @param records - the research records whose glossary entries win a key
 *   that several entries claim; omitted or empty, no record is preferred
 */
export type NameResolver = (name: string, records?: readonly string[]) => NameRef;

/**
 * Collapses case and whitespace differences for glossary lookup keys: the
 * key {@link createNameResolver} indexes and looks up a name under.
 *
 * @param name - a name as written
 * @returns the trimmed, lower-cased name with whitespace runs collapsed to
 *   one space
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Lists the normalized keys a glossary entry is found under: its Korean
 * form, each shorthand, and its English gloss when it has one.
 *
 * @param entry - the entry
 * @returns the distinct keys, in that order
 */
export function lookupKeys(entry: LookupEntry): string[] {
  const names = [entry.kr, ...(entry.shorthand ?? []), ...(entry.en ? [entry.en] : [])];
  return [...new Set(names.map(normalizeName))];
}

/**
 * Builds a resolver from a glossary snapshot: each entry is indexed under
 * its {@link lookupKeys}. When several entries share a key, the last one in
 * `entries` from one of the resolver's `records` wins; failing that, the
 * last one in `entries`.
 *
 * @param entries - the glossary rows to index
 * @returns a {@link NameResolver}. The returned `kr` is always `name`
 *   unchanged; `en` is the winning entry's gloss (itself possibly `null`),
 *   or `null` if `name` matches no entry under any of its keys
 */
export function createNameResolver(entries: readonly LookupEntry[]): NameResolver {
  const byKey = new Map<string, LookupEntry[]>();
  for (const entry of entries) {
    for (const key of lookupKeys(entry)) {
      const claimants = byKey.get(key);
      if (claimants) claimants.push(entry);
      else byKey.set(key, [entry]);
    }
  }
  return (name, records = []) => {
    const claimants = byKey.get(normalizeName(name)) ?? [];
    const preferred = claimants.filter(
      (entry) => entry.recordSlug != null && records.includes(entry.recordSlug),
    );
    const winner = (preferred.length > 0 ? preferred : claimants).at(-1);
    return { kr: name, en: winner?.en ?? null };
  };
}
