/**
 * Pure helpers that pull the verdict out of curated text, so a row can show
 * it first: a finding's lead sentence, and whether a recommendation says
 * what to take or what to avoid.
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

/** Whether a recommendation says to take something or to stay away from it. */
export type Stance = "recommended" | "avoid";

/** A recommendation that opens with one of these words says what to avoid. */
const AVOID = /^(?:no|not|never|avoid|don't|do not|skip|without)\b/i;

/**
 * Reads a recommendation's stance from its wording: one that opens with a
 * negation ("No move speed, accuracy or focus", "Avoid crit resist") says
 * what to avoid; anything else says what to take.
 *
 * @param text - the recommendation, e.g. a gear substat line or rune lines
 * @returns `avoid` for a negated recommendation, else `recommended`
 */
export function stance(text: string): Stance {
  return AVOID.test(text.trim()) ? "avoid" : "recommended";
}
