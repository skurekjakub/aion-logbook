import type { ReactNode } from "react";

/** Pill kinds; each is also the CSS modifier that colours it (see `components.css`). */
export type PillKind =
  "tested" | "posted" | "theory" | "good" | "info" | "warn" | "avoid" | "obsolete" | "quiet";

/** The verdict a kind reads as: its colour family and the glyph before its text. */
type Tone = "good" | "info" | "warn" | "bad" | "quiet";

/** Each kind's tone. */
const TONE: Record<PillKind, Tone> = {
  tested: "good",
  good: "good",
  posted: "info",
  info: "info",
  theory: "warn",
  warn: "warn",
  avoid: "bad",
  obsolete: "quiet",
  quiet: "quiet",
};

/** Each tone's glyph, so the verdict reads without colour too. */
const GLYPH: Record<Tone, string> = {
  good: "✓",
  info: "◆",
  warn: "!",
  bad: "✕",
  quiet: "–",
};

/** Props for {@link Pill}. */
export interface PillProps {
  /** Status kind; null or undefined renders nothing. */
  kind: PillKind | null | undefined;
  /** Text to show; defaults to the kind itself. */
  children?: ReactNode;
}

/**
 * A status badge, e.g. a confidence level or a "level up" flag: a tinted
 * pill whose glyph and colour give the verdict (good, note, caution, bad,
 * retired) before its text is read.
 *
 * @param props - the pill's kind and text
 * @returns the pill, or null without a kind
 */
export function Pill({ kind, children }: PillProps) {
  if (!kind) return null;
  const tone = TONE[kind];
  // The glyph is drawn by CSS from the attribute, so it stays out of the pill's text.
  return (
    <span className={`pill ${kind} t-${tone}`} data-glyph={GLYPH[tone]}>
      {children ?? kind}
    </span>
  );
}
