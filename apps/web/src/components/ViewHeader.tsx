import type { ReactNode } from "react";
import { Clamp } from "./Clamp";
import { Points } from "./Points";

/** Props for {@link ViewHeader}. */
export interface ViewHeaderProps {
  /** The view's `<h2>`. */
  title: ReactNode;
  /**
   * What the view shows: short bullets (the default form), or a single
   * line, which is clamped when long.
   */
  lede?: ReactNode | readonly string[];
}

/**
 * A view's heading and its explainer, at the top of its panel.
 *
 * @param props - the heading and the optional explainer
 * @returns the header
 */
export function ViewHeader({ title, lede }: ViewHeaderProps) {
  return (
    <div className="view-head">
      <h2>{title}</h2>
      {isList(lede) ? (
        <Points items={lede} />
      ) : lede ? (
        <p className="lede">
          <Clamp lines={2}>{lede}</Clamp>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Whether an explainer is given as bullets.
 *
 * @param lede - the explainer
 * @returns true for a list of strings
 */
function isList(lede: ViewHeaderProps["lede"]): lede is readonly string[] {
  return Array.isArray(lede);
}
