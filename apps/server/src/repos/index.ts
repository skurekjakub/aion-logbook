import type { Db } from "../db/client";
import type { ContentKey, InsertOf, RowOf } from "../registry";
import { CONTENT_KEYS, specOf } from "../registry";
import type { AccountRepo } from "./account";
import { createAccountRepo } from "./account";
import type { BuildsRepo } from "./builds";
import { createBuildsRepo } from "./builds";
import type { CapturesRepo } from "./captures";
import { createCapturesRepo } from "./captures";
import type { CitationsRepo } from "./citations";
import { createCitationsRepo } from "./citations";
import type { FactClaimsRepo } from "./fact-claims";
import { createFactClaimsRepo } from "./fact-claims";
import type { GlossaryRepo } from "./glossary";
import { createGlossaryRepo } from "./glossary";
import type { RecordsRepo } from "./records";
import { createRecordsRepo } from "./records";
import type { SourcesRepo } from "./sources";
import { createSourcesRepo } from "./sources";
import type { TableRepo } from "./table-repo";
import { createTableRepo, orderTerms } from "./table-repo";
import type { TablesRepo } from "./tables";
import { createTablesRepo } from "./tables";

/**
 * One generic table repo per registered content type, in the type's
 * declared list order.
 */
export type ContentRepos = { [K in ContentKey]: TableRepo<RowOf<K>, InsertOf<K>> };

/** Every repo the server exposes, keyed by name. */
export type Repos = ContentRepos & {
  sources: SourcesRepo;
  citations: CitationsRepo;
  /** Research records' claims to game facts, and the sources each cites. */
  factClaims: FactClaimsRepo;
  /** Builds with their skill priorities, stigmas and macro chains. */
  builds: BuildsRepo;
  glossary: GlossaryRepo;
  records: RecordsRepo;
  captures: CapturesRepo;
  /** The character's snapshots and roadmaps. */
  account: AccountRepo;
  /** Whole-table dump, load, count and clear over every registered table. */
  tables: TablesRepo;
};

/**
 * Builds the generic repo of every registered content type.
 *
 * @param db - database or transaction handle
 * @returns the content repos, keyed by content type
 */
function createContentRepos(db: Db): ContentRepos {
  return Object.fromEntries(
    CONTENT_KEYS.map((key) => {
      const { table, content } = specOf(key);
      const order = content?.order;
      return [
        key,
        createTableRepo(db, table as never, order ? orderTerms(table, order) : undefined),
      ];
    }),
  ) as unknown as ContentRepos;
}

/**
 * Builds every repo over a shared database or transaction handle.
 *
 * @param db - database or transaction handle
 * @returns the repo set
 */
export function createRepos(db: Db): Repos {
  return {
    ...createContentRepos(db),
    sources: createSourcesRepo(db),
    citations: createCitationsRepo(db),
    factClaims: createFactClaimsRepo(db),
    builds: createBuildsRepo(db),
    glossary: createGlossaryRepo(db),
    records: createRecordsRepo(db),
    captures: createCapturesRepo(db),
    account: createAccountRepo(db),
    tables: createTablesRepo(db),
  };
}

/** The server's single entry point to persistence: repos plus transactions. */
export interface Store {
  /** Repos bound to the store's main database connection. */
  repos: Repos;
  /**
   * Runs `work` inside a database transaction, with repos bound to the
   * transaction handle. Rolls back and rethrows if `work` throws.
   *
   * The underlying session is fully synchronous: it commits as soon as
   * `work` returns, before an async callback's returned promise could ever
   * settle, so a rejection after that point would never roll back. `work`
   * is therefore constrained to a synchronous callback at compile time — a
   * callback returning `Promise<X>` is a type error, not a caught bug.
   *
   * @param work - callback invoked with transaction-scoped repos; must be
   *   synchronous
   * @returns whatever `work` returns
   * @throws whatever `work` throws, after rolling back
   */
  transaction<T>(work: (repos: Repos) => T extends Promise<unknown> ? never : T): T;
}

/**
 * Builds a {@link Store} over `db`.
 *
 * @param db - the database to persist to
 * @returns the store
 */
export function createStore(db: Db): Store {
  return {
    repos: createRepos(db),
    // The generic result of `work` doesn't distribute over drizzle's
    // `T extends Promise<any> ? Error : T` transaction return-type gate, so
    // the inner callback is cast to `never` (assignable to anything) and the
    // outer result is cast back to `T` to restore the real return type. The
    // public parameter type above (not this cast) is what actually rejects
    // an async `work`.
    /** @inheritdoc */
    transaction<T>(work: (repos: Repos) => T extends Promise<unknown> ? never : T): T {
      return db.transaction((tx) => work(createRepos(tx)) as never);
    },
  };
}
