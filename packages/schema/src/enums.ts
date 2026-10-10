/**
 * What took a capture: a named tool (`agent-browser`, `curl`, `yt-dlp`,
 * `manual`), one of `pnpm capture`'s scrapers (`capture:<scraper>`), or
 * `unknown`, which only a backfill writes.
 */
export const CAPTURE_TOOL = [
  "agent-browser",
  "curl",
  "yt-dlp",
  "manual",
  "unknown",
  "capture:youtube",
  "capture:web",
] as const;
export type CaptureTool = (typeof CAPTURE_TOOL)[number];

/**
 * How a backfilled capture-ledger line knows its capture time: from the
 * capture's own `captured:` header line (`header`), from the post an image
 * belongs to (`post`), or only from the file's first commit (`git`). A line
 * written at capture time has none.
 */
export const CAPTURE_APPROX = ["header", "post", "git"] as const;
export type CaptureApprox = (typeof CAPTURE_APPROX)[number];
