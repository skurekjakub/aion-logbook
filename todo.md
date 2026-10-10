# To do

Pending work, newest decisions first. Decisions that need the user live in [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md); this file points at them. Delete an entry once it lands.

## In progress

- **The bootstrap plan.** [`docs/superpowers/plans/2026-10-10-aion-logbook.md`](docs/superpowers/plans/2026-10-10-aion-logbook.md) ports crumble-logbook to Aion 2, restyles it, bridges the game client, researches and applies the character's build, and publishes the repo and site. Its checkboxes say which tasks have landed.

## Next

- **Schema tables.** `packages/schema` holds only the capture ledger's schema; the generic and Aion 2 tables, inputs and the initial migration come next (plan Task 2).
- **Server and web.** `apps/server` and `apps/web` are not ported yet; the root `dev`, `import:*`, `db:*` and `build:vercel` scripts resolve once they are, and `pnpm-workspace.yaml` and `vitest.config.ts` get `apps/*` back.
- **Game bridge.** `pnpm game` resolves once `packages/game` lands.

## Waiting on the user

- **The bootstrap's assumptions.** Scope of the port, classes as the axis, which character, the first class researched, how far the agent drives the game, and publishing the character's name: `OPEN-QUESTIONS.md` § Assumptions the bootstrap made.

## Known gaps

- **Records test with no records.** `packages/capture/test/records.test.ts` skips its suites while `research/` doesn't exist; it runs once record 001 lands.
- **deep-research leftovers.** Steps outside its repo section still come from the blog repo the skill was first written for.
- **YouTube test fixtures.** `packages/capture/test/fixtures/youtube/` are crumble-era captures, kept byte for byte because the YouTube scraper's tests compare against them; swap them for Aion 2 captures when the scraper next changes.
