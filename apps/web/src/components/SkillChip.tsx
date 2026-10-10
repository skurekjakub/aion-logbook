import { skillInitials } from "../lib/builds";

/** What a {@link SkillChip} shows of a skill. */
export interface SkillRef {
  id: string;
  name: string;
  /** `active`, `passive` or `stigma`; tints the badge when given. */
  kind?: string;
}

/** Props for {@link SkillChip}. */
export interface SkillChipProps {
  /** The skill: its name, and its kind when known. */
  skill: Pick<SkillRef, "name" | "kind">;
  /** A level to show after the name, e.g. a target or the level read; omitted when undefined. */
  level?: number;
  /**
   * Marks a name read from the client that matched no loaded skill: the
   * chip is outlined and says "unresolved" after the name.
   */
  unresolved?: boolean;
}

/**
 * A skill as a chip: a badge with its initials (the game's own icons are
 * never hot-linked), its name, a level when given, and an "unresolved"
 * flag for a name that matched no loaded skill.
 *
 * @param props - the skill, an optional level and whether it is unresolved
 * @returns the chip
 */
export function SkillChip({ skill, level, unresolved = false }: SkillChipProps) {
  const className = [
    "skill-chip",
    skill.kind ? `k-${skill.kind}` : null,
    unresolved ? "unresolved" : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={className} title={skill.name}>
      {/* The initials are drawn by CSS from the attribute, so they stay out of the chip's text. */}
      <span className="skill-badge" data-initials={skillInitials(skill.name)} aria-hidden="true" />
      <span className="skill-name">{skill.name}</span>
      {level === undefined ? null : <span className="skill-lv mono">Lv {level}</span>}
      {unresolved ? <span className="skill-flag">unresolved</span> : null}
    </span>
  );
}
