import type { ContentKey } from "../registry";
import { CONTENT_KEYS } from "../registry";
import type { Store } from "../repos";
import type { AccountService } from "./account";
import { createAccountService } from "./account";
import type { BuildService, MacroService } from "./builds";
import { createBuildService, createMacroService } from "./builds";
import type { CapturesService } from "./captures";
import { createCapturesService } from "./captures";
import type { RegisteredService } from "./content";
import { registeredService } from "./content";
import type { ExportService } from "./export";
import { createExportService } from "./export";
import type { GlossaryService } from "./glossary";
import { createGlossaryService } from "./glossary";
import type { RecordsService } from "./records";
import { createRecordsService } from "./records";
import type { SourcesService } from "./sources";
import { createSourcesService } from "./sources";

/** One content service per registered content type, built from its registry entry. */
export type ContentServices = { [K in ContentKey]: RegisteredService<K> };

/** Every service the server exposes. */
export type Services = ContentServices & {
  builds: BuildService;
  macros: MacroService;
  sources: SourcesService;
  glossary: GlossaryService;
  records: RecordsService;
  captures: CapturesService;
  account: AccountService;
  export: ExportService;
};

/**
 * Builds every service over a shared {@link Store}.
 *
 * @param store - the store services persist through
 * @returns the service set
 */
export function createServices(store: Store): Services {
  const content = Object.fromEntries(
    CONTENT_KEYS.map((key) => [key, registeredService(store, key)]),
  ) as ContentServices;
  return {
    ...content,
    builds: createBuildService(store),
    macros: createMacroService(store),
    sources: createSourcesService(store),
    glossary: createGlossaryService(store),
    records: createRecordsService(store),
    captures: createCapturesService(store),
    account: createAccountService(store),
    export: createExportService(store),
  };
}
