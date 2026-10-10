import { EmptyState } from "../components/EmptyState";
import { MacroChain } from "../components/MacroChain";
import type { BuildPageProps } from "./BuildPage";
import { BuildPage } from "./BuildPage";

/**
 * A build's built-in macro chains, in the build's order: each with its
 * key, delay and steps in the editor's order. The macro editor's rules
 * show above them as cited callouts.
 *
 * @param props - the class and the build the address names
 * @returns the view
 */
export function MacrosView(props: BuildPageProps) {
  return (
    <BuildPage {...props} view="macros">
      {(build) =>
        build.macros.length ? (
          <div className="grid g2">
            {build.macros.map((macro) => (
              <MacroChain key={macro.id} macro={macro} />
            ))}
          </div>
        ) : (
          <EmptyState>This build sets no macro chains.</EmptyState>
        )
      }
    </BuildPage>
  );
}
