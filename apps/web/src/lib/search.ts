/**
 * Parsers for typed search params. The router JSON-decodes each query value
 * before `validateSearch` sees it, so `?q=123` arrives as the number 123 and
 * `?season=5` as 5; these parsers accept that and drop anything unusable.
 */

/**
 * Reads a free-text search param.
 *
 * @param v - the decoded query value
 * @returns the text (numbers become their string form), or undefined when
 *   missing, empty or not text
 */
export function optionalText(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return typeof v === "string" && v !== "" ? v : undefined;
}

/**
 * Reads an integer search param.
 *
 * @param v - the decoded query value
 * @returns the integer (numeric strings are accepted), or undefined when
 *   missing or not an integer
 */
export function optionalInt(v: unknown): number | undefined {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) ? n : undefined;
}

/**
 * Applies a patch to a view's search params, dropping every param the
 * result leaves `undefined` or empty, so the URL never carries `?q=`.
 *
 * @param prev - the current search params
 * @param patch - the params to set; `undefined` or `""` removes one
 * @returns the new search params
 */
export function mergeSearch<S extends object>(prev: S, patch: Partial<S>): S {
  const merged = Object.entries({ ...prev, ...patch }).filter(
    ([, value]) => value !== undefined && value !== "",
  );
  return Object.fromEntries(merged) as S;
}

/**
 * Reads a search param restricted to a fixed set of values.
 *
 * @param v - the decoded query value
 * @param allowed - an object whose keys are the allowed values
 * @returns the value when it is one of `allowed`'s keys, else undefined
 */
export function optionalKey<K extends string>(
  v: unknown,
  allowed: Readonly<Record<K, unknown>>,
): K | undefined {
  return typeof v === "string" && Object.hasOwn(allowed, v) ? (v as K) : undefined;
}
