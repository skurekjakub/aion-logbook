# aion-logbook: design

Date: 2026-10-10. Status: approved (the user asked for a fully autonomous run, so each gate is self-approved and recorded here).

## What the user asked for

Verbatim intent, from the session that started the repo:

- Bootstrap the same project as `crumble-logbook` (`C:\repositories\crumble-logbook`) in `C:\repositories\aion-logbook`, for Aion 2.
- Restyle it to the Aion 2 look and feel, using the `frontend-design` skill.
- Find a way to read the running Aion 2 client, and set up the character's skills and the game's **built-in** macro system according to the best guides. Mouse clicks and keyboard input are allowed; the agent may take control of the game. No combat macros or bots.
- Install and bootstrap `skurekjakub/giga-marketplace` (its `setup-ai` packs) for the logbook site.
- Push the repo as a **public** GitHub repo on `skurekjakub`, and deploy to Vercel.
- Track everything in a superpowers plan; install whatever tooling is missing.

## Assumptions (made by the agent, correct them in OPEN-QUESTIONS.md)

- "The same project" means the same architecture, workflow and rules (records, capture ledger, layered Hono API, React web, snapshot-backed read-only Vercel site, AHK tools, `.claude` hooks), not crumble's Cookie Run content.
- The "mode" axis of crumble (game modes) becomes the **class** axis in Aion 2: `/gladiator/...`, `/chanter/...`. Only classes with content appear in the nav.
- The character is the one logged in on the client in the Steam (global) client's install folder, level 34 when this spec was written.

## Sub-projects and order

1. **App bootstrap**: a pruned port of crumble-logbook under the `@aion/*` scope.
2. **Aion 2 look**: the web restyled through `frontend-design`.
3. **Agent workspace**: setup-ai packs from giga-marketplace, plus the superpowers and frontend-design plugins (project scope).
4. **Game bridge**: read the client (screen capture) and drive it (AHK v2 input).
5. **Class build research**: record `001-<class>-build` to the deep-research contract.
6. **Apply in game**: skill levels, stigmas, the built-in macro chains and their keybinds, verified by screenshots.
7. **Publish**: public GitHub repo, Vercel project wired to it, production deploy.

Each one ends with `pnpm verify` green and a commit on `main`.

## 1. App bootstrap

Copy crumble-logbook's working tree (no `.git`, `node_modules`, `research/`, `account/`, `data/`, `.superpowers/`), rename `@crumble/*` → `@aion/*` and `crumble` → `aion` in identifiers, env vars (`AION_DB`, `AION_API`) and file names, then prune the domain.

**Kept as is (generic):** monorepo config, `tools/eslint-config` (exported as `aionConfig`), `packages/capture` (minus Korean-site scrapers that make no sense: `dc`, `naver`, `crumbgg` go; `youtube`, `log`, `verify`, `backfill` stay, plus a generic `web` fetch), the schema's generic tables (records, sources, citations, fact claims, captures, glossary, findings, recommendations), `columns.ts` helpers, the registry-driven repo/service/route stack, importer skeleton (manifest, read-record, write-record, captures, ledger, extractions), snapshot export/restore/scope, the Vercel build (`build-vercel.ts`, `vercel.ts`), `architecture.test.ts` and the ledger tests, the web shell (router, query client, `hc` client, generic components, theme toggle).

**Removed (crumble domain):** decks, counters, runes, gear, boss, stage, dungeon, daily dungeon, team power, crumble account tables; their importers, repos, services, routes, views, components, CSS and tests; `refresh-meta`; blog-specific skills (`write-blog-post`, `agent-readability`, `next-browser`); the crumble AHK macros (`adb-lib`, `conquest-macro`, `exp-dungeon-macro`) and `icons:fetch` against crumb.gg.

**Added (Aion 2 domain)**, in `packages/schema/src/tables/`:

