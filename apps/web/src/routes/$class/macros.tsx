import { createFileRoute } from "@tanstack/react-router";
import { validateBuildSearch } from "../../views/BuildPage";
import { MacrosView } from "../../views/MacrosView";

export const Route = createFileRoute("/$class/macros")({
  validateSearch: validateBuildSearch,
  component: Macros,
});

/**
 * A class's macro chains, for the build the address names.
 *
 * @returns the view
 */
function Macros() {
  return <MacrosView section={Route.useRouteContext().section} search={Route.useSearch()} />;
}
