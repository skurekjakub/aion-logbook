import { EmptyState } from "./EmptyState";

/** Props for {@link Placeholder}. */
export interface PlaceholderProps {
  /** The view's name, e.g. "Decks". */
  title: string;
  /** What will be here; defaults to "This view hasn't been built yet." */
  note?: string;
}

/**
 * A titled empty state for a route whose view isn't built yet.
 *
 * @param props - the view's name and what will be there
 * @returns the heading and the empty state
 */
export function Placeholder({
  title,
  note = "This view hasn't been built yet.",
}: PlaceholderProps) {
  return (
    <>
      <div>
        <h2>{title}</h2>
      </div>
      <EmptyState>{note}</EmptyState>
    </>
  );
}
