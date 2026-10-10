import { createFileRoute } from "@tanstack/react-router";
import { useSearchPatch } from "../app/search";
import type { GlossarySearch } from "../views/GlossaryView";
import { GlossaryView, validateGlossarySearch } from "../views/GlossaryView";

export const Route = createFileRoute("/glossary")({
  validateSearch: validateGlossarySearch,
  component: Glossary,
});

/**
 * The glossary, with the kind and name filters in the URL.
 *
 * @returns the view
 */
function Glossary() {
  const onSearch = useSearchPatch<GlossarySearch>();
  return <GlossaryView search={Route.useSearch()} onSearch={onSearch} />;
}
