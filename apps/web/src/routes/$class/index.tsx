import { createFileRoute } from "@tanstack/react-router";
import { ClassOverview } from "../../views/ClassOverview";

export const Route = createFileRoute("/$class/")({
  component: Overview,
});

/**
 * A class's landing page: its builds at a glance.
 *
 * @returns the view
 */
function Overview() {
  return <ClassOverview section={Route.useRouteContext().section} />;
}
