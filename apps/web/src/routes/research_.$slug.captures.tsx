import { createFileRoute } from "@tanstack/react-router";
import { useSearchPatch } from "../app/search";
import type { CapturesSearch } from "../views/CapturesView";
import { CapturesView, validateCapturesSearch } from "../views/CapturesView";

export const Route = createFileRoute("/research_/$slug/captures")({
  validateSearch: validateCapturesSearch,
  component: Captures,
});

/**
 * One research record's capture ledger, with the folder, tool and search filters in the URL.
 *
 * @returns the view
 */
function Captures() {
  const onSearch = useSearchPatch<CapturesSearch>();
  const { slug } = Route.useParams();
  return <CapturesView slug={slug} search={Route.useSearch()} onSearch={onSearch} />;
}
