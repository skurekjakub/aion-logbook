# 002 — Where the official site publishes a character's public data

Measured on 2026-10-10 from `main`, against the global official site (`aion2.plaync.com`, service `aion2global`), its search host (`api-search.plaync.com`) and the fan armory metabot.gg, with agent-browser (headed Chrome) and plain curl. The research changed no code; the sync it informs is Task 13 Steps 2–7 of `docs/superpowers/plans/2026-10-10-aion-logbook.md` (`packages/armory/`).

## Question

As asked: where does the official Aion 2 site publish a character's public data, so `pnpm sync` can fetch it without game input?

Falsifiable: the global (Steam) client's official site, `aion2.plaync.com`, serves a character's level, class, gear, skills with levels and slotted stigmas as JSON that an unauthenticated `curl` can fetch by server and character name.

## Verdict

Confirmed. The official character page (`/en-us/characters/<serverId>/<characterId>?region=<region>`) is a client-rendered shell over undocumented JSON endpoints that answer plain curl with no login, cookie or special header: a name search on `api-search.plaync.com` turns a name and region into a `characterId` and `serverId`, and `aion2.plaync.com/api/character/info` and `/api/character/equipment` return the profile, stats, item level, Daevanion boards, gear and every class skill with its level and an equipped flag (stigmas are the `Dp` category). The user's character is **Baon, Fafnir (EU, serverId 2319), Asmodian Cleric, level 36**. The strongest caveat is not technical: the endpoints are not a published interface, and NC's Terms of Use (§ 6) forbid automated access outside published interfaces, so an on-demand sync is a judgement call and the daily scheduled job is the part to decide on deliberately. Macros, keybinds and stigma slot positions are not published at all; those keep coming from the game read.

## Reasoning

1. **The page calls JSON endpoints.** The official profile, opened from the official search in agent-browser, fired `GET /api/character/info` and `GET /api/character/equipment` with `region`, `lang`, `characterId`, `serverId`, after `api-search.plaync.com/aion2global/search/v2/character` (`evidence/02-browser/official-character-page-requests.txt`). Its request headers were only `Accept`, `Referer`, `User-Agent` and the `sec-ch-ua` hints: no cookie or auth header was needed for the page's data.
2. **The script says how the calls are built.** On the global service `Il[lang]` is `""`, so the character calls go to the site root; `md()` adds `region` from the URL or the selected region; `lang` is a locale (`en-US`); the search host is `api-search.plaync.com` and the global search path is `/aion2global/search/v2/character` with `region` and `localeInfo`; the KR path is `/aion2/...` without them (`evidence/04-site-js/characters-index-js-endpoints.txt`).
3. **Plain curl gets the data.** The probe (`evidence/03-api/probe.sh`, table `evidence/03-api/probe-table.tsv`) used curl's default User-Agent and no cookies: search, info, equipment, Daevanion detail and the `gameinfo` lists all answered 200 `application/json`, none set a cookie.
4. **Required params.** Search without `localeInfo` → 400 `region and locale_info must not be empty for aion2global` (`search-baon-no-locale.json`). Info without `region` → 404 (`character-info-no-region.json`). `gameinfo/*` only answer under the locale path (`/en-us/api/gameinfo/...`); at the root they 302 to an error page (probe table row `gameinfo-servers-no-locale-path`).
5. **404 is ambiguous.** A wrong server, an unknown id and a missing region all answer the same 404 `resource.not_found` problem body (`character-info-wrong-server.json`, `character-info-unknown-id.json`, `character-info-no-region.json`).
6. **No rate limit seen at this scale.** 20 back-to-back info calls all answered 200; most took about 1.8 s, some about 0.24 s, consistent with a short upstream cache (`evidence/03-api/burst-character-info.tsv`). Responses carry `cache-control: no-cache, no-store` and no rate-limit headers (`probe-table.tsv`).
7. **The character match.** Exact-name "Baon" matches across the global regions' searches: EU — Daminu (Elyos, `pcId` 29 = Cleric male, level 15) and Fafnir (Asmodian, `pcId` 32 = Cleric female, level 36); Asia — Kaisinel (level 2); none in NA East, NA West or Latin America (`search-baon-*.json`; `pcId` meanings from `gameinfo-pcdata-eu.json`). Fafnir's Baon is the level-36 Cleric; its info profile confirms `className` Cleric, `characterLevel` 36, `combatPower` 33293, item level 749 (`character-info-baon.json`), and the rendered page shows the same (`evidence/02-browser/aion2-plaync-com-en-us-characters-2319-baon.txt`).
8. **Skills and stigmas.** `skill.skillList` holds every class skill with `category` (`Active`, `Passive`, `Dp`), `skillLevel`, `acquired` and `equip`; the `Dp` names are exactly record 001's stigma list, all with `needLevel` 22, and the page renders them under "Stigma" (`character-equipment-baon.json`, `research/001-cleric-build/curated/skills.json`). No slot index comes with them.
9. **Fan armory is not a source.** metabot.gg describes its profiles as "the public character data the official AION 2 site publishes" and refreshes a copy older than 30 minutes (`evidence/05-metabot/metabot-armory-search-baon-eu.txt`); its `/api/` is disallowed in robots.txt, answers curl with 403, and it has no developer page (`evidence/05-metabot/`). Its official-search mode answered 403 in the browser as well.
10. **The Terms.** NC's Terms of Use § 6 forbid accessing or searching the Services by automated means other than published interfaces, call scraping without consent prohibited, and bar crawlers other than NC's agents or generally available browsers (`evidence/06-terms/plaync-com-policy-service-game-en.md`). `aion2.plaync.com/robots.txt` allows everything (`evidence/06-terms/aion2-plaync-com-robots.txt`).

