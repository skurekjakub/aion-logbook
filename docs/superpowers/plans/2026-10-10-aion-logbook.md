# aion-logbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port crumble-logbook to Aion 2 as `aion-logbook`, restyle it in the Aion 2 register, bridge it to the live game client, research and apply the character's skill/stigma/macro build, wire the giga-marketplace agent workspace, and publish it (public GitHub + Vercel).

**Architecture:** A pnpm monorepo (`packages/schema`, `packages/capture`, `packages/game`, `apps/server`, `apps/web`, `tools/eslint-config`, `tools/aion-input`). Research records under `research/NNN-slug/` are imported into SQLite (`node:sqlite` + Drizzle), served by a layered Hono API and a React/TanStack web app; the hosted site is the read-only Vercel build of the committed `data/snapshot.json`. The game bridge reads the client with Windows Graphics Capture (ffmpeg `gfxcapture`) and drives menus with AutoHotkey v2.

**Tech Stack:** Node 24.19, pnpm 12.6, TypeScript 7.0.2 (tsc) + 6.0.3 (eslint), Hono 4.13, Drizzle 1.0.0-beta.22, Zod 4.6, React 19.3, Vite 8.3, TanStack Router 1.170 / Query 5.104, Vitest 4.1, ffmpeg (gfxcapture), AutoHotkey v2.

**Spec:** `docs/superpowers/specs/2026-10-10-aion-logbook-design.md`

**Template repo:** `C:\repositories\crumble-logbook` (read-only; never modify it). Its README, `AGENTS.md` and source are the reference for every ported file.

## Global Constraints

- Node `>=24.18.0`, `packageManager: pnpm@12.6.0`; dependency versions copied exactly from crumble's `package.json` files (TypeScript 7.0.2 for `tsc`, 6.0.3 inside `tools/eslint-config`).
- Package scope `@aion/*`; env vars `AION_DB`, `AION_API`, `PORT`; localStorage key `aion-theme`; db file `data/aion.db`.
- Layering routes → services → repos → db, enforced by `apps/server/test/architecture.test.ts` (ported, with `@aion/` names and `packages/game` added as a pure-I/O package nothing on the server imports).
- JSDoc (TSDoc style) on every function, method, class and interface method; `pnpm verify` (typecheck, eslint `--max-warnings 0`, prettier check, vitest) passes before every commit.
- Commits: `git commit -F <file>`, conventional prefix, body explains why, ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on `main`.
- No enumerating and no gratuitous counting in docs, comments, commit messages (crumble `AGENTS.md` § Key directives).
- Tests label each `it()` body's phases with `// Arrange`, `// Act`, `// Assert` (a genuinely empty phase is omitted; `// Act & Assert` for one-line throw/reject assertions). The plan's test snippets predate this rule; add the labels when writing them.
- UI rules from crumble `AGENTS.md` § "UI: scannable, not prose" carry over verbatim.
- The repo is public: captured media (png/jpg/video) stays local under `research/` and `account/snapshots/screens/` (gitignored); Markdown/JSON captures are committed with ledger lines.
- Game input only drives menus; never during combat; a capture is checked before every next action; no memory reading, no packet capture, no combat macros.
- Game client: `AION2.exe`, 1920×1080 client area at (0,0). AutoHotkey: `C:\Users\skure\AppData\Local\Programs\AutoHotkey\v2\AutoHotkey64.exe`. ffmpeg on PATH has `gfxcapture`.

## Review Focus

- A record whose curated build names a skill id that isn't in its `skills.json`: the import must fail with the record, collection and id named, not insert a dangling row (Task 3, importer test).
- A macro with zero steps, or a duplicate step position: rejected by `macroInput` with a message naming the macro (Task 2, schema test).
- `?class=` with a class that has no content: the list returns `[]`, and the web shows the class absent from the nav rather than an empty section (Task 3 route test, Task 4 nav test).
- `pnpm game shot` while the game isn't running: exits non-zero with "AION2.exe is not running", never writes an empty PNG (Task 6, test with fake runner).
- The Vercel function cold-starting on the committed snapshot after the schema's single migration: `/api/records` and `/api/builds` answer 200 from a snapshot (Task 3 step 6, `vercel.test.ts`; live in Task 11).

---

### Task 1: Port the monorepo skeleton and tooling