| Table | Purpose | Key columns |
|---|---|---|
| `classes` (enum, not a table) | `CLASS`: gladiator, templar, assassin, ranger, sorcerer, spiritmaster, cleric, chanter | |
| `skills` | A class skill as the game names it | `id` slug, `class`, `name`, `kind` active/passive/stigma, `unlockLevel`, `cooldownSec`, `summary`, `recordSlug` |
| `builds` | A recommended setup for a class and purpose | `id`, `class`, `purpose` leveling/pve/pvp, `title`, `why`, `confidence` posted/tested/theory, `recordSlug`, obsolete columns |
| `build_skills` | Skill-level priority inside a build | `buildId`, `skillId`, `rank`, `targetLevel`, `why` |
| `build_stigmas` | Stigma per slot | `buildId`, `slotLevel` (22/27/32/37 on global), `skillId`, `why` |
| `macros` | One built-in macro chain | `id`, `buildId`, `name`, `key`, `delayMs`, `why` |
| `macro_steps` | Ordered steps of a chain (top = first slot in the editor) | `macroId`, `position`, `skillId`, `note` |
| `account_snapshots` | The character as read from the client | `id` date, `character`, `class`, `level`, `gearScore`, `server`, `capturedAt` |
| `account_skills` | Skill level and hotbar slot as read | `snapshotId`, `skillId`, `level`, `slot` |
| `account_roadmap` | Next actions against the research | `snapshotId`, `rank`, `priority` now/next/later, `area`, `action`, `why`, `refs` |

Every content row carries `recordSlug` and `sources[]`, as in crumble. Drizzle migrations are regenerated from scratch (one initial migration), `data/snapshot.json` is rebuilt from the imported records.

**API:** generic endpoints carry over (`/records`, `/sources`, `/glossary`, `/captures`, `/export`, `/account`); content endpoints from the registry: `/skills`, `/builds` (with nested skills, stigmas, macros), `/macros`. Filters: `?class=`, `?current=`, `?record=`.

**Web routes:** `/` (character card + what to do next), `/account`, `/research`, `/research/$slug/captures`, `/sources`, `/glossary`, `/$class` (overview), `/$class/skills`, `/$class/stigmas`, `/$class/macros`.

The crumble UI rules carry over verbatim (scannable, badges before text, clamped prose, source chips at row end, light and dark, phone width).

## 2. Aion 2 look

Driven by `frontend-design` at execution time; the brief is fixed here:

