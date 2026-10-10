import { slotTrack } from "../lib/builds";
import { Clamp } from "./Clamp";
import { Pill } from "./Pill";
import type { SkillRef } from "./SkillChip";
import { SkillChip } from "./SkillChip";

/** One stigma slot of a build. */
export interface StigmaSlotData {
  /** The character level the slot unlocks at. */
  slotLevel: number;
  /** Why this stigma goes here: one line. */
  why: string;
  skill: SkillRef;
}

/** Props for {@link StigmaSlots}. */
export interface StigmaSlotsProps {
  /** The build's stigma slots. */
  stigmas: readonly StigmaSlotData[];
  /** The character's level: a slot above it shows a lock. Omitted, nothing is locked. */
  unlockedTo?: number;
  /**
   * What the character has slotted, by slot level: the skill id, or null
   * for a slot read empty. Each of the build's slots the map names then
   * says whether the character matches it: slotted, swap, or slot it.
   */
  equipped?: ReadonlyMap<number, string | null>;
}

/**
 * A padlock icon named for the level that unlocks the slot.
 *
 * @param props - the slot's unlock level
 * @returns the icon
 */
function Lock({ level }: { level: number }) {
  return (
    <svg className="lock" role="img" aria-label={`locked at ${level}`} viewBox="0 0 16 16">
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * The stigma slot track, lowest slot first: each slot's unlock level as a
 * badge (a lock when it is above the character's level), the stigma as a
 * chip with whether the character has it slotted, has another stigma there,
 * or has the slot empty, and its why cut to one
 * line. A slot the build leaves empty says so.
 *
 * @param props - the build's stigmas, the character's level and what it has slotted
 * @returns the slot list
 */
export function StigmaSlots({ stigmas, unlockedTo, equipped }: StigmaSlotsProps) {
  return (
    <ol className="stigma-slots" aria-label="Stigma slots">
      {slotTrack(stigmas).map((level) => {
        const stigma = stigmas.find((s) => s.slotLevel === level);
        const locked = unlockedTo !== undefined && level > unlockedTo;
        const has = equipped?.get(level);
        return (
          <li key={level} className={locked ? "stigma-slot locked" : "stigma-slot"}>
            <span className="slot-level mono">
              {locked ? <Lock level={level} /> : null}
              {level}
            </span>
            {stigma ? (
              <span className="slot-body">
                <span className="slot-skill">
                  <SkillChip skill={stigma.skill} />
                  {locked || has === undefined ? null : has === null ? (
                    <Pill kind="warn">slot it</Pill>
                  ) : has === stigma.skill.id ? (
                    <Pill kind="good">slotted</Pill>
                  ) : (
                    <Pill kind="warn">swap</Pill>
                  )}
                </span>
                <span className="slot-why muted">
                  <Clamp lines={1}>{stigma.why}</Clamp>
                </span>
              </span>
            ) : (
              <span className="slot-body muted">empty</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
