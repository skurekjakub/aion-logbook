import { z } from "zod";

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
