import { createFileRoute } from "@tanstack/react-router";
import { ResearchView } from "../views/ResearchView";

export const Route = createFileRoute("/research")({
  component: ResearchView,
});
