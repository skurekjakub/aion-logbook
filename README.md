# aion-logbook

A local build logbook for Aion 2 (NCSOFT, the global Steam client): which skills a class should level and to what level, which stigma goes in each slot, and which built-in macro chain to run on which key, for leveling, PvE and PvP. Every recommendation is traced to the guide, video or in-game reading it came from, and a bridge reads the running client and drives its menus to apply a build.

**Status:** the monorepo skeleton, the capture tooling and the agent setup are in place. The schema's tables, the API, the web app and the game bridge land as the plan in `docs/superpowers/plans/` proceeds; `todo.md` says where it stands. The sections below describe the finished layout; a root script whose package isn't there yet matches no workspace package and does nothing.

## What's here

| Path | What it holds |
|---|---|
| `research/` | Research records. Each has a `README.md` (question, verdict, sources) and `evidence/` with verbatim captures (guide pages as Markdown, YouTube digests and frames) and `evidence/captures.jsonl`, the capture ledger (see [Captures](#captures)). A record may also keep a `research-trail.md` (its web search rounds). A record the app can load also has `import.json` (what to import and from where), `curated/` (the curated dataset) and `searches.json`, its saved searches (schema `packages/capture/src/searches.ts`), each dated by rounds the record ran: the day `import.json` says it started, or a `## Refresh <date>` section of its README. |
| `account/` | The character as read from the client and synced from the official site: `character.json` (which character `pnpm sync` reads), snapshots at `snapshots/<date>.json` (schema `aion-account-snapshot/1`), curated roadmap items ranked against a snapshot (`roadmap-<date>.json`), apply logs, and the screens they were read from under `snapshots/screens/` (gitignored). `account/README.md` says how a read is made. |
| `packages/schema` | Zod schemas shared by every package: today the capture ledger's line schema; the Drizzle tables and migrations join it. |
| `packages/capture` | The capture ledger and the scrapers (generic web pages, YouTube, and `yt-dlp`/`ffmpeg` wrappers), run as `pnpm capture`. Pure I/O: nothing from `apps/`. |
| `packages/game` | The game bridge: window capture of `AION2.exe` and menu input through AutoHotkey, run as `pnpm game`. Pure I/O: nothing on the server imports it. |
| `packages/armory` | The character sync: fetches the character from the official site's public data and maps it to a snapshot, run as `pnpm sync` (see [Character sync](#character-sync)). Nothing imports it; it reaches the server through its CLIs. |
| `apps/server` | The data API: Hono over SQLite, layered `routes → services → repos`, with one content-type registry, plus the record importer and the snapshot CLIs. |
| `apps/web` | The web app: React + TanStack Router/Query, typed against the API through `hc<AppType>`. One section per class with content (`/$class/skills`, `/stigmas`, `/macros`), plus the character card, Research, Sources and Glossary. |
| `data/` | `aion.db` (local, gitignored) and `snapshot.json`, the committed, diffable dump of the database. |
| `tools/aion-input/` | The AutoHotkey v2 script behind `pnpm game key|click|drag`. |
| `tools/eslint-config/` | The ESLint flat config (a workspace package). It carries its own TypeScript 6.0, because typescript-eslint needs the JS compiler API, which the native TypeScript 7 behind `tsc` doesn't ship yet (expected in 7.1). |
| `docs/superpowers/` | The design specs (`specs/`) and the implementation plans (`plans/`). |
| `OPEN-QUESTIONS.md` | Decisions waiting on the user. |
| `todo.md` | Pending work. |
| `.claude/` | Claude Code skills, agents, hooks and settings used to run the research. |

## Development

Requires Node 24.18+ and pnpm 12.6.

```sh
pnpm install
pnpm dev           # the API and the web app together: http://localhost:5173
pnpm verify        # typecheck → eslint → prettier check → vitest
pnpm lint          # eslint alone (type-aware); pnpm lint:fix applies the safe fixes
pnpm vitest run packages/capture   # one package's tests
pnpm dev:server    # API on http://localhost:8787/api
pnpm dev:web       # web app on http://localhost:5173, proxying /api (AION_API overrides the target)
```

The server creates and seeds its database from `data/snapshot.json` when the file doesn't exist yet, so a fresh clone runs with `pnpm install && pnpm dev`. Delete `data/aion.db` (or run `pnpm dev:reseed`) to start again from the snapshot. When the file exists, the server compares it with the snapshot on startup and warns about records and tables that differ; it never reseeds or deletes the database itself.

ESLint runs typescript-eslint's strict type-checked rules, React's hook rules on the web app, and JSDoc on every function, method, class and interface method (see `AGENTS.md`). The config and the reason for each switched-off rule are in `tools/eslint-config/index.ts`.

### Deployment

The app is published read-only at <https://aion-logbook.vercel.app> (Vercel project `aion-logbook`). `pnpm build:vercel` builds the web app and writes `.vercel/output` in Vercel's Build Output API layout: the web app as static files, and the server's Vercel entry bundled as the function behind `/api`. That function seeds an in-memory database from `data/snapshot.json` on every cold start and answers anything but `GET` and `HEAD` with 405, so the site shows the committed snapshot and nothing else. The sync button's `POST /api/account/sync` is the one exception: it dispatches the sync workflow, whose commit deploys (see [Character sync](#character-sync)). The project is connected to the GitHub repo: a push to `main` deploys to production, and that is the only way it deploys. Vercel runs the build with pnpm from `packageManager` through corepack.

### The database

The server reads `data/aion.db`, or the file `AION_DB` names (an absolute path; the scripts run from `apps/server`). `PORT` overrides the default port, 8787. `pnpm import:account` reads the character's snapshots from `account/`, or the folder `AION_ACCOUNT` names (an absolute path).

```sh
pnpm import:record 001-<class>-build             # load a research record next to any others
pnpm import:record 001-<class>-build --replace   # clear that record's rows and load it again
pnpm import:account                              # the latest character snapshot from account/
pnpm db:export                                   # write data/snapshot.json from the database
pnpm db:restore [file]                           # load a snapshot (default data/snapshot.json) into an empty database
pnpm db:scope HEAD 001-<class>-build             # the records whose rows data/snapshot.json changed, against HEAD; fails on any other
```

`import:record` reads `research/<slug>/import.json`, validates every curated file, every reference and the capture ledger before writing, and loads everything in one transaction. An error names the file and the row, and leaves the database untouched. Every row it writes belongs to the record (`recordSlug`); `--replace` clears only that record's rows. Sources and glossary entries can be shared between records: the first record to load one keeps it, and a later record's differing version is reported as a warning.

A recommendation (a build, its skills, stigmas and macros) is marked obsolete in its curated file, never deleted: `"obsolete": { "since": "YYYY-MM-DD", "reason": "…", "sources": ["web:…"] }`. The import checks the date and the sources and writes `obsoleteSince` and `obsoleteReason`; removing the block and re-importing makes the row current again.

Commit `data/snapshot.json` after changing a record's data, built from a fresh import of every record, in number order, into an empty database (point `AION_DB` at a new file), then `pnpm import:account`, then `pnpm db:export`. A database that `--replace` or the API changed holds ids and rows a fresh import wouldn't make.

### API

Every resource is under `/api` and speaks JSON. Validation failures are 400 with every Zod issue and its path, unknown ids are 404, an unknown cited source is 422 naming the ids, and conflicts are 409. Content rows carry `sources`, the ids of the sources they cite; creating one needs at least one. Every list whose rows belong to a class takes `?class=`, every list whose rows carry the obsolete lifecycle takes `?current=true|false`, and recommendations take `?record=<slug>`.

| Resource | Verbs | Notes |
|---|---|---|
| `/api/skills` | `GET`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` | A class skill as the game names it: kind, unlock level, cooldown, summary. |
| `/api/builds` | `GET`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` | A recommended setup for a class and purpose. `GET /:id` nests its skill priorities (target level and why), its stigma per slot and its macro chains. |
| `/api/macros` | `GET`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` | A built-in macro chain: its key, delay and steps in the editor's order. |
| `/api/sources` | `GET`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` | `?site=web\|yt`; `?record=<slug>` keeps the sources a record owns or cites. Each source carries `capture`, its evidence capture's ledger line, or `null`. |
| `/api/captures` | `GET` | The loaded records' capture ledgers, by record then path. `?record=` and `?path=` filter. Read-only. |
| `/api/glossary` | `GET`, `POST` | `?kind=` filters. |
| `/api/records` | `GET`, `GET /:slug` | Research records and the classes each covers. |
| `/api/account` | `GET` | The character: the latest snapshot (class, level, gear score, skills with levels and hotbar slots, stigmas, macros), or the one `?snapshot=` names, and every loaded snapshot. Read-only: `pnpm import:account` writes it. |
| `/api/account/roadmap` | `GET` | The roadmap ranked against the latest snapshot (or `?snapshot=`): `{ snapshotId, curatedFrom, items }`, each item with `rank`, `priority`, `area`, `action`, `why`, `refs` and `derived`. Derived at request time (see [Character sync](#character-sync)), then the curated items. |
| `/api/account/sync` | `GET`, `POST` | The home page's sync button. `GET` says how a press starts the sync: `{ mode: "local" \| "github" \| "manual", url }`. `POST` starts one and answers `{ status }` (`synced`, `dispatched`, `busy`, `manual`, `failed` with 502, or `forbidden` with 403 for a cross-site press). See [Character sync](#character-sync). |
| `/api/export` | `GET` | The full snapshot, the same shape as `data/snapshot.json`. |

**SQLite driver:** Node's built-in `node:sqlite`, through the `drizzle-orm/node-sqlite` driver in drizzle-orm 1.0 beta. It needs no native build. Zod schemas come from `drizzle-orm/zod`.

### Character sync

`pnpm sync` reads the character named in `account/character.json` (name, region, server id, the cached `characterId`) from the official site's public JSON (`research/002-character-data-source`), without touching the client:

```sh
pnpm sync                      # fetch, write account/snapshots/<today>.json, import, export, commit, push
pnpm sync --no-push            # stop after the export
pnpm sync --date 2026-10-12    # file the snapshot under another day
```

- **Requests:** a name search only when no `characterId` is cached (or the cached one answers 404), then the info and equipment responses, one at a time, with a User-Agent naming the logbook. A 5xx is retried once after a 2 s pause, a 4xx never; a failure names the request and status, and nothing is written.
- **Mapping** (`packages/armory/src/map.ts`): name, class, level, item level as `gearScore`, server, every acquired skill and stigma with its level, and the equipped stigmas placed into the slots open at the character's level. Macros, hotbar slots and stigma slot positions aren't published: they carry over from the latest snapshot, and `unread[]` says so.
- **Writes:** `account/snapshots/<date>.json`, or `<date>-sync.json` when that day's file is a game read (it lists `screens`), so the read stays and the sync sorts after it as the latest; a rerun replaces the synced file. Nothing at all when the character matches the latest snapshot. Before any request it refuses a day that already has a read sorting after the file it would write (`<date>-after.json`), and a database restore from an export that holds no skills; pass `--date` or rename the read. Then `pnpm import:account <file> --replace` and `pnpm db:export` (restoring the database from `data/snapshot.json` first when `data/aion.db` doesn't exist), then a commit of the snapshot and the export alone, and a push. A failed push leaves the commit local and says so.
- **The sync button:** the home page's "Sync character" button. Locally (`pnpm dev`, the API bound to `localhost`) the server runs the sync's CLI itself, killed after 5 minutes, and the page refetches when it ends. A press another site sends is refused with 403. On the deployment it dispatches `.github/workflows/sync.yml` when the project's `SYNC_GITHUB_TOKEN` environment variable holds a fine-grained token with Actions read and write on this repository, and refuses while a run is in progress or started under 15 minutes ago; without the token it links to the workflow's page, where "Run workflow" starts it. The workflow runs the same sync with `--no-push` and commits as the GitHub Actions bot when anything changed, and that push deploys. It never runs on a schedule.

**The roadmap** (`GET /api/account/roadmap`, `apps/server/src/services/roadmap.ts`) is derived at request time from the snapshot and the first current build of its class:

- skills below their target level, in build rank order, the top ones due now and the rest next;
- the stigmas the build wants in the open slots against the stigmas slotted, compared as sets since slot positions aren't readable: swap, slot, or acquire first, due now;
- macro chains no read chain matches step for step (rebuild or build), or matching ones without a key (bind), due next.

The curated items of the latest snapshot that has a `roadmap-<id>.json` follow (`curatedFrom` names it). Ranked against the snapshot itself, they win every area they cover and the derived items fill the rest; from an older snapshot, every derived item stays and a curated item a derived one already names is dropped. The home and character pages mark each item `auto`, `curated`, or `stale` (curated against an older snapshot).

Skill targets are invested levels while a snapshot's levels include the gear bonus, so the derived skill items flag only skills whose total is below target.

## Game bridge

The bridge reads the running client and drives its menus; it never touches the process.

- **Read:** Windows Graphics Capture through ffmpeg's `gfxcapture` filter, matched on `window_exe=AION2.exe`. It captures the game window while it is behind other windows, without a focus change. `pnpm game shot <name>` writes `account/snapshots/screens/<date>/<name>.png` (gitignored); `pnpm game crop <name> <x,y,w,h>` cuts a region out for a closer read. The agent reads the PNGs itself and writes the structured JSON.
- **Drive:** AutoHotkey v2 through `tools/aion-input/aion.ahk`. `pnpm game key|click|drag` send one input at client coordinates (1920×1080), with the mouse moved in steps and a randomised pause between events, then take a shot.
- **Safety:** input only drives menus (skill window, stigmas, macro editor, key settings); never while the character is in combat or in a party. Read the shot before every next action and stop on anything unexpected. No memory reading, no packet capture, no injection: those are what the anti-cheat and NCSOFT's legal actions target.

## Working notes

- **Commits:** the `require-commit-format` hook blocks `git commit -m` with a subject alone. Write the message (subject, then a body with the problem, the justification and what was discarded) to a file and run `git commit -F <file>`.
- **Gates:** run `pnpm verify`. The `prefer-verify-script` hook blocks chained gates and unscoped whole-repo test, lint and format runs; scope them by path, or run verify.
- **Names:** the game's English names on the global client are the canonical ones. A guide that uses another name (a KR translation, a community nickname) gets a glossary entry pointing at the client's name.
- **Classes:** a class appears in the web app's navigation only once a record gives it content.

## Captures

Captures are taken by scripts and agent-browser sessions, never from the app. Every file under a record's `evidence/` has a line in that record's `evidence/captures.jsonl`: its path, URL (`null` for a derived file), capture time, tool and sha256.

```sh
pnpm capture web fetch <record> <url> <dir>                       # a web page as Markdown, with url/captured_at/title front matter
pnpm capture youtube watch|search|download <record> <outdir> ...  # watch pages and digests, searches, yt-dlp downloads
pnpm capture youtube frames|sheet|subs <record> ...               # ffmpeg frames, contact sheets, subtitle-band sheets
pnpm capture log <record> <path> --url <url|-> --tool <tool>      # a file captured any other way (agent-browser, curl, manual)
pnpm capture verify [record]                                      # check every ledger against the files on disk
pnpm capture backfill <record> [--from <dir>]                     # write the ledger of a record that predates it, once
```

`<record>` is the folder name under `research/`, and every path is record-relative under `evidence/`. A scraper appends each file's ledger line as it writes it and never overwrites a capture: `web fetch` names the file after the URL (host and path, the query left out), keeps a page already captured from the same URL without fetching it again, and stops on a file that sits on disk without a line, differs from its line, or holds another URL that differs only in its query (capture that one into another `<dir>`). `pnpm capture` with no arguments prints the full usage. Tools are named from `CAPTURE_TOOL` in `packages/schema/src/enums.ts`: the scrapers as `capture:<scraper>`, then `agent-browser`, `curl`, `yt-dlp`, `manual`, or `unknown` (backfill only).

- **Media stays local.** Images, frames and video are gitignored under `research/` (the extensions are `MEDIA_EXTENSIONS` in `packages/capture/src/ledger.ts`, kept in step with `.gitignore`). Their ledger lines are committed; a clone without the files still verifies, and a present file's hash is checked. `youtube frames` and `subs` need `ffmpeg` 5.1 or later and `yt-dlp` on `PATH`.
- **Backfilled lines** say how their time was found in `approx`: `header` (the capture's `- captured:` line), `post` (an image takes its post's time) or `git` (the file's first commit).
- **Hash cache.** Verification hashes every present evidence file and caches each hash in `node_modules/.cache/aion-capture/hashes.json` by absolute path, size and mtime, so later runs rehash only files that changed. Delete the file to force a full rehash.
- **Line endings.** Text under `research/` is stored with LF. A ledger line hashes the bytes git stores, so `pnpm capture log` on a file written with CRLF records its LF hash, unless a `.gitattributes` marks the path `-text` and git keeps its bytes.

The `evidence/` folders hold publicly posted guides and videos, captured for research and citation. Game content and names belong to NCSOFT.
