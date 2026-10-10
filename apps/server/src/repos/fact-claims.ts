import type { CitedEntity } from "@aion/schema";
import { factClaims } from "@aion/schema";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";

/** A game fact, by its citation entity and its id as citations store it. */
export interface FactRef {
  /** The fact's citation entity. */
  entity: CitedEntity;
  /** The fact's id, as a string. */
  entityId: string;
}

/**
 * Research records' claims to game facts: which record supplied a fact,
 * citing which sources.
 */
export interface FactClaimsRepo {
  /**
   * Deletes every claim to the fact, whichever record made it.
   *
   * @param fact - the fact
   */
  removeFor(fact: FactRef): void;
}

/**
 * Builds a {@link FactClaimsRepo}.
 *
 * @param db - database or transaction handle
 * @returns the repo
 */
export function createFactClaimsRepo(db: Db): FactClaimsRepo {
  return {
    /** @inheritdoc */
    removeFor: ({ entity, entityId }) => {
      db.delete(factClaims)
        .where(and(eq(factClaims.entity, entity), eq(factClaims.entityId, entityId)))
        .run();
    },
  };
}
