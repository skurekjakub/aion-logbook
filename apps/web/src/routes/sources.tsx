import { createFileRoute } from "@tanstack/react-router";
import { useSearchPatch } from "../app/search";
import type { SourcesSearch } from "../views/SourcesView";
import { SourcesView, validateSourcesSearch } from "../views/SourcesView";

export const Route = createFileRoute("/sources")({
  validateSearch: validateSourcesSearch,
  component: Sources,
});

/**
 * Every cited source, with the site and title filters in the URL.
 *
 * @returns the view
 */
function Sources() {
  const onSearch = useSearchPatch<SourcesSearch>();
  return <SourcesView search={Route.useSearch()} onSearch={onSearch} />;
}
