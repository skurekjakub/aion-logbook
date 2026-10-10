# Research trail: 001 Cleric build

Run on 2026-10-10 from `main`. Search results are leads, not findings: a claim reaches the README only once its page is captured under `evidence/`. The YouTube searches and the pages worth recapturing are the saved searches in `searches.json`.

## Round 1 — survey

Queries:

- `Aion 2 Cleric build skills stigma leveling guide`
- `Aion 2 macro system skill window priority order chain guide`
- `아이온2 치유성 스킬트리 스티그마 추천`

Synthesis: three kinds of source surfaced. Client-data sites (metabot.gg) give the global skill list, unlock levels, cooldowns, point costs and the 22/27/32/37 stigma slots, plus what top level-45 Clerics slot. English guides published the week of the global launch (keengamer, vortexgaming's translated KR summary) give builds; their skill names drift from the client's (vortexgaming's "Troops" for Bolt). The macro guides (playnews, mein-mmo, allthings.how, games.gg) agree that a hotbar column tries its bottom skill first, and disagree on chain length (4 per button vs 20 per macro). Captured: metabot, vortexgaming (English), mein-mmo with `web fetch`; eloboost24, playnews and keengamer with agent-browser (scripted fetches refused). games.gg redirected agent-browser to an "unauthorized" page: not used.

## Round 2 — deepen

Queries:

- `Aion 2 skill macro "top" priority 20 skills delay 10ms macro editor`
- `aion2.run cleric stigma slots global 22 27 32 37 korea difference`
- `아이온2 치유성 매크로 순서 스킬 매크로 설정 딜레이`

Synthesis: allthings.how (captured with agent-browser) is the most detailed account of the editor: entries are whole hotbar columns, up to 20, each with a delay whose default fell from 50 to 10 ms, run top to bottom and looped, skipping unusable entries; toggles (Light of Protection) and charged skills (Bolt) stay out. That "top to bottom" is the conflict the question asked about: mein-mmo says the macro processes "from the bottom up". The Korean patch notes (aion2hub, captured) date the macro to 2026-01-28 and the fifth KR stigma slot to 2026-03-25, with a Cleric stigma the global list lacks. The Inven Cleric guide (captured) gives the Korean names, a post-cap skill and stigma order, a right-click column and a 50 ms macro. gamesfuze's macro guide repeats the 10 ms delay and the charged-skill rule. The gamemeca hit was a 2009-era AION 1 macro article: captured before that was clear, not used. playnews' stigma guide hit a Cloudflare wall: not used.

YouTube (`pnpm capture youtube search`): the Korean query returned Cleric in-game macro videos from May–August 2026; their digests (no transcripts) were captured for four. One short video (`v_NuuOGFp_4`, mobile client) was downloaded and sampled every 3 s for frames: `f-00m42.0s.jpg` and `f-00m45.0s.jpg` show the Korean macro editor (스킬 매크로) with entries numbered 1, 2, 3… from the top, a 10 ms delay on each, an "Add Macro" (매크로 추가) button below the list, and Earth's Retribution entries interleaved with Divine Aura and Prayer of Amplification. That is the only first-hand view of the editor in the record, and it is the Korean client after its May rework, not global.

## Round 3 — verify and harden

Queries:

- `Aion 2 global macro editor entries order "first" available skill runs top to bottom Cleric macro Chain of Torment Condemnation`
- `Aion 2 Cleric solo leveling Noble Aura Earth Punishment Divine Aura damage global October 2026`
- `Aion 2 global patch notes October 2026 Cleric skill macro change`

Synthesis: no source settles the editor's entry order; it stays a conflict for the in-game check. No global patch has changed the Cleric or the macro since launch in what the searches return. A follow-up `aion2.run cleric` search led to gamesfuze's Cleric build (captured) and, by browsing, to aion2.run's English Cleric page: a sourced guide with a per-bracket leveling plan for the global client (aion2maps' point plan), solo and dungeon builds with stigmas, rotations, and the Korean names of every stigma, which resolves vortexgaming's "Power of Life" (생명의 권능) as Benevolence. Its build lists render client-side, so the page was captured twice: `web fetch` and agent-browser. aion2hub's 2026-08-12 and 2026-09-04 KR notes were captured for the healing rework and the Bolt buff.

Final takeaways, each tied to its capture:

- Damage first while leveling solo; heals first for dungeons (aion2.run, eloboost24, gamesfuze).
- Earth Punishment is the first solo stigma (eloboost24); Light of Protection is the first group stigma and the most used by top Clerics (metabot, aion2.run).
- Column priority is bottom-first (playnews, mein-mmo, allthings.how); cooldown skills go low, filler on top (playnews, mein-mmo), against allthings.how's one line.
- Entry order (top-down per allthings.how, bottom-up per mein-mmo) and chain length (4 per column, 20 entries) are for the in-game check.
- Keep Light of Protection and Bolt out of the macro; 10 ms delay; hold left click alongside (allthings.how, gamesfuze, mein-mmo, playnews).