| Source | Decides by | Character data | Auth | Measured |
|---|---|---|---|---|
| aion2.plaync.com (global) | `region` + `serverId` + `characterId` | info + equipment JSON | none | 2026-10-10 |
| api-search.plaync.com (global) | `keyword` + `region` + `localeInfo` (+ `serverId`) | search list | none | 2026-10-10 |
| api-search.plaync.com (KR) | `keyword` (+ `serverId`) | search list | none | 2026-10-10 |
| metabot.gg | its own copy | profile pages | `/api/` 403 to curl | 2026-10-10 |

## The steelman

*The spec's fallback, the game bridge read, is the safer source and the public data adds nothing.* Answered: the bridge read is slow, needs the client open and menus driven, and can't run on a schedule; the public data gives exact skill levels, gear with enchant levels and item level in one call. But the fallback's case is real on two points: it is the only source of macros, keybinds and stigma slot positions, and it carries no Terms risk. So the sync uses the public data for what it has and the latest game read for the rest, as spec § 8 already says.

*Undocumented endpoints break without notice.* True; the record's saved searches re-check the page's network log, and the fetch must fail loudly (status and body named) rather than write a partial snapshot.

## Recommendation

- `fetchCharacter(server, name)`: search `api-search.plaync.com/aion2global/search/v2/character` with `keyword`, `serverId`, `region`, `localeInfo=en-US`; pick the exact name match (strip the `<strong>` highlight); then GET `aion2.plaync.com/api/character/info` and `/api/character/equipment` with `region`, `lang=en-US`, `characterId`, `serverId`. `account/character.json` holds the region and server id with the name; caching the `characterId` saves the search, which can be rerun when info 404s.
- Treat a 404 as "not found or moved", re-search once, then fail. No retries beyond the plan's one-on-5xx.
- Keep it gentle: on demand, one character, a handful of calls per run.
- **Open, for the user:** the daily scheduled GitHub Actions sync (spec § 8) is automated access to an unpublished interface under NC's Terms § 6. Recommendation: keep `pnpm sync` on demand and leave the workflow `workflow_dispatch`-only until the user decides.

