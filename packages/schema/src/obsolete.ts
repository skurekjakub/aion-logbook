/**
 * The obsolete lifecycle's shared names: which cited entities' rows can be
 * marked obsolete, and how the citations of an obsolete row's reason are
 * keyed. The server's importer and services both read these.
 *
 * @module
 */
import type { CitedEntity } from "./enums";

/** The cited entities whose rows carry the obsolete lifecycle: builds. */
export const OBSOLETE_ENTITIES = ["build"] as const satisfies readonly CitedEntity[];
/** A cited entity whose rows carry the obsolete lifecycle. */
export type ObsoleteEntity = (typeof OBSOLETE_ENTITIES)[number];

/** The citation entity an obsolete row's reason is cited under. */
export const OBSOLESCENCE: Extract<CitedEntity, "obsolescence"> = "obsolescence";

/**
 * Reports whether rows of `entity` carry the obsolete lifecycle.
 *
 * @param entity - a cited entity
 * @returns `true` for an entity {@link OBSOLETE_ENTITIES} lists
 */
export function isObsoleteEntity(entity: CitedEntity): entity is ObsoleteEntity {
  return (OBSOLETE_ENTITIES as readonly CitedEntity[]).includes(entity);
}

/**
 * The citation entity id of an obsolete row's reason.
 *
 * @param entity - the row's cited entity
 * @param id - the row's id, e.g. a build's slug
 * @returns `<entity>:<id>`, e.g. `build:gladiator-leveling`
 */
export function obsolescenceKey(entity: ObsoleteEntity, id: string | number): string {
  return `${entity}:${String(id)}`;
}

/**
 * Reads an obsolescence citation's entity id back into the row it names.
 *
 * @param key - a citation entity id {@link obsolescenceKey} wrote
 * @returns the row's entity and id (as text), or `undefined` when `key`
 *   names no entity {@link OBSOLETE_ENTITIES} lists, or no id
 */
export function parseObsolescenceKey(
  key: string,
): { entity: ObsoleteEntity; id: string } | undefined {
  const at = key.indexOf(":");
  if (at < 0) return undefined;
  const entity = key.slice(0, at);
  const id = key.slice(at + 1);
  if (id === "" || !(OBSOLETE_ENTITIES as readonly string[]).includes(entity)) return undefined;
  return { entity: entity as ObsoleteEntity, id };
}
