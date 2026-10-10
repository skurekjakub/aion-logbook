import type { ReactNode } from "react";

/** Props for {@link EmptyState}. */
export interface EmptyStateProps {
  /** The message, e.g. "No decks recorded yet." */
  children: ReactNode;
}

/**
 * The dashed "nothing here" box shown in place of an empty view or list.
 *
 * @param props - the box's content
 * @returns the box
 */
export function EmptyState({ children }: EmptyStateProps) {
  return <div className="empty">{children}</div>;
}
