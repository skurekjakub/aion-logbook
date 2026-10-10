# Stack profile — aion-logbook

> **Adapt me.** Every `rubber-duk-*` agent reads this file before it reviews or
> writes code. It holds everything that depends on *this* stack
> (TypeScript / Vitest): the framework docs to trust over training data, the
> skills to load, and the stack-specific hunt lists. The agents' own prompts
> stay stack-neutral — when the stack changes, change this file, not the
> agents. Delete sections that don't apply; add the rules your team keeps
> repeating in review.

## Framework docs and skills

- **Docs:** the official docs of each dependency at the major the workspace
  `package.json` files pin (root, `packages/*`, `apps/*`, `tools/*`). Check the
  installed version under `node_modules/<pkg>/package.json` before citing; cite
  these over training data. `README.md` and `AGENTS.md` describe the layout and
  the rules the stack runs under.
- **Skills to load:**
  - `vitest` before writing or auditing tests.
  - `frontend-design:frontend-design` and `web-design-guidelines` before any UI
    change; `agent-browser` to check every screen the change touches.
  - `deep-research` before writing a research record's write-up.
  - `research-planning:iterative-research` to ground a claim the installed
    packages don't settle.

## Review hunt list (rubber-duk-review, rubber-duk-backend)

- A route that reads the database or a repo directly → routes call services,
  services call repos, repos call the db (`apps/server/test/architecture.test.ts`
  enforces it).
- A function, method, class or interface method without TSDoc (summary,
  `@param name - …`, `@returns`, `@throws`) → add it; types stay in TypeScript,
  never in tags.
- Unrelated concerns piled into one file → split along responsibility, not
  line count.
- A schema written by hand beside the Drizzle table or Zod schema it shadows →
  derive it from `packages/schema`.
- An edited file under a record's `evidence/` → a later measurement is a new
  numbered file.
- A file written under `evidence/` with no line in `evidence/captures.jsonl` in
  the same commit → `pnpm capture log` (the scrapers append it themselves).
- Playwright, or `agent-browser wait <ms>` → `agent-browser`, headed, as
  `AGENTS.md` sets it up.
- Memory reading, packet capture, injection, or input sent while the character
  is in combat or in a party → the game bridge drives menus only.

## Security surface (rubber-duk-auditor)

- **Canonical config:** `vercel.json` (the deployment; it sets no headers
  today), the Hono app in `apps/server/src/app.ts`, and the Vercel function's
  entry `apps/server/src/vercel.ts`, which holds the read-only guard
  (`readOnlyHandler`). Read them end to end before any header finding.
- **Boundaries:**
  - The repo is public and there is no auth: no secret, token or personal path
    in committed files, and every committed file is published.
  - The deployed function answers anything but `GET` and `HEAD` with 405, and
    a write path reachable from the deployment is a BLOCKER. The one exception
    the user set is the sync button's `POST /api/account/sync`: it reads the
    character from the official site into the instance's in-memory database,
    at most once a minute, writes nothing that outlives the instance, and
    saves a change by dispatching `.github/workflows/sync.yml` with a
    cooldown; the token it holds stays server-side.
  - Only `VITE_`-prefixed env vars reach the web bundle; nothing private takes
    that prefix.
  - Captured media, game screenshots, game files, client data and decompiled
    artefacts never enter the repo (`.gitignore` covers the media paths).

## Backend surface (rubber-duk-backend)

- `apps/server/` (routes, services, repos, db, the importers and the snapshot
  CLIs), `packages/schema/`, `packages/capture/`, `packages/game/` and
  `tools/`. Everything rendering UI (`apps/web/`) goes to rubber-duk-frontend.

## Frontend (rubber-duk-frontend)

- `AGENTS.md` § "UI: scannable, not prose" is the rule set; it outranks taste.
- Colours, spacing and type come from the tokens in
  `apps/web/src/styles/tokens.css`; light and dark themes and phone width are
  checked on every surface.
- The game's own icons are never hot-linked; a skill renders as a chip with a
  badge fallback.

## Unit tests (rubber-duk-tests)

- Runner: Vitest. Load the `vitest` skill for `test.extend`, `test.for`,
  `vi.mocked` / `vi.hoisted`, mocking and reset semantics. **Version caveat:**
  the skill may target an older major than `package.json` declares — verify
  mocking, fixture and config claims against the official docs for the
  installed major.
- jsdom via the `// @vitest-environment jsdom` docblock; the default
  environment is `node`.
- Read `vitest.config.*` for the mechanics the suite relies on (globals,
  `restoreMocks` / `clearMocks`, setup files, aliases).
