# Test layout

> **Adapt me.** Where tests live, so `rubber-duk-tests` puts new files where a
> teammate would look for them. Replace the defaults below with your layout.

- **Unit and integration tests:** `**/*.test.*`; each workspace package is a
  Vitest project (`vitest.config.ts`).
- **Placement rule:** a package's tests live in its own `test/` folder, named
  after the module they cover (`packages/capture/src/ledger.ts` →
  `packages/capture/test/ledger.test.ts`); shared helpers sit beside them in
  `test/helpers.ts`.
- **Integration tests** (several real modules together, fakes only at the
  process boundary): in the same `test/` folder as the unit tests of the
  package that owns the entry point; the server's layering rule is pinned by
  `apps/server/test/architecture.test.ts`.
- **Fixtures** live beside the tests that use them, frozen
  (`packages/capture/test/fixtures/` holds verbatim captures, kept byte for
  byte); tests never read production data. The one exception is the ledger
  check, which runs over every committed research record on purpose, so
  `pnpm verify` fails on a missing ledger line or an edited capture.
- **Run one file:** `pnpm test` with the file path appended.
