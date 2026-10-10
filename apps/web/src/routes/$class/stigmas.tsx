import { createFileRoute } from "@tanstack/react-router";
import { validateBuildSearch } from "../../views/BuildPage";
import { StigmasView } from "../../views/StigmasView";

export const Route = createFileRoute("/$class/stigmas")({
  validateSearch: validateBuildSearch,
  component: Stigmas,
});

/**
 * A class's stigma slots, for the build the address names.
 *
 * @returns the view
 */
function Stigmas() {
  return <StigmasView section={Route.useRouteContext().section} search={Route.useSearch()} />;
}
