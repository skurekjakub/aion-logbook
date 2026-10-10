/**
 * How a snapshot's stigmas are stored: each as an `account_skills` row
 * whose `slot` names the stigma slot, `stigma:<slot level>`. The account
 * importer writes the slot, and the account service reads it back.
 *
 * @module
 */

/** The prefix of a stigma row's `slot`. */
const STIGMA_PREFIX = "stigma:";

/**
 * The `slot` value of the stigma in the slot that unlocks at `slotLevel`.
 *
 * @param slotLevel - the slot's unlock level
 * @returns `stigma:<slotLevel>`
 */
export function stigmaSlot(slotLevel: number): string {
  return `${STIGMA_PREFIX}${slotLevel}`;
}

/**
 * Reads a stored `slot` back into a stigma slot level.
 *
 * @param slot - an `account_skills` row's slot
 * @returns the slot level, or `undefined` for a hotbar slot or none
 */
export function stigmaSlotLevel(slot: string | null): number | undefined {
  if (slot === null || !slot.startsWith(STIGMA_PREFIX)) return undefined;
  const level = Number(slot.slice(STIGMA_PREFIX.length));
  return Number.isInteger(level) ? level : undefined;
}
