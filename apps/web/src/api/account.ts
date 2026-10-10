/**
 * Maps `GET /api/account` onto {@link AccountOverview}, the shape the
 * views read: each stigma names its skill as `skillName`, and a snapshot
 * always carries its macro chains (`[]` when the server sends none). A
 * response already in that shape passes through unchanged.
 *
 * @module
 */
import type { AccountMacro, AccountOverview, AccountResponse, AccountStigma } from "./types";

/** A stigma as either server shape names it. */
interface StigmaAsSent {
  slotLevel: number;
  skillId: string | null;
  skillName?: string;
  name?: string;
}

/**
 * Maps one stigma onto {@link AccountStigma}.
 *
 * @param stigma - the stigma as sent
 * @returns the stigma, its name read from `skillName` or else `name`
 */
function toStigma(stigma: StigmaAsSent): AccountStigma {
  return {
    slotLevel: stigma.slotLevel,
    skillName: stigma.skillName ?? stigma.name ?? "",
    skillId: stigma.skillId,
  };
}

/**
 * Maps the account response onto the shape the views read.
 *
 * @param response - `GET /api/account`'s body
 * @returns the overview, its snapshot's stigmas and macros normalised
 */
export function toAccountOverview(response: AccountResponse): AccountOverview {
  const { snapshot, ...rest } = response;
  if (!snapshot) return { ...rest, snapshot: null };
  const sent = snapshot as typeof snapshot & {
    stigmas: readonly StigmaAsSent[];
    macros?: AccountMacro[];
  };
  return {
    ...rest,
    snapshot: {
      ...snapshot,
      stigmas: sent.stigmas.map(toStigma),
      macros: sent.macros ?? [],
    },
  };
}
