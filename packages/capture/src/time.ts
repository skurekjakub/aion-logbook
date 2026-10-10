/**
 * Clock formatting for captures, in the capturing machine's local time,
 * and the reading of a capture header's `- captured:` stamp.
 *
 * @module
 */

/**
 * Gives the UTC offset, in minutes east of UTC, in force at an instant.
 *
 * @param at - the instant
 * @returns the offset, e.g. `120` for CEST
 */
export type OffsetAt = (at: Date) => number;

/**
 * The machine's local UTC offset at an instant.
 *
 * @param at - the instant
 * @returns minutes east of UTC
 */
export const localOffset: OffsetAt = (at) => -at.getTimezoneOffset();

/**
 * Pads a number to two digits.
 *
 * @param n - a non-negative integer
 * @returns it with a leading zero below 10
 */
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Splits an instant into its wall-clock fields at a UTC offset.
 *
 * @param at - the instant
 * @param offset - minutes east of UTC
 * @returns the date as `YYYY-MM-DD`, the time as `HH:MM:SS`, and the
 *   offset's sign, hours and minutes
 */
function wallClock(at: Date, offset: number) {
  const shifted = new Date(at.getTime() + offset * 60_000);
  const date = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
  const time = `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return { date, time, sign, hh: pad(Math.floor(abs / 60)), mm: pad(abs % 60) };
}

/**
 * Formats an instant as a ledger `captured_at`: ISO 8601 with a `±HH:MM` offset.
 *
 * @param at - the instant
 * @param offsetAt - the UTC offset to show it at; defaults to the machine's
 * @returns e.g. `2026-09-27T16:45:36+02:00`
 */
export function isoLocal(at: Date, offsetAt: OffsetAt = localOffset): string {
  const { date, time, sign, hh, mm } = wallClock(at, offsetAt(at));
  return `${date}T${time}${sign}${hh}:${mm}`;
}

/**
 * Parses a capture header's `- captured:` value into a ledger `captured_at`.
 *
 * @param stamp - `%Y-%m-%dT%H:%M:%S%z`, e.g. `2026-09-27T16:45:36+0200`, or
 *   already ISO with `+02:00` or `Z`
 * @returns the same instant with a `±HH:MM` offset, or `null` if `stamp`
 *   isn't in either form
 */
export function isoFromHeader(stamp: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(Z|([+-])(\d{2}):?(\d{2}))$/.exec(stamp);
  if (!match) return null;
  const [, local, zone, sign, hh, mm] = match;
  return zone === "Z" ? `${local}+00:00` : `${local}${sign}${hh}:${mm}`;
}
