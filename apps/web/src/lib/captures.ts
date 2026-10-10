/**
 * Capture-ledger display helpers: capture times, approximate-time notes,
 * and the evidence folder a capture sits in.
 */

/** How a backfilled capture time was found, when it isn't the moment of capture. */
export type CaptureApprox = "header" | "post" | "git";

/** Why each kind of approximate time is approximate, for a marker's tooltip. */
export const APPROX_NOTES: Readonly<Record<CaptureApprox, string>> = {
  header: "Approximate: from the capture's own header, backfilled",
  post: "Approximate: the capture time of the post the image belongs to",
  git: "Approximate: when the file was first committed",
};

/**
 * Formats a ledger time as the capturing machine's wall clock.
 *
 * @param capturedAt - ISO 8601 with an offset, e.g. `2026-09-27T10:39:53+02:00`
 * @returns e.g. `2026-09-27 10:39 +02:00`; the input unchanged if it isn't in that form
 */
export function captureTime(capturedAt: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.exec(
    capturedAt,
  );
  if (!match) return capturedAt;
  const [, date, time, zone] = match;
  return `${date} ${time} ${zone === "Z" ? "UTC" : zone}`;
}

/**
 * Splits a capture's path into its folder and its file name, so a list can
 * lead with the name.
 *
 * @param path - a record-relative path, e.g. `evidence/03-dc-posts/img/1-1.jpg`
 * @returns e.g. `{ dir: "evidence/03-dc-posts/img/", name: "1-1.jpg" }`; `dir` is
 *   empty for a bare name
 */
export function splitPath(path: string): { dir: string; name: string } {
  const at = path.lastIndexOf("/");
  return { dir: path.slice(0, at + 1), name: path.slice(at + 1) };
}

/**
 * Names the evidence folder a capture sits in: its path's first folder under `evidence/`.
 *
 * @param path - a record-relative path, e.g. `evidence/03-dc-posts/img/1-1.jpg`
 * @returns e.g. `evidence/03-dc-posts`, or `evidence` for a file at its top
 */
export function evidenceFolder(path: string): string {
  const parts = path.split("/");
  return parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0]!;
}
