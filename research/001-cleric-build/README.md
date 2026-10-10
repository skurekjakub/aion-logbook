# 001 — The Cleric build for leveling and PvE (Aion 2, global client)

Status: active (started and curated 2026-10-10, on `main`). Measured: the global-launch Cleric guides, the client-data sites and the macro guides published around the global launch (2026-10-05), Korean guides and patch notes for the mature data, and Korean Cleric macro videos, captured on 2026-10-10 under `evidence/`. The character is a level-36 Cleric on the Steam global client (class: user, 2026-10-10). The research changed nothing in the game. The same day the global client's Skill window and macro editor were read from a recording while the user clicked (`evidence/03-game/`), which settled the macro entry model; the character's state from that read is `account/snapshots/2026-10-10.json`, and what's left to apply is ranked in `account/roadmap-2026-10-10.json`.

## Question

As asked: what skill levels, stigmas and built-in macro chains should a level-36 Cleric on the global client run, for leveling and PvE, and how is the built-in macro editor's priority ordered?

As a falsifiable statement: the sources captured here name, for a level-36 global Cleric, a damage-first solo build and a heal-first group build precisely enough to set every skill level, fill each of the 22/27/32/37 stigma slots and build a macro chain; and they agree on which end of a hotbar column and of the macro editor fires first.

## Verdict

**Supported for the builds; partly for the editor.** Solo, level the Chain of Torment → Condemnation damage loop first, with Earth's Retribution, Judgment Thunder, Divine Aura and Bolt, and slot Light of Protection, Earth Punishment and Noble Aura now (Prayer of Amplification at 37), the set both client-data sources slot, in aion2.run's order (metabot puts Noble Aura before Earth Punishment). From stigma level 5 Earth Punishment makes Condemnation always crit; the cooldown reset on a crit needs Condemnation at skill level 12, past what points buy (metabot). In groups, take the heals to 10 first and slot Light of Protection, Earth Punishment, Summon Resurrection and then Noble Aura, the set the top global Clerics run (metabot, aion2.run). Both builds stay theory until the in-game check. A hotbar column tries its bottom skill first (every macro guide agrees). In the macro editor an entry is one skill with its own delay, read in the global client on 2026-10-10 against the guides that said whole columns (allthings.how, playnews); so both chains are single-skill entry lists, cooldowns first and Judgment Thunder last. Whether entries run top-down (allthings.how) or bottom-up (mein-mmo, possibly about the column) stays theory.

## Reasoning

