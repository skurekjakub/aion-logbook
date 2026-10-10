import { createFileRoute } from "@tanstack/react-router";
import { useSearchPatch } from "../app/search";
import type { AccountSearch } from "../views/AccountView";
import { AccountView, validateAccountSearch } from "../views/AccountView";

export const Route = createFileRoute("/account")({
  validateSearch: validateAccountSearch,
  component: Account,
});

/**
 * The character, with the snapshot shown in the URL.
 *
 * @returns the view
 */
function Account() {
  const onSearch = useSearchPatch<AccountSearch>();
  return <AccountView search={Route.useSearch()} onSearch={onSearch} />;
}