**Files:**
- Create (copied from crumble, renamed): `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.ts`, `vitest.config.ts`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.vercelignore`, `vercel.json`, `tools/eslint-config/{index.ts,package.json}`, `packages/capture/**` (minus scrapers), `.claude/hooks/*`, `.claude/settings.json` (merged), `.claude/agents/rubber-duk.md`, `.claude/skills/{deep-research,iterative-research,agent-browser}/**`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `OPEN-QUESTIONS.md`, `todo.md`
- Modify: `.gitattributes` (keep `* text=auto eol=lf`)

**Interfaces:**
- Produces: `@aion/eslint-config` exporting `aionConfig(rootDir: string)`; `@aion/capture` with subcommands `youtube *`, `web fetch <record> <url> <dir>`, `log`, `verify`, `backfill`; root scripts `typecheck`, `test`, `lint`, `format`, `verify`, `dev`, `dev:server`, `dev:web`, `import:record`, `import:account`, `db:export`, `db:restore`, `db:scope`, `build:vercel`, `capture`, `game`.

- [ ] **Step 1: Copy the generic files**

```bash
C=/c/repositories/crumble-logbook; A=/c/repositories/aion-logbook
cd $A
for f in package.json pnpm-workspace.yaml tsconfig.base.json tsconfig.json eslint.config.ts vitest.config.ts .prettierrc.json .prettierignore .gitignore .vercelignore vercel.json AGENTS.md CLAUDE.md; do cp $C/$f $A/$f; done
mkdir -p tools packages .claude
cp -r $C/tools/eslint-config tools/
cp -r $C/packages/capture packages/
cp -r $C/.claude/hooks .claude/; cp -r $C/.claude/agents .claude/
mkdir -p .claude/skills && cp -r $C/.claude/skills/{deep-research,iterative-research,agent-browser} .claude/skills/
```

- [ ] **Step 2: Rename crumble → aion everywhere in the copied files**

```bash
cd /c/repositories/aion-logbook
grep -rlI -e crumble -e Crumble -e CRUMBLE --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs . \
  | xargs sed -i -e 's/@crumble\//@aion\//g' -e 's/crumbleConfig/aionConfig/g' -e 's/CRUMBLE_/AION_/g' -e 's/crumble-logbook/aion-logbook/g' -e 's/crumble\.db/aion.db/g' -e 's/crumble-capture/aion-capture/g'
grep -rnI -i crumble --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs . | head -50
```

Review every remaining hit by hand: game-specific prose (Cookie Run, 배, cookies) is rewritten for Aion 2 or deleted.

- [ ] **Step 3: Prune the capture package to the generic subcommands**

Delete the `dc`, `naver` and `crumbgg` scrapers and their tests/fixtures from `packages/capture/src` and `packages/capture/test` (and `cheerio`/`domhandler` only if nothing else imports them). Add `web fetch <record> <url> <dir>`: GET the URL with `fetch`, convert HTML to Markdown-ish text (strip `script/style/nav/footer`, keep headings, lists, tables, paragraphs), write `<dir>/<slug-of-url>.md` with a front-matter block `url`, `captured_at`, `title`, never overwrite, and append the ledger line with `tool: "capture:web"`. Extend `CAPTURE_TOOL` in the ledger schema (it moves to `packages/schema` in Task 2; until then keep it in `packages/capture/src/ledger.ts`) with `capture:web`.

Test (`packages/capture/test/web.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { htmlToText, slugOfUrl } from "../src/web";

describe("web capture", () => {
  it("keeps headings, list items and table cells, drops scripts", () => {
    const html = `<html><head><title>T</title><script>x()</script></head><body><nav>menu</nav>
      <h2>Stigma</h2><ul><li>Wrath Wave</li></ul><table><tr><td>22</td><td>Rage Burst</td></tr></table></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("## Stigma");
    expect(text).toContain("- Wrath Wave");
    expect(text).toContain("| 22 | Rage Burst |");
    expect(text).not.toContain("x()");
    expect(text).not.toContain("menu");
  });

  it("slugs a URL into a stable file name", () => {
    expect(slugOfUrl("https://eloboost24.eu/blog/aion-2-gladiator-build?x=1")).toBe(
      "eloboost24-eu-blog-aion-2-gladiator-build",
    );
  });
});
```

- [ ] **Step 4: Rewrite the project docs for Aion 2**

- `AGENTS.md`: same structure and every rule that is not crumble-content (pull first, read README and OPEN-QUESTIONS, records/evidence/ledger rules, no enumerating, layering, JSDoc, no auth, public repo, main + worktree lanes, Opus reviews, agent-browser, UI rules). Replace the crumble-content rules ("rank by damage, never by 배", "every deck cookie carries a level") with: "Every build skill carries a target level and a one-line why"; "A macro chain lists its steps in the editor's order and names its key". Add a "Game bridge" rule: capture with `pnpm game shot`, drive with `pnpm game key|click|drag`, menus only, never in combat, read the shot before the next action.
- `README.md`: What's here, Development, Deployment, The database, API, Game bridge, Working notes, Captures — each rewritten from crumble's section for this repo.
- `OPEN-QUESTIONS.md`: the spec's assumptions as questions.
- `todo.md`: In progress / Next / Known gaps, pointing at this plan.
- `.claude/settings.json`: merge crumble's hooks block into the existing `enabledPlugins` file; permissions name `pnpm` (not `npm`): `Bash(pnpm verify)`, `Bash(pnpm test*)`, `Bash(pnpm typecheck)`, `Bash(pnpm lint*)`, `Bash(pnpm game *)`, `Bash(pnpm capture *)`.
- `.claude/agents/rubber-duk.md`: rewritten for this repo (layering, ledger, JSDoc, UI rules), Opus, effort xhigh.

- [ ] **Step 5: Install and verify**

Temporarily point root `vitest.config.ts` projects and `pnpm-workspace.yaml` at what exists (`packages/*`, `tools/eslint-config`). Run:

```bash
pnpm install && pnpm verify
```

Expected: install succeeds; typecheck, lint, format check and the capture tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -F .git/COMMIT_MSG   # "chore: port the crumble-logbook skeleton and tooling"
```

---

### Task 2: Schema — generic tables and the Aion 2 domain

**Files:**
- Create: `packages/schema/{package.json,tsconfig.json,drizzle.config.ts}`, `packages/schema/src/{index.ts,enums.ts,zod.ts,inputs.ts,ledger.ts,obsolete.ts,migrations-path.ts,account.ts}`, `packages/schema/src/tables/{index.ts,columns.ts,records.ts,sources.ts,citations.ts,fact-claims.ts,captures.ts,glossary.ts,findings.ts,recommendations.ts,skills.ts,builds.ts,macros.ts,account.ts}`, `packages/schema/migrations/0000_*.sql` (+ drizzle meta)
- Test: `packages/schema/test/{driver.test.ts,ledger.test.ts,aion-tables.test.ts,inputs.test.ts}`

**Interfaces:**
- Consumes: crumble `packages/schema` generic files (copy, rename, drop domain references).
- Produces (exact names later tasks use): enums `CLASS`, `BUILD_PURPOSE`, `SKILL_KIND`, `CONFIDENCE`, `SOURCE_SITE` (`web|yt`), `CITED_ENTITY` (adds `skill|build|macro`); tables `skills`, `builds`, `buildSkills`, `buildStigmas`, `macros`, `macroSteps`, `accountSnapshots`, `accountSkills`, `accountRoadmapItems`; Zod `skillInput/skillPatch`, `buildInput/buildPatch`, `macroInput/macroPatch`, `accountSnapshotFile` (the `aion-account-snapshot/1` document), `slug`, `sourceId` (`^(web|yt):.+$`), `isoDate`; types `GameClass`, `BuildInput`, `MacroInput`, `AccountSnapshotFile`. `classColumn()` replaces crumble's `modeColumn()`.

- [ ] **Step 1: Copy the generic schema files and strip domain**

Copy `package.json`, `tsconfig.json`, `drizzle.config.ts`, `src/{index,zod,inputs,ledger,obsolete,migrations-path}.ts`, `src/tables/{index,columns,records,sources,citations,fact-claims,captures,glossary,findings,recommendations}.ts`, `test/{driver,ledger}.test.ts`. In `inputs.ts` and `zod.ts` keep only generic inputs (records, sources, glossary, findings: mechanics/timeline/takeaways/rng factors, recommendations, captures). `records.ts`: `record_modes` becomes `record_classes` (`recordSlug`, `class`). Remove every import of a deleted module; `pnpm --filter @aion/schema typecheck` must pass before Step 2.

- [ ] **Step 2: Write the enums and column helper**

`packages/schema/src/enums.ts` (generic enums kept from crumble, plus):

```ts
/** The playable classes of Aion 2, as the global client names them. */
export const CLASS = [
  "gladiator",
  "templar",
  "assassin",
  "ranger",
  "sorcerer",
  "spiritmaster",
  "cleric",
  "chanter",
] as const;
/** One of {@link CLASS}. */
export type GameClass = (typeof CLASS)[number];

/** What a build is for. */
export const BUILD_PURPOSE = ["leveling", "pve", "pvp"] as const;
/** One of {@link BUILD_PURPOSE}. */
export type BuildPurpose = (typeof BUILD_PURPOSE)[number];

/** How a skill is used: pressed, always on, or slotted as a stigma. */
export const SKILL_KIND = ["active", "passive", "stigma"] as const;

/** How well a recommendation is backed: measured, posted by players, or read from skill data. */
export const CONFIDENCE = ["tested", "posted", "theory"] as const;

/** Where a source lives: a web page or a YouTube video. */
export const SOURCE_SITE = ["web", "yt"] as const;
```

`packages/schema/src/tables/columns.ts` — replace `modeColumn` with:

```ts
/**
 * Builds a `class` column: the Aion 2 class a row is about.
 *
 * @returns a NOT NULL `CLASS` column
 */
export function classColumn() {
  return text("class", { enum: CLASS }).notNull();
}
```

- [ ] **Step 3: Write the failing table test**

`packages/schema/test/aion-tables.test.ts`:

```ts
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { MIGRATIONS_FOLDER } from "../src/migrations-path";
import { buildSkills, buildStigmas, builds, macroSteps, macros, skills } from "../src";

