import type { ReactNode } from "react";

/** Props for {@link Points}. */
export interface PointsProps {
  /** The bullets, each a short line; an empty list renders nothing. */
  items: readonly ReactNode[];
}

/**
 * A view's explainer as short bullets, the default in place of a paragraph
 * (AGENTS.md: UI, scannable, not prose).
 *
 * @param props - the bullets
 * @returns the list, or null when there are none
 */
export function Points({ items }: PointsProps) {
  if (!items.length) return null;
  return (
    <ul className="points">
      {items.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ul>
  );
}
