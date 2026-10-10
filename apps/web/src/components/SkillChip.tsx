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
  /** The skill. */
  skill: SkillRef;
  /** A level to show after the name, e.g. a target or the level read; omitted when undefined. */
  level?: number;
}

/**
 * A skill as a chip: a badge with its initials (the game's own icons are
 * never hot-linked), its name, and a level when given.
 *
 * @param props - the skill and an optional level
 * @returns the chip
 */
export function SkillChip({ skill, level }: SkillChipProps) {
  return (
    <span className={`skill-chip${skill.kind ? ` k-${skill.kind}` : ""}`} title={skill.name}>
      {/* The initials are drawn by CSS from the attribute, so they stay out of the chip's text. */}
      <span className="skill-badge" data-initials={skillInitials(skill.name)} aria-hidden="true" />
      <span className="skill-name">{skill.name}</span>
      {level === undefined ? null : <span className="skill-lv mono">Lv {level}</span>}
    </span>
  );
}
