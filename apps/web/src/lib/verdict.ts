/**
 * Pure helpers that pull the verdict out of curated text, so a row can show
 * it first: a finding's lead sentence.
 *
 * @module
 */

/** Words that end in a full stop without ending a sentence ("Lv.1", "e.g. haste"). */
const ABBREVIATIONS = new Set(["e.g", "i.e", "vs", "lv", "approx", "etc", "cf", "ca"]);

/**
 * Splits a text into its first sentence and the rest. A sentence ends at a
 * `.`, `!` or `?` followed by a space and then anything but a lower-case
 * letter, unless the word before the stop is a known abbreviation.
 *
 * @param text - the text to split
 * @returns the first sentence, and the rest (empty when the text is one sentence)
 */
export function leadSentence(text: string): { lead: string; rest: string } {
  const t = text.trim();
  const stop = /[.!?](?=\s+[^\sa-z])/g;
  for (let m = stop.exec(t); m; m = stop.exec(t)) {
    const word = /([\p{L}.]+)$/u.exec(t.slice(0, m.index))?.[1]?.toLowerCase() ?? "";
    if (ABBREVIATIONS.has(word)) continue;
    return { lead: t.slice(0, m.index + 1), rest: t.slice(m.index + 1).trim() };
  }
  return { lead: t, rest: "" };
}
