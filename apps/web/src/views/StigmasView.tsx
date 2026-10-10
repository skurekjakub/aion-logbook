import { StigmaSlots } from "../components/StigmaSlots";
import type { BuildPageProps } from "./BuildPage";
import { BuildPage } from "./BuildPage";

/**
 * A build's stigma per slot, lowest slot first: slots above the
 * character's level locked, and each filled slot marked slotted or swap
 * against what the character has in it, when the character plays this class.
 *
 * @param props - the class and the build the address names
 * @returns the view
 */
export function StigmasView(props: BuildPageProps) {
  return (
    <BuildPage {...props} view="stigmas">
      {(build, character) => (
        <StigmaSlots
          stigmas={build.stigmas}
          {...(character ? { unlockedTo: character.level, equipped: character.stigmas } : {})}
        />
      )}
    </BuildPage>
  );
}
