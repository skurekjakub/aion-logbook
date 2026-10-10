import { createFileRoute } from "@tanstack/react-router";
import { validateBuildSearch } from "../../views/BuildPage";
import { SkillsView } from "../../views/SkillsView";

export const Route = createFileRoute("/$class/skills")({
  validateSearch: validateBuildSearch,
  component: Skills,
});

/**
 * A class's skill priority, for the build the address names.
 *
 * @returns the view
 */
function Skills() {
  return <SkillsView section={Route.useRouteContext().section} search={Route.useSearch()} />;
}
