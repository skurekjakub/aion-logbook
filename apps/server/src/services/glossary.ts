import type { GameClass, GlossaryInput, GlossaryKind, GlossaryRow } from "@aion/schema";
import type { Store } from "../repos";
import type { NameRef } from "./names";
import { createNameResolver } from "./names";
import { recordsCovering } from "./records";

/**
 * The Korean-to-English glossary: lookups and the upsert that keeps it
 * current.
 */
export interface GlossaryService {
  /**
   * Lists glossary entries ordered by `kr`.
   *
   * @param kind - restrict the list to this kind, when given
   */
  list(kind?: GlossaryKind): GlossaryRow[];
  /**
   * Resolves `name` against the current glossary.
   *
   * @param name - a name as it appeared in source data, in Korean or English
   * @param cls - when given, entries from the records covering this class
   *   win a key that several entries claim
   * @returns a {@link NameRef}; `en` is `null` if `name` matches no entry
   */
  resolve(name: string, cls?: GameClass): NameRef;
  /**
   * Inserts a glossary entry, or updates it in place if its `kr` already
   * exists.
   *
   * @param input - the entry to write
   * @returns the written row
   */
  upsert(input: GlossaryInput): GlossaryRow;
}

/**
 * Builds a {@link GlossaryService} over `store`.
 *
 * @param store - the store to persist through
 * @returns the service
 */
export function createGlossaryService(store: Store): GlossaryService {
  return {
    /** @inheritdoc */
    list: (kind) => store.repos.glossary.list(kind),
    /** @inheritdoc */
    resolve: (name, cls) => {
      const repos = store.repos;
      const records = cls ? recordsCovering(repos, cls) : [];
      return createNameResolver(repos.glossary.list())(name, records);
    },
    /** @inheritdoc */
    upsert: (input) => store.repos.glossary.upsert(input),
  };
}
