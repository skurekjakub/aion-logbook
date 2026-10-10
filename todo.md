# To do

Pending work, newest decisions first. Decisions that need the user live in [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md); this file points at them. Delete an entry once it lands.

## Next

- **Play-test the Cleric builds.** Every build in `research/001-cleric-build` and `research/003-cleric-dungeon-dps-offheal` is `theory` until played. After a session, read the macro editor's run order and whether one entry fires a whole hotbar column, then update the records.
- **One-click sync on the deployment.** The deployed sync button reads the character into memory, but saving it links to the workflow's page until the Vercel project has `SYNC_GITHUB_TOKEN` (README § Character sync).

## Waiting on the user

- **The bootstrap's open assumptions.** What else of crumble-logbook to port, and classes as the main axis: `OPEN-QUESTIONS.md` § Assumptions the bootstrap made.

## Known gaps

- **Invested skill levels.** Snapshots carry levels with gear bonuses included, while build targets are invested levels; `.ai/followups/account/20261010-invested-skill-levels.md` (local) says how to split them.
- **deep-research leftovers.** Steps outside its repo section still come from the blog repo the skill was first written for.
- **YouTube test fixtures.** `packages/capture/test/fixtures/youtube/` are crumble-era captures, kept byte for byte because the YouTube scraper's tests compare against them; swap them for Aion 2 captures when the scraper next changes.
