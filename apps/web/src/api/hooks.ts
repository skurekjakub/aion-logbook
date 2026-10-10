import { useQuery } from "@tanstack/react-query";
import type { CharacterReading } from "../lib/builds";
import { readCharacter } from "../lib/builds";
import type { SourceIndex } from "../lib/sources";
import { EMPTY_SOURCES, indexSources } from "../lib/sources";
import type { GameClass } from "./queries";
import { accountQuery, sourcesQuery } from "./queries";

/**
 * The source index for `SourceChips`, from the one shared, unfiltered
 * `/api/sources` query.
 *
 * @returns id → URL/title; empty while loading or if the query failed, so
 *   chips then render unlinked rather than blocking the view
 */
export function useSourceIndex(): SourceIndex {
  const { data } = useQuery({ ...sourcesQuery(), select: indexSources });
  return data ?? EMPTY_SOURCES;
}

/**
 * The character as one class's build pages compare against it, from the
 * shared `/api/account` query of the latest snapshot.
 *
 * @param cls - the class whose pages ask
 * @returns the reading; null while loading, after a failure, without a
 *   snapshot, or when the character plays another class, so a page then
 *   shows the build alone rather than blocking
 */
export function useCharacter(cls: GameClass): CharacterReading | null {
  const { data } = useQuery({
    ...accountQuery(),
    select: (overview) => readCharacter(overview.snapshot, cls),
  });
  return data ?? null;
}