1. **The global Cleric's kit and budget are known from client data.** The skill list, unlock levels, cooldowns, point prices (21 points to level 10) and the stigma slots at 22/27/32/37 come from the global client (build 0.0.4387.0) via metabot (`evidence/01-guides/metabot-gg-en-aion-2-classes-cleric-build.md`). Its milestone table gives 123 skill points at 32 and 153 at 37, and 10 and 15 stigma points; level 36 is interpolated at about 147 and 14. aion2.run adds the one-level-per-3-character-levels gate, which at 36 holds Bolt (learned at 14) at 8; aion2maps' plan has it at 10 by 38 (`evidence/01-guides/aion2-run-en-classes-clerc-rendered.md`). Points stop at skill level 10; a skill at 10 holds one specialization, picked from its level-8 options (metabot, "How skill points work").
2. **Damage first while leveling.** aion2.run's leveling plan (aion2maps' point plan, computed from the global client) maxes Earth's Retribution and Judgment Thunder, then Chain of Torment, Condemnation and Divine Aura, Bolt 10 at 38, and leaves the heals near level 1 until 34; at 45: those six at 10, the heals and Debilitating Mark at 8, Empyrean Lord's Grace 10, Earth's Grace 4 (`aion2-run-en-classes-clerc-rendered.md`, "Levels 26 to 38" and "Points run short at 45"). metabot's editorial leveling build reaches the same core with the heals higher (`metabot-…-cleric-build.md`, "Leveling 1–45").
3. **The damage loop and the first stigma.** Condemnation hits only Chain of Torment targets (aion2.run skill list; gamesfuze "Offensive Skills"); Earth Punishment at stigma level 5 makes it crit (aion2.run "Mechanics to know"); its skill-level-12 spec resets the cooldown on a crit (metabot specialization table), which needs Daevanion nodes or gear past the 10 points buy, and metabot's most-picked node gives Condemnation +1 (Nezekan). The character's Condemnation reads 10 in the Skill window on 2026-10-10 (`evidence/03-game/skill-window-mastery-f-0060.png`, `account/snapshots/2026-10-10.json`), so the reset isn't there yet and the record doesn't rest the stigma order on it. Both client-data sources slot Light of Protection at 22 (metabot "Which stigmas should a Cleric use first?"; aion2.run, Earth Punishment at 27); eloboost24 alone puts Earth Punishment first solo, reasoned on paper ("Solo tip", `eloboost24-eu-blog-aion-2-cleric-build.md`). The verdict follows the data sources; it stays theory.
4. **Group stigmas.** Top level-45 Clerics run Light of Protection 87%, Noble Aura 79%, Earth Punishment 65%, Summon Resurrection 64% (metabot "Most used Cleric stigmas", 151 players, captured 2026-10-10). aion2.run's dungeon healer build is the same set; keengamer keeps Resurrection until the group clears mechanics (`keengamer-…-every-class.md`, 2.7).
5. **Group skills.** Healing Light (6 s, lowest ally) and Radiant Recovery (12 s, cleanse) first (eloboost24, gamesfuze, the Inven post-cap order in `inven-co-kr-board-aion2-6452-657.md`), Chain of Torment kept on the boss for its −5% Tolerance, a further −10% with the skill-12 spec (metabot specialization table; aion2.run gives the −15% total), and enough damage for the chest contribution (aion2.run dungeon tips).
6. **Hotbar columns: bottom first.** playnews ("tries to use the lowest skill in the stack"), mein-mmo ("The skill at the very bottom has the highest priority") and allthings.how ("The skill at the bottom of a column gets top priority") agree (`playnews-…`, `mein-mmo-…`, `allthings-how-p-211813.md`). What goes at the bottom conflicts: cooldown skills (playnews, mein-mmo) against the no-cooldown attack (allthings.how's priority section), and allthings.how contradicts itself later, putting zero-cooldown skills "high on the column". A no-cooldown skill at the bottom would starve the column, so a column holds its cooldown skills low. The macro doesn't use columns (reasoning 8), so this only shapes hand-pressed hotbar keys.
7. **The macro editor.** Bound under Settings > Key Settings > General > Gameplay > Macro, unbound by default, held to run, manual input wins (allthings.how, playnews, gamesfuze, the KR note `aion2hub-com-updates-aion-2-update-2026-01-28.md`). allthings.how and playnews say entries register whole hotbar columns, up to 20, each with a delay whose default fell from 50 to 10 ms (allthings.how). The Korean editor frame (`f-00m42.0s.jpg`) instead shows one skill per entry, each with its own 10 ms delay (Earth's Retribution, Divine Aura, Prayer of Amplification), on the Korean client after its May 2026 rework. Toggles and charged skills stay out: the loop switches Light of Protection off and fires Bolt at charge 1 (allthings.how; a comment on `evidence/02-youtube/yt-WhNIY6j8TRM.txt`).
8. **The global editor, read in game: one skill per entry.** The character's own macro editor on 2026-10-10 listed Chain of Torment, Bolt, then Earth's Retribution entries, each entry one skill icon and name with its own `Delay 10 ms` field and a trash can, numbered 1, 2, 3… from the top; emptied, it reads "No macros available", and Add Macro appends an Earth's Retribution entry (`evidence/03-game/game-client-skill-window-2026-10-10.md`, frames `macro-editor-entries-f-0066.png`, `macro-editor-empty-f-0068.png`, `macro-editor-add-f-0069.png`, local media with committed ledger lines). That settles the entry model for the global client the way the Korean frame showed it, against allthings.how and playnews. The same read shows each hotbar key as rows 0–3, so 4 skills a key, as playnews says (`skill-window-mastery-f-0060.png`). Not seen: how an entry's skill is swapped, the run order, the entry limit.
9. **Entry order: conflict.** allthings.how: "the game runs the entries from top to bottom … then loops"; mein-mmo: the macro processes "the skills from the bottom up", which may describe the hotbar column rather than the entries. The Korean frames `evidence/02-youtube/frames-v_NuuOGFp_4/f-00m42.0s.jpg` and `f-00m45.0s.jpg` and the global editor both number entries from the top: display order consistent with top-down, not proof of run order.
10. **Korean data is a later version.** KR has 5 stigma slots since 2026-03-25 and a Cleric stigma the global list lacks (`aion2hub-com-updates-aion-2-update-2026-03-25.md`), level 50 and stigma level 25 (eloboost24, aion2.run), and reworked its macro in May 2026 (`yt-WhNIY6j8TRM.txt`, aion2.run sources). KR guides inform class logic here, not numbers.

| Source | Kind | Leveling stigmas (22/27/32/37) | Group stigmas | Column priority | Editor order | Captured |
|---|---|---|---|---|---|---|
| metabot | client data + top-player usage | LoP / Noble Aura / Earth Punishment / Summon Res. | same | — | — | 2026-10-10 |
| aion2.run | sourced fan guide | LoP / Earth Punishment / Noble Aura / Prayer of Ampl. | LoP / EP / NA / Summon Res. | — | — | 2026-10-10 |
| eloboost24 | global-data guide | Earth Punishment first solo | LoP / Absolution / Yustiel's / Summon Res. | — | — | 2026-10-10 |
| keengamer | guide | — | EP / LoP / NA / Resurrection | — | — | 2026-10-10 |
| allthings.how | macro guide | — | — | bottom first; no-cd at bottom, then "high" | top to bottom; entry = column | 2026-10-10 |
| playnews | macro guide | — | — | bottom first; no-cd on top | entry = column | 2026-10-10 |
| mein-mmo | macro guide | — | — | bottom first; no-cd never low | "bottom up" (ambiguous) | 2026-10-10 |
| KR video `v_NuuOGFp_4` | editor frames | — | — | — | numbered from the top; entry = one skill | 2026-10-10 |
| Global client (in game) | Skill window and macro editor read | — | — | rows 0–3 a key | numbered from the top; entry = one skill; run order not seen | 2026-10-10 |

## The steelman

The strongest case against the verdict is the heal-first school: eloboost24 levels Healing Light and Radiant Recovery first and slots Light of Protection, Absolution, Yustiel's Power and Summon Resurrection, on the ground that the Cleric is the only pure healer and groups need it alive. Answered: that is the right build for a group, and the PvE build follows it for skills; but the character levels alone (questing, mining), where nobody else takes damage, so the solo skill points go to damage. Its group stigmas are reasoned "on paper" with no ranking data (its own words); metabot's top-player usage puts Noble Aura and Earth Punishment where eloboost24 has Absolution and Yustiel's Power.

The case for Earth Punishment at 22 solo (eloboost24): it is the damage stigma, and solo nobody shares Light of Protection's party buff. Answered: Light of Protection also buffs the caster (+10.5% damage and tolerance, a toggle for one point), and both client-data sources put it first; the reset that would make Earth Punishment decisive needs Condemnation 12, which points don't reach.

The case for trusting mein-mmo's bottom-up macro order: it is consistent with the column rule, so one direction for both layers is simpler. Answered: it is one sentence in a machine-translated article that may mean the column; allthings.how describes the editor in detail, and both the Korean frame and the global editor display entries from the top. The curated chains put the cooldown skills first and the no-cooldown filler last, so top-down runs them as intended; if the client runs bottom-up, Judgment Thunder would fire on every pass and starve the rest, and the fix is to reverse the list, which the account roadmap carries as a check.

## Recommendation

**Leveling build (now, solo).** Points at 36 (about 147): Condemnation, Chain of Torment, Earth's Retribution, Judgment Thunder, Divine Aura to 10; Bolt 8 (10 at 38); Debilitating Mark 8; the rest into Healing Light (to 7) and Light of Regeneration (to 5). Then Bolt 10, the heals to 8, Empyrean Lord's Grace 10 and Earth's Grace 10 as points and Wisdom Stones come.

| Rank | Skill | Target | Specialization | Why |
|---|---|---|---|---|
| 1 | Condemnation | 10 | +12% vs fewer targets | Main damage; always crits on Earth Punishment's target |
| 2 | Chain of Torment | 10 | read in game | Condemnation needs its mark; 4-target DoT |
| 3 | Earth's Retribution | 10 | +20% MP restored | Held left click; 110 MP a hit |
| 4 | Judgment Thunder | 10 | +12% vs fewer targets | No-cooldown 4-target filler |
| 5 | Divine Aura | 10 | Changes to AoE Skill | Free damage every 30 s |
| 6 | Bolt | 10 | +30% Skill Speed | Biggest hit, charged by hand |
| 7 | Debilitating Mark | 8 | −15% target Defense | 4-target DoT |
| 8 | Healing Light | 8 | +2 consecutive uses | Manual self-heal |
| 9 | Light of Regeneration | 8 | +20% healed at ≤50% HP | HoT in the macro |
| 10 | Radiant Recovery | 8 | removes up to 2 debuffs | Burst heal and cleanse for elites |
| 11 | Empyrean Lord's Grace | 10 | — | +100 Crit, extra damage per hit |
| 12 | Earth's Grace | 10 | — | +10.5% Crit Damage |

Targets are invested levels, the points spent: the game adds gear bonuses on top of them in the level it shows, and its Level Up button reads `Max Level` at invested 10 (`account/README.md` § Reading a snapshot). The specialization picks come from aion2.run's leveling plan and eloboost24's heal picks, except Light of Regeneration's +20% at 50% HP or less, which gamesfuze lists and the KR 2026-08-12 patch note sets at 20% (`gamesfuze-com-guides-aion-2-cleric-build-…md`, `aion2hub-com-updates-aion-2-update-2026-08-12.md`); a skill at 10 holds one.

Stigmas: 22 Light of Protection (toggle on yourself, keep it on, 1 point), 27 Earth Punishment (take it to level 5 first for the guaranteed Condemnation crit), 32 Noble Aura (recast after deaths and teleports), 37 Prayer of Amplification (manual burst). This is aion2.run's leveling order; metabot's has Noble Aura at 27 and Earth Punishment at 32, and the record keeps Earth Punishment earlier because it is the solo damage stigma both sources slot. The character hasn't obtained Light of Protection yet (padlocked on 2026-10-10, `account/snapshots/2026-10-10.json`); the build keeps it at 22 as the target, and the account roadmap carries acquiring it, which costs 1 stigma point.

**PvE build (group dungeons, healer).** Healing Light, Radiant Recovery, Light of Regeneration, Chain of Torment, Condemnation, Earth's Retribution, Judgment Thunder to 10; Debilitating Mark and Divine Aura 8; Healing Enhancement 10; Bolt 7. Specializations as in the leveling table; Chain of Torment's and Divine Aura's picks are read in game. Stigmas: 22 Light of Protection, 27 Earth Punishment, 32 Summon Resurrection, 37 Noble Aura; swap Resurrection for Prayer of Amplification once nobody dies, and Light of Protection for Absolution when a Chanter brings Undefeated Mantra.

**Macro chains (one skill per entry, read in game; run order theory).** Both on Right Mouse Button, held together with Left Mouse (Earth's Retribution), delay 10 ms on every entry (50 ms only if skills drop). Entries in editor order, top entry first, in priority order: cooldown skills first, Chain of Torment before Condemnation, Judgment Thunder last. If the macro only fires Judgment Thunder, the client runs bottom-up: reverse the list.

| Build | Entries, top to bottom |
|---|---|
| Leveling `cleric-leveling-solo` | Earth Punishment, Divine Aura, Light of Regeneration, Chain of Torment, Debilitating Mark, Condemnation, Judgment Thunder |
| PvE `cleric-pve-dungeon` | Light of Regeneration, Earth Punishment, Divine Aura, Chain of Torment, Debilitating Mark, Condemnation, Judgment Thunder |

Manual, never in a macro: Light of Protection (toggle), Bolt (charged), Noble Aura, Prayer of Amplification, Healing Light, Radiant Recovery, Summon Resurrection, Defiance. Keep each build on its own skill preset: each preset carries its own macro (allthings.how).

Open sub-choices, with a recommendation each:

- **Right mouse or a side button for the macro.** Right mouse moves the default heavy attack to T (allthings.how); Judgment Thunder sits in the macro anyway. Recommended: right mouse; a side button if the rebind gets in the way.
- **Earth's Grace to 10 now or later.** aion2maps keeps it at 4 for the actives, Couga54 raises it early (aion2.run). Recommended: actives first. The character has 9 invested in it (11 shown with a +2 gear bonus, `account/README.md` § 2026-10-10), so the last level waits behind the actives.

## What would change

Nothing in the repo beyond this record and `account/`. In the game (by hand from the account roadmap, since the client ignores the bridge's pointer input): the skill levels still below target, Earth Punishment's next level, the macro entries and the macro key. `account/roadmap-2026-10-10.json` ranks those changes against the 2026-10-10 snapshot; `account/apply-log-2026-10-10.md` records what changed that day.

## Open questions for the in-game check (Task 9)

Status after the 2026-10-10 read (`evidence/03-game/`, `account/snapshots/2026-10-10.json`):

- **Entry model: settled.** One skill per entry with its own delay; both chains are written that way.
- **Run order: open.** Entries are numbered from the top; whether they run top-down (allthings.how) or bottom-up (mein-mmo) needs the macro held in game. Whether a hotbar column still tries its bottom slot first is also unread.
- **Chain length and delay: partly read.** 4 skills a hotbar key (rows 0–3) and a 10 ms default delay, read; entries per macro (20?) not reached.
- **Condemnation's effective level: read, 10** (9 invested, +1 gear). The crit reset at 12 isn't there yet, and the build's invested target of 10 is one level away.
- **Specialization picks: open.** Not opened in the read; Chain of Torment's and Divine Aura's (PvE) stay open.
- **Presets and resets: partly read.** Presets 1–3 exist on the Skill window; whether they keep separate points and stigmas, and the reset cost at 36, are unread (aion2.run: free at 45; KR charged 10,000 Kinah per stigma point from 2026-01-28).
- **Key binding: open.** Settings wasn't opened; the path and whether Right Mouse moves the heavy attack to T are unread.
- **Swapping an entry's skill: open.** Add Macro appends Earth's Retribution; how an entry takes another skill wasn't seen.

## Side findings

- **Korean in-game macros put the basic attack inside the chain** (Inven's 50 ms Earth's Retribution chain; the May 2026 frames), against the English guides. On a mouse, holding left click outside the macro is the recommendation; a mobile or gamepad player may prefer the Korean style. Consciously dropped.

## Sources

- https://metabot.gg/en/aion-2/classes/cleric/build — global client data (skills, cooldowns, points, slots) and top-player skill and stigma usage.
- https://aion2.run/en/classes/clerc — per-bracket leveling plan, solo and dungeon builds, rotations, KR names; captured twice (server HTML, then rendered).
- https://aion2.run/ — the site's home, to find the class page.
- https://eloboost24.eu/blog/aion-2-cleric-build — heal-first global build; Earth Punishment first solo.
- https://www.keengamer.com/articles/guides/aion-2-best-pve-builds-for-every-class/ — group stigmas, Resurrection until mechanics are clean.
- https://gamesfuze.com/guides/aion-2-cleric-build-best-healer-skills-stigmas-and-gear-dungeons-pvp/ — specialization breakpoints and the Condemnation/Chain of Torment dependency.
- https://www.inven.co.kr/board/aion2/6452/657 — Korean post-cap order, KR names, a right-click column and a 50 ms macro.
- https://vortexgaming.io/en/postdetail/977592 and https://vortexgaming.io/postdetail/977592 — KR stigma sets per dungeon (translated, names garbled; Korean original).
- https://allthings.how/?p=211813 — the macro editor: columns as entries, 20 entries, top-to-bottom, 10 ms, what to leave out.
- https://www.playnews.gg/en/guides/aion-2-macros-how-to-set-them-up-and-optimize-their-use — 4 skills per button, bottom first, key path.
- https://mein-mmo.de/en/aion-2-macros-for-all-classes-how-to-massively-increase-your-damage-with-just-2-keys,1590032/ — bottom-first column, bottom-up macro, hold left click.
- https://gamesfuze.com/guides/aion-2-best-macro-setup-guide/ — 10 ms delay, delay is not ping, charged skills out.
- https://aion2hub.com/updates/aion-2-update-2026-01-28 — KR skill macro introduced; Earth Punishment 30 s.
- https://aion2hub.com/updates/aion-2-update-2026-03-25 — KR fifth stigma slot.
- https://aion2hub.com/updates/aion-2-update-2026-08-12 — KR healing rework.
- https://aion2hub.com/updates/aion-2-update-2026-09-04 — KR Bolt buff.
- YouTube `WhNIY6j8TRM`, `r4WXaGgKCxw`, `v_NuuOGFp_4`, `ymKxcPRDksU` — Korean Cleric in-game macro videos (digests); `v_NuuOGFp_4` downloaded for the editor frames.
- The global client itself, read in game on 2026-10-10 (curated as `web:game-client-skill-window`, its URL the transcription in this repo) — one skill per macro entry, 10 ms default, rows 0–3 a hotbar key, Condemnation at 10.
- Not used: https://www.gamemeca.com/view.php?gid=232966 (captured, but an AION 1 macro article); games.gg's macro guide (redirected to "unauthorized" in agent-browser); playnews' stigma guide (Cloudflare block).

## Files

- `evidence/captures.jsonl` — the capture ledger.
- `evidence/01-guides/metabot-gg-en-aion-2-classes-cleric-build.md` — metabot Cleric planner and top-player data.
- `evidence/01-guides/aion2-run-en-classes-clerc.md` — aion2.run Cleric page, server HTML (build lists empty).
- `evidence/01-guides/aion2-run-en-classes-clerc-rendered.md` — the same page rendered in agent-browser, with the build lists.
- `evidence/01-guides/aion2-run.md` — aion2.run home page.
- `evidence/01-guides/eloboost24-eu-blog-aion-2-cleric-build.md` — eloboost24 Cleric guide (agent-browser).
- `evidence/01-guides/keengamer-com-articles-guides-aion-2-best-pve-builds-for-every-class.md` — keengamer PvE builds (agent-browser).
- `evidence/01-guides/gamesfuze-com-guides-aion-2-cleric-build-best-healer-skills-stigmas-and-gear-dungeons-pvp.md` — gamesfuze Cleric build.
- `evidence/01-guides/inven-co-kr-board-aion2-6452-657.md` — Inven Korean Cleric guide.
- `evidence/01-guides/vortexgaming-io-en-postdetail-977592.md` — vortexgaming, English.
- `evidence/01-guides/vortexgaming-io-postdetail-977592.md` — vortexgaming, Korean original.
- `evidence/01-guides/allthings-how-p-211813.md` — allthings.how macro guide (agent-browser).
- `evidence/01-guides/playnews-gg-en-guides-aion-2-macros-how-to-set-them-up-and-optimize-their-use.md` — playnews macro guide (agent-browser).
- `evidence/01-guides/mein-mmo-de-en-aion-2-macros-for-all-classes-how-to-massively-increase-your-damage-with-just-2-keys-1590032.md` — mein-mmo macro guide.
- `evidence/01-guides/gamesfuze-com-guides-aion-2-best-macro-setup-guide.md` — gamesfuze macro guide.
- `evidence/01-guides/aion2hub-com-updates-aion-2-update-2026-01-28.md` — KR patch notes, 2026-01-28.
- `evidence/01-guides/aion2hub-com-updates-aion-2-update-2026-03-25.md` — KR patch notes, 2026-03-25.
- `evidence/01-guides/aion2hub-com-updates-aion-2-update-2026-08-12.md` — KR patch notes, 2026-08-12.
- `evidence/01-guides/aion2hub-com-updates-aion-2-update-2026-09-04.md` — KR patch notes, 2026-09-04.
- `evidence/01-guides/gamemeca-com-view-php.md` — AION 1 macro article (not used).
- `evidence/02-youtube/ytq-*.html` — the YouTube search pages for the saved searches in `searches.json`.
- `evidence/02-youtube/yt-<id>.html` and `yt-<id>.txt` — watch pages and digests (title, channel, date, description, top comments) of the Korean Cleric macro videos.
- `evidence/02-youtube/video/v_NuuOGFp_4.webm` — the downloaded video (local only).
- `evidence/02-youtube/frames-v_NuuOGFp_4/` — its frames every 3 s (local only); `f-00m42.0s.jpg` and `f-00m45.0s.jpg` show the macro editor.
- `evidence/03-game/game-client-skill-window-2026-10-10.md` — transcription of the global client's Skill window and macro editor frames, 2026-10-10.
- `evidence/03-game/skill-window-mastery-f-0060.png` — Skill window, Mastery tab: levels, presets, the hotbar block with rows 0–3 (local only).
- `evidence/03-game/macro-editor-entries-f-0066.png` — the macro editor with the character's single-skill entries (local only).
- `evidence/03-game/macro-editor-empty-f-0068.png` — the editor emptied, "No macros available" (local only).
- `evidence/03-game/macro-editor-add-f-0069.png` — the editor after Add Macro: one Earth's Retribution entry (local only).
- `curated/` — the dataset the app imports (`manifest.json` lists the collections).
- `research-trail.md` — the search rounds.
- `searches.json` — the saved searches.
