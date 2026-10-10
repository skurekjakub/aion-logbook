import { Pill } from "./Pill";

/** How well a claim is backed: measured, posted by players, or read from skill data. */
export type Confidence = "tested" | "posted" | "theory";

/** Each confidence's tooltip. */
const MEANING: Record<Confidence, string> = {
  tested: "Measured in game",
  posted: "Posted by players or guides",
  theory: "Read from skill data, not measured",
};

/**
 * A claim's confidence as a pill: tested reads good, posted a note, theory a caution.
 *
 * @param props - the claim's confidence
 * @returns the pill, its meaning in the tooltip
 */
export function ConfidencePill({ confidence }: { confidence: Confidence }) {
  return (
    <span title={MEANING[confidence]}>
      <Pill kind={confidence} />
    </span>
  );
}