- Subject: a player's build logbook for Aion 2 (NCSOFT, 2025 KR / 2026 global), the game of Daevas with wings, Elyos and Asmodians, the Abyss.
- Reference material: the live client's HUD, captured into the repo's local screens (not committed): deep night-blue panels, cyan MP and energy glows, warm gold for level and rank, thin ornamental frames, wing iconography.
- Job: at a glance, which skills to level, which stigmas, which macro chain and key.
- Constraints: light and dark themes (dark is the game's native register; light is a "parchment of Atreia" daylight variant), tokens in `tokens.css`, Google Fonts only, no copied game art; the game's own skill icons are not hot-linked.

## 3. Agent workspace

Run the setup-ai engine (`workspace.mjs`) against the repo after the bootstrap: packs `baseline`, `hooks`, `review-agents` (stack profile generic), `dev-workflow`, `tech-writing`. `issue-tracking` is skipped (Jira, not used here). Values are inferred by `detect`; `VERIFY_CMD` is `pnpm verify`. Conflicts with files ported from crumble are resolved in favour of the template where the crumble file was blog-specific (`feature-development`, `project-bugfixing`, `codebase-refactoring`, `create-drawio-diagram`, `rubber-duk`), and in favour of the ported file otherwise. `.claude/setup-ai.json` is committed.

## 4. Game bridge

**Read:** Windows Graphics Capture through ffmpeg's `gfxcapture` filter, matched on `window_exe=AION2.exe`. It captures the game window while it is behind other windows, without focus changes and without touching the process. Proven on 2026-10-10 (1920×1080 PNG). No memory reading, no packet capture, no injection: those are what NCSOFT's anti-cheat and legal actions target.

- `packages/game` (TypeScript): `pnpm game shot <name>` → `account/snapshots/screens/<date>/<name>.png` (gitignored), `pnpm game crop <name> <x,y,w,h>` for zoomed reads. The agent reads the PNGs itself (vision) and writes the structured JSON.

**Drive:** AutoHotkey v2 (`%LOCALAPPDATA%\Programs\AutoHotkey\v2\AutoHotkey64.exe`), `tools/aion-input/aion.ahk`: one CLI with `focus`, `key <keys>`, `click <x> <y>`, `rclick`, `drag <x1> <y1> <x2> <y2>`, `scroll <x> <y> <n>`, `back` (restore the previously focused window). Client coordinates at 1920×1080, mouse moved in steps, a randomised 80–200 ms pause between events, `SendMode "Event"`. `pnpm game key|click|drag` wrap it and take a shot after each action.

Safety rules: input only to drive menus (skill window, stigma, macro editor, key settings); never while the character is in combat or in a party; the agent checks the shot before every next action and stops on anything unexpected.

**Account snapshot:** `account/snapshots/YYYY-MM-DD.json`, schema `aion-account-snapshot/1` (character, class, level, gear score, skills with levels and hotbar slots, stigmas, macros, unread[]), loaded by `pnpm import:account`.

## 5. Class build research

Record `research/001-<class>-build/` to the deep-research contract: question "what skill levels, stigmas and built-in macro chains should a level-34 <class> on the global client run, for leveling and PvE?". Sources: guide sites (eloboost24, aion2.run, metabot, games.gg, playnews, mein-mmo, gamesfuze and others), captured as Markdown into `evidence/` with ledger lines. Curated output: `skills.json`, `builds.json`, `macros.json`, `sources.json`, `glossary.json`, `meta.json`. Conflicts between guides are recorded, not hidden; confidence is `theory` unless a source shows measured data.

## 6. Apply in game

From the record's leveling/PvE build and the snapshot: spend unspent skill points in priority order, equip stigmas in the unlocked slots, build the macro chain(s) in the Skill window's macro editor with the guide delay, bind the macro key under Settings > Key Settings > General > Gameplay > Macro, then re-read the client and record the after-state as a second snapshot. Macro priority direction (top vs bottom) is checked in game on the editor's own tooltip before filling.

## 7. Publish

`gh repo create skurekjakub/aion-logbook --public --source . --push`. Vercel: `vercel link` (new project `aion-logbook`), `vercel git connect`, `vercel deploy --prod`; the site is read-only and serves `data/snapshot.json`, as crumble does. The repo homepage is set to the production URL.

## 8. Character sync and the dynamic roadmap (added 2026-10-10, user request)

The user asked for the logbook to sync with the character on demand and for the roadmap to update itself.

**Source:** the official Aion 2 site publishes each character's public data (gear with enchant levels, stats, skills, stigmas, Daevanion boards); fan armories such as metabot.gg read it. A spike finds the official endpoint (by server + character name) and records its shape as a capture in a research record; if no official endpoint is reachable without auth, the sync falls back to the game bridge read (§ 4) alone.

**Sync (`pnpm sync`, local, on demand):** fetch the character → map to `aion-account-snapshot/1` (fields the public data lacks, such as macros and keybinds, carry over from the latest game-read snapshot and are listed in `unread[]` when never read) → write `account/snapshots/<date>.json` (a same-day rerun replaces that day's file) → `import:account --replace` → `db:export` → commit and push, which redeploys Vercel. `--no-push` stops after the export. The character's server and name live in `account/character.json` (committed; the data is public).

**Scheduled sync:** a GitHub Actions workflow runs the fetch-only sync daily and on `workflow_dispatch`, committing only when the snapshot changed.

**Dynamic roadmap:** the server derives the roadmap at request time (`GET /api/account/roadmap`) from the latest snapshot and the current builds for the character's class: skills below their target level in build rank order, unlocked stigma slots that are empty or hold another stigma, macro chains missing or differing from the build. Curated roadmap items (`account/roadmap-*.json`) merge in after the derived ones. The web's home and account pages read it; no roadmap is stored for derived items.

## Error handling and testing

- `pnpm verify` (typecheck, eslint, prettier, vitest) is the gate for every commit; the ported architecture and ledger tests keep the layering and capture rules enforced.
- New tables get schema tests (round-trip insert/select) and importer tests on a fixture record; the API gets route tests for each new endpoint; the web gets render tests for each new view.
- The game bridge is tested with a fake ffmpeg/AHK runner (command lines asserted), and live once against the client.
- Vercel: the production URL returns the web app and `/api/records` returns the imported record.

## Out of scope

Combat automation of any kind; reading game memory or traffic; KR client data; a simulator; auth or writes on the hosted site.
