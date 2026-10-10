import type { BuildSkill } from "../api/types";
import { Clamp } from "../components/Clamp";
import { Pill } from "../components/Pill";
import { SkillChip } from "../components/SkillChip";
import type { CharacterReading } from "../lib/builds";
import { levelState } from "../lib/builds";
import type { BuildPageProps } from "./BuildPage";
import { BuildPage } from "./BuildPage";

/**
 * How a skill stands against its target, as a badge: "level up" with the
 * level read and the target when it is below it, "at target" when it
 * isn't; nothing when the character's level for it wasn't read.
 *
 * @param props - the skill priority and the character, if it plays this class
 * @returns the badge, or null
 */
function LevelBadge({
  priority,
  character,
}: {
  priority: BuildSkill;
  character: CharacterReading | null;
}) {
  const current = character?.skills.get(priority.skill.id);
  const state = levelState(priority.targetLevel, current);
  if (state === "unknown") return null;
  if (state === "done") return <Pill kind="good">at target</Pill>;
  return (
    <span className="level-up">
      <Pill kind="warn">level up</Pill>
      <span className="mono">{`${current} → ${priority.targetLevel}`}</span>
    </span>
  );
}

/**
 * A build's skill priority, rank 1 first: each row the rank, the skill as
 * a chip, its target level as a badge, how the character stands against
 * it, and the one-line why.
 *
 * @param props - the class and the build the address names
 * @returns the view
 */
export function SkillsView(props: BuildPageProps) {
  return (
    <BuildPage {...props} view="skills">
      {(build, character) =>
        build.skills.length ? (
          <ol className="priority" aria-label="Skill priority">
            {[...build.skills]
              .sort((a, b) => a.rank - b.rank)
              .map((p) => (
                <li key={p.rank} className="priority-row">
                  <span className="rank mono" aria-label={`Rank ${p.rank}`}>
                    {p.rank}
                  </span>
                  <span className="priority-main">
                    <SkillChip skill={p.skill} />
                    <span className="target mono" title="Target level">
                      Lv {p.targetLevel}
                    </span>
                    <LevelBadge priority={p} character={character} />
                  </span>
                  <span className="priority-why muted">
                    <Clamp lines={1}>{p.why}</Clamp>
                  </span>
                </li>
              ))}
          </ol>
        ) : (
          <p className="muted">This build sets no skill levels.</p>
        )
      }
    </BuildPage>
  );
}
