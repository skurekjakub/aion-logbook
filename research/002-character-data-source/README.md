# 002 — Where the official site publishes a character's public data

Measured on 2026-10-10 from `main`, against the global official site (`aion2.plaync.com`, service `aion2global`), its search host (`api-search.plaync.com`) and the fan armory metabot.gg, with agent-browser (headed Chrome) and plain curl. The research changed no code; the sync it informs is Task 13 Steps 2–7 of `docs/superpowers/plans/2026-10-10-aion-logbook.md` (`packages/armory/`).

## Question

As asked: where does the official Aion 2 site publish a character's public data, so `pnpm sync` can fetch it without game input?

Falsifiable: the global (Steam) client's official site, `aion2.plaync.com`, serves a character's level, class, gear, skills with levels and slotted stigmas as JSON that an unauthenticated `curl` can fetch by server and character name.

## Verdict

Confirmed. The official character page (`/en-us/characters/<serverId>/<characterId>?region=<region>`) is a client-rendered shell over undocumented JSON endpoints that answer plain curl with no login, cookie or special header: a name search on `api-search.plaync.com` turns a name and region into a `characterId` and `serverId`, and `aion2.plaync.com/api/character/info` and `/api/character/equipment` return the profile, stats, item level, Daevanion boards, gear and every class skill with its level and an equipped flag (stigmas are the `Dp` category). The user's character is **Baon, Fafnir (EU, serverId 2319), Asmodian Cleric, level 36**. The strongest caveat is not technical: NC does run a published interface, the NC OPEN API at developers.plaync.com, but it documents only Lineage 2M market data and needs an API key, so it does not cover Aion 2 characters, global or KR. The character endpoints stay unpublished, and NC's Terms of Use (§ 6, linked from the profile page's footer) forbid automated access outside published interfaces, so an on-demand sync is a judgement call and the daily scheduled job is the part to decide on deliberately. Macros, keybinds and stigma slot positions are not published at all; those keep coming from the game read.

## Reasoning

1. **The page calls JSON endpoints.** The official profile, opened from the official search in agent-browser, fired `GET /api/character/info` and `GET /api/character/equipment` with `region`, `lang`, `characterId`, `serverId`, after `api-search.plaync.com/aion2global/search/v2/character` (`evidence/02-browser/official-character-page-requests.txt`). A recheck of the page's info call lists its request header names as `Accept`, `Referer`, `User-Agent` and the `sec-ch-ua` hints, with no `Cookie` or `Authorization` (`evidence/08-browser-recheck/official-info-call-headers.json`, names only). The browser's reported headers may leave out cookies the network stack adds, so the no-auth proof is the plain curl probe (line 3), not this list.
2. **The script says how the calls are built.** On the global service `Il[lang]` is `""`, so the character calls go to the site root; `md()` adds `region` from the URL or the selected region; `lang` is a locale (`en-US`); the search host is `api-search.plaync.com` and the global search path is `/aion2global/search/v2/character` with `region` and `localeInfo`; the KR path is `/aion2/...` without them (`evidence/04-site-js/characters-index-js-endpoints.txt`).
3. **Plain curl gets the data.** The probe (`evidence/03-api/probe.sh`, table `evidence/03-api/probe-table.tsv`) used curl's default User-Agent and no cookies: search, info, equipment, Daevanion detail and the `gameinfo` lists all answered 200 `application/json`, none set a cookie.
4. **Required params.** Search without `localeInfo` → 400 `region and locale_info must not be empty for aion2global` (`search-baon-no-locale.json`). Info without `region` → 404 (`character-info-no-region.json`). `gameinfo/*` only answer under the locale path (`/en-us/api/gameinfo/...`); at the root they 302 to an error page (probe table row `gameinfo-servers-no-locale-path`).
5. **404 is ambiguous.** A wrong server, an unknown id and a missing region all answer the same 404 `resource.not_found` problem body (`character-info-wrong-server.json`, `character-info-unknown-id.json`, `character-info-no-region.json`).
6. **No rate limit seen at this scale.** 20 back-to-back info calls all answered 200; most took about 1.8 s, some about 0.24 s, consistent with a short upstream cache (`evidence/03-api/burst-character-info.tsv`). Responses carry `cache-control: no-cache, no-store` and no rate-limit headers (`probe-table.tsv`).
7. **The character match.** The search is case-insensitive substring matching with `<strong>` highlight markup. Compared case-sensitively after stripping the markup, "Baon" matches only in EU — Daminu (Elyos, `pcId` 29 = Cleric male, level 15) and Fafnir (Asmodian, `pcId` 32 = Cleric female, level 36); Asia's nearest is "BAon" on Kaisinel (level 2), a different name; none in NA East, NA West or Latin America (`search-baon-*.json`; `pcId` meanings from `gameinfo-pcdata-eu.json`). Fafnir's Baon is the level-36 Cleric; its info profile confirms `className` Cleric, `characterLevel` 36, `combatPower` 33293, item level 749 (`character-info-baon.json`), and the rendered page shows the same (`evidence/02-browser/aion2-plaync-com-en-us-characters-2319-baon.txt`).
8. **Skills and stigmas.** `skill.skillList` holds every class skill with `category` (`Active`, `Passive`, `Dp`), `skillLevel`, `acquired` and `equip`; the `Dp` names are exactly record 001's stigma list, all with `needLevel` 22, and the page renders them under "Stigma" (`character-equipment-baon.json`, `research/001-cleric-build/curated/skills.json`). No slot index comes with them.
9. **Fan armory is not a source.** metabot.gg describes its profiles as "the public character data the official AION 2 site publishes" and refreshes a copy older than 30 minutes (`evidence/05-metabot/metabot-armory-search-baon-eu.txt`); its `/api/` is disallowed in robots.txt, answers curl with 403, and it has no developer page (`evidence/05-metabot/`). Its official-search mode answered 403 in the browser as well.
10. **The Terms.** NC's Terms of Use § 6 forbid accessing or searching the Services by automated means other than published interfaces, call scraping without consent prohibited, and bar crawlers other than NC's agents or generally available browsers (`evidence/06-terms/plaync-com-policy-service-game-en.md`). They govern this page: the official profile's footer "Terms of Use" links to exactly that document, `https://www.plaync.com/policy/service/game_en` (`evidence/08-browser-recheck/official-profile-footer-links.json`). `aion2.plaync.com/robots.txt` allows everything (`evidence/06-terms/aion2-plaync-com-robots.txt`).
11. **NC's published interface does not cover Aion 2.** The game Terms' policy menu lists an "NC OPEN API Service" (`evidence/06-terms/plaync-com-policy-service-game-en.md`, line 9). Its terms (Korean only) leave the API's kinds to the developer center (제 4 조), require an API key issued there (제 6 조 ①), forbid caching or storing result data beyond what they allow without consent (제 6 조 ⑤) and forbid automated or periodic access that loads the API servers (제 6 조 ⑧) (`evidence/07-nc-open-api/plaync-com-policy-service-developers.md`). The developer center, `developers.plaync.com`, documents one API: "Lineage 2M item and market price information API" on `https://dev-api.plaync.com/l2m/v1.0` (`evidence/07-nc-open-api/developers-plaync-com-home.txt`, `developers-plaync-com-apis-l2m.txt`). `developers.plaync.com/apis/aion2` lands on NC's error page (`developers-plaync-com-apis-aion2.txt`). `dev-api.plaync.com` answers 401 without a key for the Lineage 2M path and for guessed Aion 2 paths alike, so the gateway says nothing about whether those exist (`evidence/07-nc-open-api/dev-api-curl.tsv`). So no published interface covers Aion 2 characters, global or KR, as of 2026-10-10.

| Source | Decides by | Character data | Auth | Measured |
|---|---|---|---|---|
| aion2.plaync.com (global) | `region` + `serverId` + `characterId` | info + equipment JSON | none | 2026-10-10 |
| api-search.plaync.com (global) | `keyword` + `region` + `localeInfo` (+ `serverId`) | search list | none | 2026-10-10 |
| api-search.plaync.com (KR) | `keyword` (+ `serverId`) | search list | none | 2026-10-10 |
| metabot.gg | its own copy | profile pages | `/api/` 403 to curl | 2026-10-10 |
| NC OPEN API (`dev-api.plaync.com`) | API key | none documented for Aion 2 (Lineage 2M market only) | API key | 2026-10-10 |

## The steelman

*The spec's fallback, the game bridge read, is the safer source and the public data adds nothing.* Answered: the bridge read is slow, needs the client open and menus driven, and can't run on a schedule; the public data gives exact skill levels, gear with enchant levels and item level in one call. But the fallback's case is real on two points: it is the only source of macros, keybinds and stigma slot positions, and it carries no Terms risk. So the sync uses the public data for what it has and the latest game read for the rest, as spec § 8 already says.

*Undocumented endpoints break without notice.* True; the record's saved searches re-check the page's network log, and the fetch must fail loudly (status and body named) rather than write a partial snapshot.

## Recommendation

- `fetchCharacter(server, name)`: search `api-search.plaync.com/aion2global/search/v2/character` with `keyword`, `serverId`, `region`, `localeInfo=en-US`; strip the `<strong>` highlight, keep only rows whose `serverId` is the configured one, and compare the name case-sensitively (the search itself is case-insensitive, so "BAon" comes back for "Baon"); exactly one row must remain, else fail; then GET `aion2.plaync.com/api/character/info` and `/api/character/equipment` with `region`, `lang=en-US`, `characterId`, `serverId`. `account/character.json` holds the region and server id with the name; caching the `characterId` saves the search, which can be rerun when info 404s.
- Treat a 404 as "not found or moved", re-search once, then fail. No retries beyond the plan's one-on-5xx.
- Keep it gentle: on demand, one character, a handful of calls per run.
- **Open, for the user:** the daily scheduled GitHub Actions sync (spec § 8) is automated access to an unpublished interface under NC's Terms § 6; NC's published Open API offers no Aion 2 character data to move it onto. Recommendation: keep `pnpm sync` on demand and leave the workflow `workflow_dispatch`-only until the user decides.

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
| stigma levels | `skillLevel` on the `Dp` rows (Baon: Prayer of Amplification 3, Earth Punishment 4, Voice of Doom 0, Noble Aura 6) has no field in `stigmas[]`; recommendation: also emit the acquired `Dp` rows in `skills[]` with their level, so the roadmap can compare stigma levels with build targets |
| `macros[]`, keybinds | not published — carried from the latest game read, else `unread[]` |

Open for Step 2, from `character-equipment-baon.json`:

- **`equip` on Active skills.** Every Active row has `equip=1` except Defiance (level 2); every Passive row has `equip=0`. A reading that fits: `equip` means "placed on the hotbar". It says nothing about which slot, so `skills[].slot` stays `null` or carries from the game read; confirm against a game read before relying on it.
- **Equipped at level 0.** Voice of Doom is `acquired=1, equip=1, skillLevel=0`: a stigma can sit in a slot with no points in it. Map it as slotted, level 0; don't drop it.
- **Acquired but not slotted.** Power Burst is `acquired=1, equip=0, skillLevel=0`: owned, not in a slot. It belongs in `skills[]` (level 0) if stigma rows go there, never in `stigmas[]`.
- **Not acquired.** `acquired=0` rows (other `Dp` stigmas) are the class's skill list, not the character's; skip them.

## Side findings

- The site's own copy says character search covers level 45 and up only, yet it returned Baon at 36 and lower levels (`evidence/04-site-js/characters-index-js-endpoints.txt`, `search-baon-eu.json`). If NC enforces it later, the cached `characterId` keeps the sync working. Consciously dropped as a follow-up: the Recommendation already caches the id and re-searches only on 404, which is the whole mitigation.
- The item-level stat row's `name` comes back untranslated (`아이템레벨`) under `lang=en-US`; key on `type`, not `name`.
- How soon the official data reflects in-game changes (logout, periodic) was not measured. Follow-up: `.ai/followups/integrations/20261010-official-character-data-freshness-unmeasured.md` (measure it against a game read during Task 13 Step 3's live check).
- `characterId` in search results is URL-encoded (`%3D`) while info returns it decoded (`=`); info accepts both forms, same character back (`evidence/09-api-recheck/probe-id-forms.tsv`).

## Sources

- https://aion2.plaync.com/en-us/characters/2319/xzsyGd6XtPyctmj9TJwqU2r8vtL-V3jn_EWQe1YEXwo%3D?region=eu — the official profile and the calls it makes.
- https://api-search.plaync.com/aion2global/search/v2/character — the name search and its required params.
- https://aion2.plaync.com/api/character/info, https://aion2.plaync.com/api/character/equipment, https://aion2.plaync.com/api/character/daevanion/detail — the character data.
- https://aion2.plaync.com/en-us/api/gameinfo/servers, `/classes`, `/pcdata` — server ids and `pcId` → class.
- https://assets.playnccdn.com/static-aion2/characters/js/index.js — how the page builds its calls.
- https://metabot.gg/en/aion-2/armory, https://metabot.gg/robots.txt, https://metabot.gg/en/developers — the fan armory has no public API.
- https://www.plaync.com/policy/service/game_en — NC's Terms of Use § 6.
- https://aion2.plaync.com/robots.txt — the site's crawler policy.
- https://www.plaync.com/policy/service/developers — the NC OPEN API Service terms: API key, no caching beyond what they allow, no automated load.
- https://developers.plaync.com/, https://developers.plaync.com/apis/l2m, https://developers.plaync.com/apis/aion2 — the developer center documents Lineage 2M only; no Aion 2 API page.
- https://dev-api.plaync.com — the Open API gateway: 401 without a key on every path tried.

## Files

- `evidence/01-pages/` — the official characters index (a client-rendered shell) and metabot's armory page, as Markdown.
- `evidence/02-browser/` — the rendered official profile of Baon, and the official API calls the page made.
- `evidence/03-api/probe.sh` — the curl probe (doors declared at its top); `probe-table.tsv` its status, type, cache-control and cookie table; `burst-character-info.tsv` the back-to-back run; each `*.json` is one door's raw body, named in the table.
- `evidence/04-site-js/characters-index-js-endpoints.txt` — verbatim excerpts of the page's script bundle around each endpoint.
- `evidence/05-metabot/` — metabot's armory search text and requests, its robots.txt, its missing developer page, and curl against its API.
- `evidence/06-terms/` — NC's Terms of Use and the official site's robots.txt.
- `evidence/07-nc-open-api/` — the NC OPEN API Service terms, the developer center's home, its Lineage 2M API page, the missing Aion 2 page, and curl against the Open API gateway.
- `evidence/08-browser-recheck/` — the profile page's info call (request header names only, response headers) and its footer links.
- `evidence/09-api-recheck/probe-id-forms.sh` — the curl probe for both `characterId` forms; `probe-id-forms.tsv` its result.
- `evidence/captures.jsonl` — the capture ledger.
