import { useNavigate } from "@tanstack/react-router";
import { mergeSearch } from "../lib/search";

/**
 * A setter for the current route's search params: it merges a patch into
 * them (see `mergeSearch`) and replaces the history entry, so filtering a
 * view doesn't add a back-button step per keystroke.
 *
 * @typeParam S - the route's validated search params
 * @param read - reads the current params before the patch is merged in,
 *   for a route whose validator passes them through unread (one whose
 *   usable values the validator can't know); a param it drops leaves the
 *   URL. Without it the route's validated params are merged as they are.
 * @returns a function applying a patch to the current search params
 */
export function useSearchPatch<S extends object>(
  read?: (search: Record<string, unknown>) => S,
): (patch: Partial<S>) => void {
  const navigate = useNavigate();
  return (patch) =>
    void navigate({
      to: ".",
      // The router types `prev` per destination; `"."` is the current route,
      // whose search params are `S`.
      search: ((prev: S) =>
        mergeSearch(read ? read(prev as Record<string, unknown>) : prev, patch)) as never,
      replace: true,
    });
}