## What would change (a map)

- `account/character.json` — `{ name: "Baon", region: "eu", serverId: 2319, server: "Fafnir", characterId? }`.
- `packages/armory/src/fetch.ts` — the two-step fetch above; `map.ts` — the field map below; fixtures from `evidence/03-api/character-info-baon.json` and `character-equipment-baon.json`.
- `.github/workflows/sync.yml` — gated on the open question above.

Field map to `aion-account-snapshot/1` (`packages/schema/src/account.ts`):

| Snapshot field | Source |
|---|---|
| `character.name` | info `profile.characterName` |
| `character.class` | info `profile.className` (lower-cased; `pcId` via `gameinfo/pcdata` as a cross-check) |
| `character.level` | info `profile.characterLevel` |
| `character.gearScore` | info `stat.statList[type=ItemLevel].value` (749), or `profile.combatPower` (33293) — which one the logbook means is a choice |
| `character.server` | info `profile.serverName` |
| `skills[]` | equipment `skill.skillList[category in Active, Passive, acquired=1]` → `name`, `skillLevel`; `slot` not published |
| `stigmas[]` | equipment `skill.skillList[category=Dp, equip=1]` → `name`; `slotLevel` not published (all `needLevel` 22) |
| `macros[]`, keybinds | not published — carried from the latest game read, else `unread[]` |

## Side findings

- The site's own copy says character search covers level 45 and up only, yet it returned Baon at 36 and lower levels (`evidence/04-site-js/characters-index-js-endpoints.txt`, `search-baon-eu.json`). If NC enforces it later, the cached `characterId` keeps the sync working.
- The item-level stat row's `name` comes back untranslated (`아이템레벨`) under `lang=en-US`; key on `type`, not `name`.
- How soon the official data reflects in-game changes (logout, periodic) was not measured; the first sync should be compared with a same-day game read. No follow-up file: Task 13 Step 2's fixture test is where it lands.
- `characterId` in search results is URL-encoded (`%3D`) while info returns it decoded (`=`); both forms are accepted (probe and manual check).

## Sources

- https://aion2.plaync.com/en-us/characters/2319/xzsyGd6XtPyctmj9TJwqU2r8vtL-V3jn_EWQe1YEXwo%3D?region=eu — the official profile and the calls it makes.
- https://api-search.plaync.com/aion2global/search/v2/character — the name search and its required params.
- https://aion2.plaync.com/api/character/info, https://aion2.plaync.com/api/character/equipment, https://aion2.plaync.com/api/character/daevanion/detail — the character data.
- https://aion2.plaync.com/en-us/api/gameinfo/servers, `/classes`, `/pcdata` — server ids and `pcId` → class.
- https://assets.playnccdn.com/static-aion2/characters/js/index.js — how the page builds its calls.
- https://metabot.gg/en/aion-2/armory, https://metabot.gg/robots.txt, https://metabot.gg/en/developers — the fan armory has no public API.
- https://www.plaync.com/policy/service/game_en — NC's Terms of Use § 6.
- https://aion2.plaync.com/robots.txt — the site's crawler policy.

## Files

- `evidence/01-pages/` — the official characters index (a client-rendered shell) and metabot's armory page, as Markdown.
- `evidence/02-browser/` — the rendered official profile of Baon, and the official API calls the page made.
- `evidence/03-api/probe.sh` — the curl probe (doors declared at its top); `probe-table.tsv` its status, type, cache-control and cookie table; `burst-character-info.tsv` the back-to-back run; each `*.json` is one door's raw body, named in the table.
- `evidence/04-site-js/characters-index-js-endpoints.txt` — verbatim excerpts of the page's script bundle around each endpoint.
- `evidence/05-metabot/` — metabot's armory search text and requests, its robots.txt, its missing developer page, and curl against its API.
- `evidence/06-terms/` — NC's Terms of Use and the official site's robots.txt.
- `evidence/captures.jsonl` — the capture ledger.