/** Opens a migrated in-memory database. @returns the drizzle handle */
function openDb() {
  const db = drizzle({ client: new DatabaseSync(":memory:") });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

describe("aion tables", () => {
  it("round-trips a build with its skills, stigmas and a macro chain", () => {
    const db = openDb();
    db.insert(skills).values([
      { id: "gladiator-ruinous-blow", class: "gladiator", name: "Ruinous Blow", kind: "active", unlockLevel: 10, recordSlug: "001-x" },
      { id: "gladiator-wrath-wave", class: "gladiator", name: "Wrath Wave", kind: "stigma", unlockLevel: 22, recordSlug: "001-x" },
    ]).run();
    db.insert(builds).values({ id: "gladiator-leveling", class: "gladiator", purpose: "leveling", title: "Leveling", why: "Fast clears", confidence: "theory", recordSlug: "001-x" }).run();
    db.insert(buildSkills).values({ buildId: "gladiator-leveling", skillId: "gladiator-ruinous-blow", rank: 1, targetLevel: 10, why: "Main nuke" }).run();
    db.insert(buildStigmas).values({ buildId: "gladiator-leveling", slotLevel: 22, skillId: "gladiator-wrath-wave", why: "AoE" }).run();
    db.insert(macros).values({ id: "gladiator-leveling-main", buildId: "gladiator-leveling", name: "Main", key: "R", delayMs: 10, why: "One key" }).run();
    db.insert(macroSteps).values({ macroId: "gladiator-leveling-main", position: 1, skillId: "gladiator-ruinous-blow" }).run();

    const steps = db.select().from(macroSteps).where(eq(macroSteps.macroId, "gladiator-leveling-main")).all();
    expect(steps).toHaveLength(1);
    expect(db.select().from(buildStigmas).all()[0]?.slotLevel).toBe(22);
  });

  it("cascades a build's children when the build is deleted", () => {
    const db = openDb();
    db.insert(skills).values({ id: "s", class: "chanter", name: "S", kind: "active", unlockLevel: 1 }).run();
    db.insert(builds).values({ id: "b", class: "chanter", purpose: "pve", title: "B", why: "w", confidence: "theory" }).run();
    db.insert(buildSkills).values({ buildId: "b", skillId: "s", rank: 1, targetLevel: 5, why: "w" }).run();
    db.delete(builds).where(eq(builds.id, "b")).run();
    expect(db.select().from(buildSkills).all()).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Run it to make sure it fails**

Run: `pnpm --filter @aion/schema exec vitest run test/aion-tables.test.ts`
Expected: FAIL — `skills` is not exported.

- [ ] **Step 5: Write the tables**

`packages/schema/src/tables/skills.ts`:

```ts
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { SKILL_KIND } from "../enums";
import { classColumn, recordSlugColumn } from "./columns";

/**
 * A class skill as the global client names it. `id` is `<class>-<slug of the name>`;
 * `unlockLevel` is the character level that grants it; stigmas are skills
 * of kind `stigma`.
 */
export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  class: classColumn(),
  name: text("name").notNull(),
  nameKr: text("name_kr"),
  kind: text("kind", { enum: SKILL_KIND }).notNull(),
  unlockLevel: integer("unlock_level").notNull(),
  cooldownSec: real("cooldown_sec"),
  summary: text("summary"),
  recordSlug: recordSlugColumn(),
});
```

`packages/schema/src/tables/builds.ts`:

```ts
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { BUILD_PURPOSE, CONFIDENCE } from "../enums";
import { classColumn, obsoleteColumns, recordSlugColumn } from "./columns";
import { skills } from "./skills";

/** A recommended setup for one class and purpose: skill priorities, stigmas and macro chains. */
export const builds = sqliteTable("builds", {
  id: text("id").primaryKey(),
  class: classColumn(),
  purpose: text("purpose", { enum: BUILD_PURPOSE }).notNull(),
  title: text("title").notNull(),
  why: text("why").notNull(),
  confidence: text("confidence", { enum: CONFIDENCE }).notNull(),
  position: integer("position").notNull().default(0),
  recordSlug: recordSlugColumn(),
  ...obsoleteColumns(),
});

/** A skill's place in a build's level-up priority: `rank` 1 is levelled first, up to `targetLevel`. */
export const buildSkills = sqliteTable(
  "build_skills",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    buildId: text("build_id").notNull().references(() => builds.id, { onDelete: "cascade" }),
    skillId: text("skill_id").notNull().references(() => skills.id),
    rank: integer("rank").notNull(),
    targetLevel: integer("target_level").notNull(),
    why: text("why").notNull(),
  },
  (t) => [unique("build_skills_rank").on(t.buildId, t.rank)],
);

/** The stigma a build slots in the slot that unlocks at `slotLevel`. */
export const buildStigmas = sqliteTable(
  "build_stigmas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    buildId: text("build_id").notNull().references(() => builds.id, { onDelete: "cascade" }),
    slotLevel: integer("slot_level").notNull(),
    skillId: text("skill_id").notNull().references(() => skills.id),
    why: text("why").notNull(),
  },
  (t) => [unique("build_stigmas_slot").on(t.buildId, t.slotLevel)],
);
```

`packages/schema/src/tables/macros.ts`:

```ts
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { builds } from "./builds";
import { skills } from "./skills";

/** One chain in the game's built-in macro editor, bound to `key`, with the editor's step delay. */
export const macros = sqliteTable("macros", {
  id: text("id").primaryKey(),
  buildId: text("build_id").notNull().references(() => builds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  key: text("key").notNull(),
  delayMs: integer("delay_ms").notNull(),
  why: text("why").notNull(),
});

/** A step of a macro chain; `position` 1 is the editor's first slot. */
export const macroSteps = sqliteTable(
  "macro_steps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    macroId: text("macro_id").notNull().references(() => macros.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    skillId: text("skill_id").notNull().references(() => skills.id),
    note: text("note"),
  },
  (t) => [unique("macro_steps_position").on(t.macroId, t.position)],
);
```

`packages/schema/src/tables/account.ts`:

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { classColumn } from "./columns";

/** The character as read from the live client on one day (`id` is the `YYYY-MM-DD` snapshot date). */
export const accountSnapshots = sqliteTable("account_snapshots", {
  id: text("id").primaryKey(),
  capturedAt: text("captured_at").notNull(),
  character: text("character").notNull(),
  class: classColumn(),
  level: integer("level").notNull(),
  gearScore: integer("gear_score"),
  server: text("server"),
  unread: text("unread", { mode: "json" }).$type<string[]>().notNull(),
});

/** A skill's level and hotbar slot in a snapshot; `skillName` is as read, `skillId` when it resolved. */
export const accountSkills = sqliteTable("account_skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  snapshotId: text("snapshot_id").notNull().references(() => accountSnapshots.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  skillId: text("skill_id"),
  level: integer("level"),
  slot: text("slot"),
});

/** A next action for the character, ranked, against the research. */
export const accountRoadmapItems = sqliteTable("account_roadmap_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  snapshotId: text("snapshot_id").notNull().references(() => accountSnapshots.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  priority: text("priority", { enum: ["now", "next", "later"] }).notNull(),
  area: text("area").notNull(),
  action: text("action").notNull(),
  why: text("why").notNull(),
  refs: text("refs", { mode: "json" }).$type<{ record: string; id?: string }[]>().notNull(),
});
```

Export all from `tables/index.ts`. Generate the single initial migration: `pnpm --filter @aion/schema exec drizzle-kit generate --name init`.

- [ ] **Step 6: Run the table test**

Run: `pnpm --filter @aion/schema exec vitest run test/aion-tables.test.ts` — Expected: PASS.

- [ ] **Step 7: Write the failing input test**

`packages/schema/test/inputs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { accountSnapshotFile, buildInput, macroInput } from "../src";

const macro = { id: "m", name: "Main", key: "R", delayMs: 10, why: "w", steps: [{ skillId: "a" }, { skillId: "b" }] };

describe("aion inputs", () => {
  it("numbers macro steps in the given order", () => {
    const parsed = macroInput.parse(macro);
    expect(parsed.steps.map((s) => s.position)).toEqual([1, 2]);
  });

  it("rejects a macro with no steps, naming it", () => {
    const result = macroInput.safeParse({ ...macro, steps: [] });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("macro m has no steps");
  });

  it("rejects a build whose skill ranks repeat", () => {
    const result = buildInput.safeParse({
      id: "b", class: "gladiator", purpose: "pve", title: "T", why: "w", confidence: "theory",
      skills: [{ skillId: "a", rank: 1, targetLevel: 5, why: "w" }, { skillId: "b", rank: 1, targetLevel: 5, why: "w" }],
      stigmas: [], macros: [], sources: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal account snapshot document", () => {
    const doc = { schema: "aion-account-snapshot/1", capturedAt: "2026-10-10T08:00:00+02:00", character: { name: "Baon", class: "gladiator", level: 34, gearScore: 615, server: null }, skills: [], stigmas: [], macros: [], screens: [], unread: ["server"] };
    expect(accountSnapshotFile.parse(doc).character.level).toBe(34);
  });
});
```

- [ ] **Step 8: Run it to make sure it fails** — `pnpm --filter @aion/schema exec vitest run test/inputs.test.ts` — Expected: FAIL (not exported).

- [ ] **Step 9: Write the inputs**

Append to `packages/schema/src/inputs.ts`:

```ts
/** A lowercase, hyphen-separated id. */
export const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "expected a lowercase slug");

/** Input for a skill. */
export const skillInput = z.object({
  id: slug,
  class: z.enum(CLASS),
  name: z.string().min(1),
  nameKr: z.string().min(1).nullish(),
  kind: z.enum(SKILL_KIND),
  unlockLevel: z.number().int().min(1),
  cooldownSec: z.number().nonnegative().nullish(),
  summary: z.string().min(1).nullish(),
  sources: z.array(sourceId).default([]),
});
/** Patch for a skill. */
export const skillPatch = skillInput.omit({ id: true }).partial();

/** A step of a macro chain as curated: positions are assigned from the list order. */
const macroStepInput = z.object({ skillId: slug, note: z.string().min(1).nullish() });

/** Input for a macro chain; `steps` are in the editor's order, top first. */
export const macroInput = z
  .object({
    id: slug,
    name: z.string().min(1),
    key: z.string().min(1),
    delayMs: z.number().int().min(0),
    why: z.string().min(1),
    steps: z.array(macroStepInput),
  })
  .superRefine((m, ctx) => {
    if (m.steps.length === 0) ctx.addIssue({ code: "custom", message: `macro ${m.id} has no steps`, path: ["steps"] });
  })
  .transform((m) => ({ ...m, steps: m.steps.map((s, i) => ({ ...s, position: i + 1 })) }));
/** Output of {@link macroInput}. */
export type MacroInput = z.output<typeof macroInput>;
/** Patch for a macro chain's own fields. */
export const macroPatch = z.object({ name: z.string().min(1), key: z.string().min(1), delayMs: z.number().int().min(0), why: z.string().min(1) }).partial();

/** Input for a build with its skill priorities, stigmas and macro chains. */
export const buildInput = z
  .object({
    id: slug,
    class: z.enum(CLASS),
    purpose: z.enum(BUILD_PURPOSE),
    title: z.string().min(1),
    why: z.string().min(1),
    confidence: z.enum(CONFIDENCE),
    skills: z.array(z.object({ skillId: slug, rank: z.number().int().min(1), targetLevel: z.number().int().min(1), why: z.string().min(1) })),
    stigmas: z.array(z.object({ slotLevel: z.number().int().min(1), skillId: slug, why: z.string().min(1) })),
    macros: z.array(macroInput),
    sources: z.array(sourceId).default([]),
  })
  .superRefine((b, ctx) => {
    const ranks = b.skills.map((s) => s.rank);
    if (new Set(ranks).size !== ranks.length) ctx.addIssue({ code: "custom", message: `build ${b.id} repeats a skill rank`, path: ["skills"] });
    const slots = b.stigmas.map((s) => s.slotLevel);
    if (new Set(slots).size !== slots.length) ctx.addIssue({ code: "custom", message: `build ${b.id} fills a stigma slot twice`, path: ["stigmas"] });
  });
/** Output of {@link buildInput}. */
export type BuildInput = z.output<typeof buildInput>;
/** Patch for a build's own fields. */
export const buildPatch = z.object({ title: z.string().min(1), why: z.string().min(1), confidence: z.enum(CONFIDENCE) }).partial();
```

`packages/schema/src/account.ts`:

```ts
import { z } from "zod";
import { CLASS } from "./enums";
import { isoDateTime } from "./ledger";

/** The `aion-account-snapshot/1` document: the character as the agent read it from the client. */
export const accountSnapshotFile = z.object({
  schema: z.literal("aion-account-snapshot/1"),
  capturedAt: isoDateTime,
  character: z.object({
    name: z.string().min(1),
    class: z.enum(CLASS),
    level: z.number().int().min(1),
    gearScore: z.number().int().nullable(),
    server: z.string().min(1).nullable(),
  }),
  skills: z.array(z.object({ name: z.string().min(1), level: z.number().int().nullable(), slot: z.string().nullable() })),
  stigmas: z.array(z.object({ slotLevel: z.number().int(), name: z.string().min(1).nullable() })),
  macros: z.array(z.object({ name: z.string().min(1), key: z.string().nullable(), steps: z.array(z.string().min(1)) })),
  screens: z.array(z.string().min(1)),
  unread: z.array(z.string().min(1)),
});
/** Output of {@link accountSnapshotFile}. */
export type AccountSnapshotFile = z.output<typeof accountSnapshotFile>;
```

- [ ] **Step 10: Run the schema package** — `pnpm --filter @aion/schema exec vitest run` — Expected: PASS. Then `pnpm verify` — PASS.

- [ ] **Step 11: Commit** — `feat(schema): the generic tables and the Aion 2 build domain`.

---

### Task 3: Server — registry, layers, importer, CLI, Vercel entry

**Files:**
- Create (ported from crumble `apps/server`, domain removed): `apps/server/{package.json,tsconfig.json}`, `src/{app.ts,config.ts,errors.ts,main.ts,vercel.ts,registry.ts}`, `src/db/client.ts`, `src/repos/{index,table-repo,tables,records,sources,citations,fact-claims,glossary,captures,sequence,builds,account}.ts`, `src/services/{index,content,filters,records,sources,citations,glossary,captures,export,snapshot-drift,snapshot-scope,names,builds,account}.ts`, `src/routes/{content,records,sources,glossary,captures,export,account,builds,validate}.ts`, `src/importers/{manifest,read-record,write-record,import-record,captures,ledger,extractions,files,collection-kit,collections,shared,shared-facts,steps,account}.ts`, `src/cli/{import-record,import-account,export,restore,snapshot-scope,build-vercel}.ts`
- Test: `apps/server/test/{architecture,registry,ledger,snapshot-drift,builds.routes,import-record,import-account,vercel}.test.ts`, fixture `apps/server/test/fixtures/records/900-fixture/**`

**Interfaces:**
- Consumes: Task 2 exports.
- Produces: `AppType` (Hono app type for the web's `hc` client); endpoints `GET /api/{records,sources,glossary,captures,export,account,skills,builds,builds/:id,macros}` and the registry CRUD for `skills`, `builds`, `macros`, `mechanics`, `timeline`, `takeaways`, `recommendations`; list filters `?class=`, `?current=`, `?record=`, `?purpose=` (builds); `GET /api/builds/:id` returns `{ ...build, skills: [{ rank, targetLevel, why, skill }], stigmas: [{ slotLevel, why, skill }], macros: [{ ..., steps: [{ position, note, skill }] }], sources }`; CLI scripts as in Task 1.

- [ ] **Step 1: Port the generic server**

Copy crumble `apps/server` wholesale, then delete every file whose subject is a crumble domain (decks, rune builds, gear, scores, counters, rankings/usage, fight events, buff values, stage/rift, dungeon, daily dungeons, team power, crumble account) and its tests. Rewrite `registry.ts` to the generic entries (`sources`, `researchRecords`, `recordClasses`, `captures`, `glossary`, `mechanics`, `rngFactors`, `timeline`, `takeaways`, `recommendations`, `citations`, `factClaims`) plus:

```ts
  skills: entry(skills, {
    path: "/skills",
    entity: "skill",
    filters: { kind: { schema: z.enum(SKILL_KIND), match: { equals: "kind" } } },
    api: { id: slug, input: skillInput, patch: skillPatch },
    content: { order: ["class", "unlockLevel", "id"] },
  }),
  builds: entry(builds, {
    path: "/builds",
    entity: "build",
    filters: { purpose: { schema: z.enum(BUILD_PURPOSE), match: { equals: "purpose" } } },
    api: { id: slug, input: buildInput, patch: buildPatch },
  }),
  buildSkills: entry(buildSkills, {}),
  buildStigmas: entry(buildStigmas, {}),
  macros: entry(macros, { path: "/macros", entity: "macro", api: { id: slug, input: macroInput, patch: macroPatch } }),
  macroSteps: entry(macroSteps, {}),
  accountSnapshots: entry(accountSnapshots, {}),
  accountSkills: entry(accountSkills, {}),
  accountRoadmapItems: entry(accountRoadmapItems, {}),
```

The `modeFilter` becomes `classFilter = { schema: z.enum(CLASS), match: { equals: "class" } }`, applied automatically to every table with a `class` column. Builds follow the decks pattern: `repos/builds.ts` inserts a build with its children in one transaction and reads them back nested; `services/builds.ts` checks every referenced skill id exists (422 `UnknownRefsError` naming the ids); `routes/builds.ts` mounts list/detail/create/patch/delete.

- [ ] **Step 2: Write the failing route test**

`apps/server/test/builds.routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeTestApp } from "./helpers";

const build = {
  id: "gladiator-leveling", class: "gladiator", purpose: "leveling", title: "Leveling", why: "w", confidence: "theory",
  skills: [{ skillId: "gladiator-ruinous-blow", rank: 1, targetLevel: 10, why: "w" }],
  stigmas: [{ slotLevel: 22, skillId: "gladiator-wrath-wave", why: "w" }],
  macros: [{ id: "gladiator-leveling-main", name: "Main", key: "R", delayMs: 10, why: "w", steps: [{ skillId: "gladiator-ruinous-blow" }] }],
};

describe("/api/builds", () => {
  it("creates a build and returns it nested", async () => {
    const app = makeTestApp();
    for (const s of [
      { id: "gladiator-ruinous-blow", class: "gladiator", name: "Ruinous Blow", kind: "active", unlockLevel: 10 },
      { id: "gladiator-wrath-wave", class: "gladiator", name: "Wrath Wave", kind: "stigma", unlockLevel: 22 },
    ]) expect((await app.request("/api/skills", { method: "POST", body: JSON.stringify(s), headers: { "content-type": "application/json" } })).status).toBe(201);
    expect((await app.request("/api/builds", { method: "POST", body: JSON.stringify(build), headers: { "content-type": "application/json" } })).status).toBe(201);
    const got = await (await app.request("/api/builds/gladiator-leveling")).json();
    expect(got.macros[0].steps[0].skill.name).toBe("Ruinous Blow");
    expect(got.stigmas[0].slotLevel).toBe(22);
  });

  it("422s a build naming an unknown skill", async () => {
    const app = makeTestApp();
    const res = await app.request("/api/builds", { method: "POST", body: JSON.stringify(build), headers: { "content-type": "application/json" } });
    expect(res.status).toBe(422);
    expect(JSON.stringify(await res.json())).toContain("gladiator-ruinous-blow");
  });

  it("returns [] for a class with no builds", async () => {
    const app = makeTestApp();
    expect(await (await app.request("/api/builds?class=cleric")).json()).toEqual([]);
  });
});
```

(`helpers.ts` is ported from crumble's test helpers: an app over a migrated `:memory:` db.)

- [ ] **Step 3: Run it, see it fail; implement; run it, see it pass**

Run: `pnpm --filter @aion/server exec vitest run test/builds.routes.test.ts`.

- [ ] **Step 4: Port and adapt the importer**

`import.json` (strict): `record{slug, question, status, startedAt, classes: CLASS[]}`, `curated` folder, `extractions` (optional), `ledger{file}`. `curated/manifest.json` collections: `meta`, `sources`, `glossary`, `skills`, `builds`, `mechanics`, `timeline`, `takeaways`, `recommendations`. `builds.json` items use `buildInput`; skills in builds/macros must resolve to the record's `skills.json` or an already-imported skill, else `ImportError` "record <slug>: builds[<id>] names unknown skill <id>".

Fixture record `apps/server/test/fixtures/records/900-fixture/` with a minimal `import.json`, `curated/{manifest,meta,sources,skills,builds}.json`, `evidence/captures.jsonl` (empty), and `import-record.test.ts` asserting: a clean import writes the build nested; a builds.json naming an unknown skill fails with that message; `--replace` clears and rewrites only that record's rows.

- [ ] **Step 5: Account importer**

`pnpm import:account [file] [--replace]` reads `account/snapshots/YYYY-MM-DD.json` (`accountSnapshotFile`) and `account/roadmap-YYYY-MM-DD.json` when present; resolves each skill name to a `skills.id` by `(class, lower(name))`; unresolved names keep `skillId: null`. Test with a fixture snapshot.

- [ ] **Step 6: Architecture, snapshot and Vercel**

Port `architecture.test.ts` with `@aion/` names and a rule that nothing in `apps/server/src` imports `@aion/game`. Port `vercel.ts` and `cli/build-vercel.ts` unchanged except names. `vercel.test.ts`: seed an in-memory db from a small snapshot built in the test (export after importing the fixture record) and assert `GET /api/records` and `GET /api/builds` answer 200 through the Vercel handler.

- [ ] **Step 7: Verify and commit** — `pnpm verify` PASS; commit `feat(server): the layered API, importer and Vercel entry for builds`.

---

### Task 4: Web — shell, class sections and views

**Files:**
- Create (ported, domain removed): `apps/web/{index.html,package.json,tsconfig.json,vite.config.ts,vitest.config.ts}`, `src/{main.tsx,router.tsx}`, `src/api/{client,hooks,queries,types}.ts`, `src/app/classes/{index,types,links,shared}.ts`, `src/components/{DataTable,EmptyState,ErrorBox,Kv,Pill,ConfidencePill,Clamp,PageHeader,ViewHeader,SideNav,TopBar,TocLayout,SourceChips,CaptureStamp,QueryResult,Placeholder,ObsoleteNotice,ObsoleteSection,ThemeToggle,SkillChip,MacroChain,StigmaSlots}.tsx`, `src/lib/{format,sources,captures,obsolete,search,verdict,builds}.ts`, `src/routes/{__root,index,account,research,research_.$slug.captures,sources,glossary,$class,$class/index,$class/skills,$class/stigmas,$class/macros}.tsx`, `src/views/{HomeView,AccountView,AccountRoadmap,ResearchView,CapturesView,SourcesView,GlossaryView,ClassOverview,SkillsView,StigmasView,MacrosView,MechanicsView}.tsx`, `src/styles/{tokens,base,components,shell,ui,shared-pages,builds,account}.css`
- Test: `apps/web/test/{nav,skills-view,macros-view,stigmas-view,home,theme}.test.tsx`

**Interfaces:**
- Consumes: `AppType` from `@aion/server` (types only); endpoints from Task 3.
- Produces: `CLASS_SECTIONS` (one `ClassSection` per class with a `recordSlug` when content exists), `classSectionsWithContent(records): ClassSection[]`, components `SkillChip({ skill, level? })`, `MacroChain({ macro })`, `StigmaSlots({ stigmas, unlockedTo? })`.

- [ ] **Step 1: Port the shell and generic components** (copy, rename, delete crumble domain views/components/routes/lib/CSS; `$mode` → `$class`; `MODES` → `CLASS_SECTIONS`; `resolveMode` → `resolveClass`; theme key `aion-theme`).

- [ ] **Step 2: Write the failing view tests**

`apps/web/test/macros-view.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MacroChain } from "../src/components/MacroChain";

describe("MacroChain", () => {
  it("shows the key, the delay and the steps in editor order", () => {
    render(
      <MacroChain
        macro={{ id: "m", name: "Main", key: "R", delayMs: 10, why: "One key for the rotation", steps: [
          { position: 1, note: null, skill: { id: "a", name: "Ruinous Blow" } },
          { position: 2, note: "only on cooldown", skill: { id: "b", name: "Wrath Wave" } },
        ] }}
      />,
    );
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.getByText("10 ms")).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(steps[0]).toContain("Ruinous Blow");
    expect(steps[1]).toContain("Wrath Wave");
  });
});
```

`apps/web/test/nav.test.tsx`: renders `SideNav` with records covering only `gladiator`; asserts a "Gladiator" link exists with an active state on `/gladiator/skills` and that "Cleric" is absent.

`apps/web/test/stigmas-view.test.tsx`: `StigmaSlots` with slots 22/27/32/37 and `unlockedTo: 34` shows the 37 slot as locked (an icon with accessible name "locked at 37").

`apps/web/test/skills-view.test.tsx`: `SkillsView` lists build skills by rank with target-level badges; a skill the account snapshot has below target shows a "level up" badge.

- [ ] **Step 3: Run, fail; implement components/views/routes; run, pass**

Run: `pnpm --filter @aion/web exec vitest run`.

- [ ] **Step 4: Check every screen in agent-browser** (headed, `AGENT_BROWSER_EXECUTABLE_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"`, `AGENT_BROWSER_SESSION=aion`), at desktop and phone width, light and dark, with `pnpm dev` on the fixture data.

- [ ] **Step 5: Verify and commit** — `feat(web): the class sections, build views and shared pages`.

---

### Task 5: The Aion 2 look (frontend-design)

**Files:**
- Modify: `apps/web/src/styles/*.css`, `apps/web/index.html` (fonts), `apps/web/src/components/{TopBar,SideNav,PageHeader}.tsx`, `apps/web/public/favicon.svg`
- Create: `docs/design/2026-10-10-aion-look.md` (the design plan the skill produces: palette, type, layout, principles, what was revised and why)
- Test: `apps/web/test/theme.test.tsx`

- [ ] **Step 1: Invoke `frontend-design:frontend-design`** and follow it: design plan first (4–6 named hex colours per theme, typefaces and roles, layout concept with ASCII wireframes, principles), review it against the brief in the spec § 2 and against the generic-default traits the skill lists, revise, write it to `docs/design/2026-10-10-aion-look.md`.
- [ ] **Step 2: Reference the client:** capture the HUD and the skill window with `pnpm game shot` (or the scratch capture until Task 6 lands) and sample colours from the PNGs (ffmpeg `crop` + a pixel dump) so the palette is grounded in the game, not guessed.
- [ ] **Step 3: Write the failing theme test** — `theme.test.tsx`: `ThemeToggle` cycles system → light → dark, sets `data-theme` on `<html>`, persists `aion-theme`; a pre-paint inline script in `index.html` applies the stored theme before React mounts (assert the script exists in `index.html` and sets `data-theme`).
- [ ] **Step 4: Implement tokens and sheets**, keeping light and dark, phone width with 16px gutters, visible focus, reduced motion; one memorable element only.
- [ ] **Step 5: Screenshot every screen** in agent-browser (both themes, desktop + phone) and critique against the design plan; fix; re-shoot.
- [ ] **Step 6: Verify and commit** — `feat(web): the Aion 2 look`.

---

### Task 6: Game bridge — capture and input

**Files:**
- Create: `packages/game/{package.json,tsconfig.json}`, `packages/game/src/{cli.ts,capture.ts,input.ts,paths.ts,runner.ts}`, `tools/aion-input/{aion.ahk,README.md}`
- Test: `packages/game/test/{capture,input}.test.ts`

**Interfaces:**
- Produces: `pnpm game shot <name>` → prints the PNG path; `pnpm game crop <name> <x> <y> <w> <h> [--scale n]`; `pnpm game key <keys>`, `click <x> <y>`, `rclick <x> <y>`, `drag <x1> <y1> <x2> <y2>`, `scroll <x> <y> <n>`, `focus`, `back` — each input command then takes a shot named `<n>-after-<verb>` and prints its path. Functions `captureArgs(outPath: string): string[]`, `ahkArgs(verb: InputVerb, args: string[]): string[]`, `screenPath(root: string, date: string, name: string): string`, `isGameRunning(run: Runner): Promise<boolean>`.

- [ ] **Step 1: Write the failing tests**

`packages/game/test/capture.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { captureArgs, screenPath, shot } from "../src/capture";
import type { Runner } from "../src/runner";

describe("capture", () => {
  it("captures the AION2 window through gfxcapture, without the cursor", () => {
    expect(captureArgs("out.png")).toEqual([
      "-hide_banner", "-loglevel", "error", "-y",
      "-filter_complex", "gfxcapture=window_exe=AION2.exe:capture_cursor=0,hwdownload,format=bgra",
      "-frames:v", "1", "out.png",
    ]);
  });

  it("files a shot under the day's screens folder", () => {
    expect(screenPath("/r", "2026-10-10", "skills")).toBe("/r/account/snapshots/screens/2026-10-10/skills.png");
  });

  it("refuses to shoot when the game isn't running", async () => {
    const run: Runner = async () => ({ code: 0, stdout: "INFO: No tasks are running" });
    await expect(shot({ root: "/r", date: "2026-10-10", name: "x", run })).rejects.toThrow("AION2.exe is not running");
  });
});
```

`packages/game/test/input.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ahkArgs } from "../src/input";

describe("input", () => {
  it("passes the verb and its arguments to aion.ahk", () => {
    expect(ahkArgs("click", ["960", "540"]).slice(-3)).toEqual(["click", "960", "540"]);
  });
  it("rejects a click outside the 1920×1080 client", () => {
    expect(() => ahkArgs("click", ["1921", "10"])).toThrow("outside the client");
  });
});
```

- [ ] **Step 2: Run, fail** — `pnpm --filter @aion/game exec vitest run`.

- [ ] **Step 3: Implement**

`packages/game/src/runner.ts`: `export type Runner = (cmd: string, args: string[]) => Promise<{ code: number; stdout: string }>;` and `nodeRunner` via `node:child_process` `execFile`.
`capture.ts`: `isGameRunning` runs `tasklist /FI "IMAGENAME eq AION2.exe" /NH` and checks for `AION2.exe`; `shot` checks it, mkdirs, runs ffmpeg with `captureArgs`, then verifies the PNG exists and is > 10 kB (else throws "capture came back empty").
`input.ts`: `ahkArgs(verb, args)` → `[AHK_SCRIPT, verb, ...args]`, validating numeric coordinates within 0–1919 / 0–1079.
`tools/aion-input/aion.ahk` (AutoHotkey v2):

```ahk
#Requires AutoHotkey v2.0
#SingleInstance Off
; aion.ahk <verb> [args]: focus | back | key <keys> | click x y | rclick x y | drag x1 y1 x2 y2 | scroll x y n
SendMode "Event"
SetKeyDelay 60, 50
SetMouseDelay 20
CoordMode "Mouse", "Client"
if !WinExist("ahk_exe AION2.exe")
    ExitApp 2
verb := A_Args.Length ? A_Args[1] : "focus"
if (verb = "back") {
    Send "!{Tab}"
    ExitApp 0
}
WinActivate "ahk_exe AION2.exe"
if !WinWaitActive("ahk_exe AION2.exe", , 3)
    ExitApp 3
Sleep Random(150, 300)
Pause() => Sleep(Random(80, 200))
MoveTo(x, y) => MouseMove(x + Random(-2, 2), y + Random(-2, 2), Random(6, 12))
switch verb {
    case "focus":
    case "key":
        Send A_Args[2]
    case "click":
        MoveTo(A_Args[2], A_Args[3]), Pause(), Click()
    case "rclick":
        MoveTo(A_Args[2], A_Args[3]), Pause(), Click("Right")
    case "drag":
        MoveTo(A_Args[2], A_Args[3]), Pause(), Click("Down"), Pause()
        MouseMove(A_Args[4], A_Args[5], Random(15, 25)), Pause(), Click("Up")
    case "scroll":
        MoveTo(A_Args[2], A_Args[3]), Pause()
        Loop Abs(Integer(A_Args[4]))
            Click(Integer(A_Args[4]) > 0 ? "WheelUp" : "WheelDown"), Pause()
    default:
        ExitApp 4
}
Sleep Random(400, 700)
ExitApp 0
```

- [ ] **Step 4: Run, pass**; live check: `pnpm game shot probe` writes a 1920×1080 PNG; `pnpm game key "{Esc}"` returns 0 and its after-shot exists.
- [ ] **Step 5: The repeatable-workflow skill.** Create `.claude/skills/aion-game/SKILL.md` (frontmatter `name: aion-game`, a description that triggers on "read my character", "audit my account", "apply the build", "set up skills/stigmas/macros", "drive the game") documenting: preconditions (game running, out of combat, solo, safe zone), the commands (`pnpm game shot|crop|key|click|rclick|drag|scroll|focus|back`), the read-one-window loop (open → shot → crop/read → close), the window map (`references/windows.md`: each window's hotkey and the client coordinates of its tabs, buttons and slots, filled in as Tasks 7 and 9 discover them), the apply loop (one action → shot → check → next), the stop rules, and where outputs go (`account/snapshots/…`, `account/apply-log-…`). Add `tools/aion-input/README.md` pointing at it.
- [ ] **Step 6: Verify and commit** — `feat(game): read the client by window capture and drive menus through AutoHotkey`.

---

### Task 7: Read the character into an account snapshot (live)

**Files:**
- Create: `account/README.md`, `account/snapshots/2026-10-10.json`, `account/snapshots/screens/2026-10-10/*.png` (gitignored)

- [ ] **Step 1:** Confirm the character is out of combat and solo (shot of the HUD: no target frame, no party frame). If in combat, wait and re-shoot; never send input during combat.
- [ ] **Step 2:** Open, shoot and close, one at a time: character info, the skill window (every tab, scrolling), the stigma panel, the macro editor, Settings > Key Settings > Gameplay > Macro. Discover each window's key from the HUD's key hints (top-right icons carry their letters: G, H, U, I, K, J); fall back to the menu button. Crop and upscale text regions (`pnpm game crop … --scale 2`) for reading.
- [ ] **Step 3:** Write `account/snapshots/2026-10-10.json` (`aion-account-snapshot/1`): name, class, level, gear score, server, every skill with level and hotbar slot, stigmas per slot, existing macros, `screens[]`, `unread[]` for anything not read. Validate with `accountSnapshotFile`.
- [ ] **Step 4:** `account/README.md`: how the audit is read (commands, windows, safety rules). Record every window hotkey and coordinate found into `.claude/skills/aion-game/references/windows.md`.
- [ ] **Step 5:** `pnpm import:account account/snapshots/2026-10-10.json` succeeds. Commit `account: the 2026-10-10 snapshot of the character`.

---

### Task 8: Research record 001 — the class build

**Files:**
- Create: `research/001-<class>-build/{README.md,import.json,searches.json,research-trail.md}`, `curated/{manifest,meta,sources,glossary,skills,builds,mechanics,takeaways,timeline}.json`, `evidence/**` with `evidence/captures.jsonl`

- [ ] **Step 1:** Follow `.claude/skills/deep-research/SKILL.md` (and `research-planning:iterative-research` for the search rounds). Question: "What skill levels, stigmas and built-in macro chains should a level-34 <class> on the global client run, for leveling and PvE, and how is the built-in macro editor's priority ordered?"
- [ ] **Step 2:** Capture every guide used with `pnpm capture web fetch 001-<class>-build <url> evidence/01-guides` (ledger lines written by the tool); YouTube guides through `pnpm capture youtube subs`.
- [ ] **Step 3:** Curate: `skills.json` (every class skill the guides and the snapshot name, with unlock levels), `builds.json` (a `leveling` and a `pve` build, each with skill ranks + target levels, stigma per global slot 22/27/32/37, macro chains with key and delay), conflicts between guides recorded in `mechanics.json` with confidence.
- [ ] **Step 4:** `pnpm import:record 001-<class>-build` succeeds; `pnpm verify` passes (ledger suite included).
- [ ] **Step 5:** Write the README to the deep-research contract (Question, Verdict, Reasoning, Steelman, Recommendation, What would change, Side findings, Sources, Files). Write `account/roadmap-2026-10-10.json` (+ `.md`) ranking the in-game changes. Commit `research(001): the <class> build for leveling and PvE`.

---

### Task 9: Apply the build in game (live)

**Files:**
- Create: `account/snapshots/2026-10-10-after.json` (second snapshot), `account/apply-log-2026-10-10.md`

- [ ] **Step 1:** Precondition shots: out of combat, solo, safe zone. If not, stop and wait.
- [ ] **Step 2:** Skill levels: open the skill window; spend the available skill points in the build's rank order up to each target level; shoot after every click and compare the level numbers before the next click.
- [ ] **Step 3:** Stigmas: equip the build's stigma in each unlocked slot (≤ character level).
- [ ] **Step 4:** Macro: open the macro editor, read its own tooltip/help for the priority direction, set the delay, fill the chain's steps in the order the record gives (reversed if the editor's priority runs bottom-up), save.
- [ ] **Step 5:** Keybind: Settings > Key Settings > General > Gameplay > Macro → the build's key; confirm no conflict (the game shows one; if so, pick the record's alternate key and log it).
- [ ] **Step 6:** Re-read the character (Task 7 steps 2–3) into `2026-10-10-after.json`; `apply-log` lists each change with its before/after shot names; every coordinate used goes into `.claude/skills/aion-game/references/windows.md`. `pnpm import:account --replace` on the after snapshot. Commit `account: apply the 001 build in game`.

---

### Task 10: Agent workspace (giga-marketplace setup-ai)

**Files:**
- Create/modify: what the setup-ai engine renders (`.claude/**`, `CLAUDE.md` append, `.gitignore` append, `.claude/setup-ai.json`)

- [ ] **Step 1:** `ENGINE=~/.claude/plugins/cache/giga-marketplace/setup-ai/0.2.3/scripts/workspace.mjs`; `node $ENGINE detect --dest .`; `node $ENGINE catalog`.
- [ ] **Step 2:** Values file in the scratchpad: packs `baseline,hooks,review-agents,dev-workflow,tech-writing`; `VERIFY_CMD=pnpm verify`; stack profile generic; every other token from `detect`/defaults (never invented).
- [ ] **Step 3:** `plan` → prerequisites → `prereqs` (plugins, vendored skills; `jq` is installed via winget already) → `render --dry-run`; resolve conflicts per spec § 3 → `render`. `errors` must be empty.
- [ ] **Step 4:** `pnpm verify` passes (prettier ignores `.claude/`); commit `chore: the agent workspace from giga-marketplace`.

---

### Task 11: Snapshot, GitHub, Vercel

**Files:**
- Create: `data/snapshot.json`
- Modify: `README.md` § Deployment (production URL), repo homepage

- [ ] **Step 1:** Rebuild the snapshot from an empty db: `rm -f data/aion.db*; pnpm import:record 001-<class>-build; pnpm import:account --all; pnpm db:export`. `pnpm verify` passes (snapshot drift test).
- [ ] **Step 2:** `pnpm build:vercel` locally; `.vercel/output/config.json` routes `/api*` to the function.
- [ ] **Step 3:** GitHub: `gh repo create skurekjakub/aion-logbook --public --source . --push --description "Aion 2 build logbook: research records, the character's build, and the game bridge"` (auth via `GH_TOKEN` from Git Credential Manager).
- [ ] **Step 4:** Vercel: `vercel link --yes --project aion-logbook`, `vercel git connect`, set `ENABLE_EXPERIMENTAL_COREPACK=1` for production, `vercel deploy --prod`. Check: `curl -sf https://<prod>/api/records` lists `001-<class>-build`; the root page returns the app shell.
- [ ] **Step 5:** `gh repo edit --homepage https://<prod>`; README § Deployment names the URL. Commit `docs: the production deployment` and push.

---

### Task 13: Character sync and the dynamic roadmap

Spec § 8. Runs after Task 9 and before Task 11 (so the first deploy already carries it).

**Files:**
- Create: `research/002-character-data-source/` (spike record: the official endpoint, its shape, rate limits, captured responses), `packages/armory/{package.json,tsconfig.json}`, `packages/armory/src/{fetch.ts,map.ts,cli.ts}`, `account/character.json`, `apps/server/src/services/roadmap.ts`, `.github/workflows/sync.yml`
- Modify: `apps/server/src/{app.ts,routes/account.ts}`, `apps/web/src/views/{HomeView,AccountRoadmap}.tsx`, `apps/web/src/api/*`, root `package.json` (`sync` script), `README.md`, `.claude/skills/aion-game/SKILL.md` (sync section)
- Test: `packages/armory/test/{map,fetch}.test.ts`, `apps/server/test/roadmap.test.ts`, `apps/web/test/roadmap.test.tsx`

**Interfaces:**
- Produces: `pnpm sync [--no-push] [--date YYYY-MM-DD]`; `fetchCharacter(server: string, name: string, http: Http): Promise<unknown>`; `toSnapshot(raw: unknown, previous: AccountSnapshotFile | null, capturedAt: string): AccountSnapshotFile`; `deriveRoadmap(snapshot, builds): RoadmapItem[]`; `GET /api/account/roadmap` → `{ snapshotId, items: [{ rank, priority, area, action, why, refs, derived: boolean }] }`.

- [ ] **Step 1: Spike** — find the official character data endpoint the official site and fan armories use (browser devtools via agent-browser on the official character page and metabot.gg's armory; capture the request URL, params, response JSON). Write `research/002-character-data-source/` to the deep-research contract with the captured responses as evidence. If the endpoint needs auth or is unreachable, record that and make `pnpm sync` use the game bridge read instead.
- [ ] **Step 2: Mapping, TDD** — `toSnapshot` maps the captured response (fixture from the spike's evidence) to `aion-account-snapshot/1`: name, class, level, gear score, server, skills with levels, stigmas per slot; macros carry over from `previous`; fields never read go to `unread[]`. Tests: fixture maps exactly; a missing field lands in `unread[]`; macros carry over.
- [ ] **Step 3: Fetch + CLI, TDD** — `fetchCharacter` with a fake `Http` (status errors named, retry once on 5xx, no retry on 4xx); `pnpm sync` writes the day's snapshot (a same-day rerun replaces it), runs `import:account --replace`, `db:export`, then `git commit -F` + `git push` unless `--no-push`; nothing is committed when the snapshot is unchanged.
- [ ] **Step 4: Derived roadmap, TDD** — `deriveRoadmap`: skills below target in build rank order (priority `now` for the top ranks), unlocked-but-empty or mismatched stigma slots (`now`), missing/differing macro chains (`next`); curated items merged after; `GET /api/account/roadmap`. Tests per rule, plus "no snapshot → empty items".
- [ ] **Step 5: Web** — home and account pages read the derived roadmap (badges: now/next/later; derived vs curated marker); render test.
- [ ] **Step 6: Scheduled sync** — `.github/workflows/sync.yml`: daily cron + `workflow_dispatch`, `pnpm install --frozen-lockfile`, `pnpm sync` (fetch-only), commit with the bot identity only when changed, push.
- [ ] **Step 7: Docs and verify** — README § Character sync, `aion-game` skill section; `pnpm verify`; commit `feat(sync): sync the character on demand and derive the roadmap`.

---

### Task 12: Whole-branch review and wrap-up

- [ ] **Step 1:** `superpowers:requesting-code-review` — one Opus reviewer over the whole branch against the spec and this plan.
- [ ] **Step 2:** `superpowers:receiving-code-review` — fix what holds up, push back on what doesn't; `pnpm verify`; commit; push; confirm the Vercel deploy of the last commit is green.
- [ ] **Step 3:** `superpowers:verification-before-completion` — fresh evidence for every claim in the final report (verify output, live URL responses, in-game after-shots).
- [ ] **Step 4:** Update `todo.md` and `OPEN-QUESTIONS.md`; tick this plan's checkboxes; commit and push.
