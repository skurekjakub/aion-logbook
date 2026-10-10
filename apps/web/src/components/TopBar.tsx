import { Fragment } from "react";

/** Props for {@link TopBar}. */
export interface TopBarProps {
  /** The id of the popover navigation the menu button opens. */
  navId: string;
  /** Where the reader is, outermost first, e.g. `["Guild Conquest", "Decks"]`. */
  trail: readonly string[];
}

/**
 * The phone's sticky top bar: one button that names where the reader is
 * and opens the navigation drawer (the popover whose id is `navId`). The
 * stylesheet hides it on wide screens, where the navigation is a sidebar.
 *
 * @param props - the navigation popover's id and the reader's location trail
 * @returns the top bar
 */
export function TopBar({ navId, trail }: TopBarProps) {
  return (
    <div className="topbar">
      <button
        type="button"
        className="menu-btn"
        popoverTarget={navId}
        aria-label={`Menu: ${trail.join(" / ")}`}
      >
        <span className="menu-icon" aria-hidden="true" />
        <span className="trail">
          {trail.map((t, i) => (
            <Fragment key={i}>
              {i > 0 ? <span className="trail-sep"> / </span> : null}
              <span className={i === trail.length - 1 ? "trail-here" : undefined}>{t}</span>
            </Fragment>
          ))}
        </span>
      </button>
    </div>
  );
}
