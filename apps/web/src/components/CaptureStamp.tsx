import type { CaptureApprox } from "../lib/captures";
import { APPROX_NOTES, captureTime } from "../lib/captures";

/** Props for {@link CaptureStamp}. */
export interface CaptureStampProps {
  /** The ledger time, ISO 8601 with an offset. */
  capturedAt: string;
  /** What took the capture; omitted to show the time alone. */
  tool?: string;
  /** How a backfilled time was found; `null` for a time recorded at capture. */
  approx: CaptureApprox | null;
}

/**
 * A capture's time and tool, with a `≈` marker whose tooltip says why an
 * approximate time is approximate.
 *
 * @param props - the time, tool and approximation
 * @returns the stamp
 */
export function CaptureStamp({ capturedAt, tool, approx }: CaptureStampProps) {
  return (
    <span className="capture-stamp">
      {approx ? (
        <abbr className="approx" title={APPROX_NOTES[approx]}>
          ≈
        </abbr>
      ) : null}
      <time dateTime={capturedAt}>{captureTime(capturedAt)}</time>
      {tool ? <span className="tool mono muted"> {tool}</span> : null}
    </span>
  );
}
