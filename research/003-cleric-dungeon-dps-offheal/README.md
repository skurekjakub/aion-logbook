# 003 — The Cleric as dungeon DPS with off-heal (Aion 2, global client)

Status: active (started and curated 2026-10-10, on a worktree branch off `main`). Measured: global-client Cleric guides published around the global launch (2026-10-05), metabot's top-player data recaptured, Korean ranker statistics and a Korean patch note for direction, and week-one global Cleric macro videos (digests, plus frames from two of them), captured on 2026-10-10 under `evidence/`. Record 001's captures of aion2.run, metabot, keengamer, the macro guides and the in-game read are cited by their source ids, not recaptured. The character is Baon, a level-38 Cleric (gear score 749) on Fafnir, EU (class and level: user, 2026-10-10). The research changed nothing in the game or in `account/`; applying the build is the account roadmap's job once this record is in the snapshot.

## Question

As asked: "find me dps offheal dungeon builds".

As a falsifiable statement: the guides captured here name, for a level-38 Cleric on the global client, a group-dungeon build that puts damage first and keeps party healing on the side, precisely enough to set every skill level, fill the 22/27/32/37 stigma slots and build a macro chain.

## Verdict

**Supported, as theory.** The global guides that build a damage-leaning group Cleric converge on one stigma set, Light of Protection, Earth Punishment, Noble Aura and Prayer of Amplification (expcarry's "Standard Boss Healer", playhub, gameoverdrive from Aion 2 Maps, aion2.run's offensive dungeon build), on the Chain of Torment → Condemnation engine with Earth Punishment's guaranteed crit, and on keeping heals manual while the macro runs damage and Light of Regeneration. The strongest reason: it is also what the tracked top global Clerics slot, except that more of them carry Summon Resurrection than Prayer of Amplification in the last slot (64% against 50%, metabot). The record's build is that set, damage skills to 10, heals to 8, and a single-skill-per-key macro. Not settled: the fourth stigma, Debilitating Mark, Bolt in the macro, Skill Queue, and whether a macro entry fires its whole hotbar column. Nobody has posted measured dungeon numbers for it on global.

## Reasoning

1. **The damage-leaning group set.** expcarry's "Standard Boss Healer | Light of Protection; Earth Punishment; Noble Aura; Prayer of Amplification | Default hybrid damage/healing setup" (`evidence/01-guides/expcarry-com-aion-2-cleric-guide.md`, Oct 6); playhub's Cleric "needs enough healing power to cover just enough of the encounter damage, then wants to get as much personal damage as possible", same set (`playhub-…-978315.md`, Oct 6); gameoverdrive's global table from Aion 2 Maps, same set at stigma levels 10/5/5/5 (`gameoverdrive-…-assassin.md`, Oct 5); aion2.run's "Dungeon: offensive Cleric (second Cleric or farmed content)", same set (001's `aion2-run-en-classes-clerc-rendered.md`).
2. **Top players agree on three slots.** Light of Protection 87%, Noble Aura 79%, Earth Punishment 65%, Summon Resurrection 64%, Prayer of Amplification 50% of 151 tracked top Clerics (`evidence/01-guides/metabot-gg-en-aion-2-classes-cleric-build.md`, recaptured 2026-10-10, unchanged from 001's capture that morning). The fourth slot is where safety and damage trade.
3. **The engine.** Condemnation hits only Chain of Torment targets, Earth Punishment at stigma level 5 makes it crit, and its skill-12 specialization resets its cooldown on a crit (gameoverdrive "Como funciona o combo de Condemnation"; metabot's specialization table; expcarry). Antochi reports Condemnation at 51% of a Korean meter's damage (`evidence/02-youtube/yt--86sdRZ4SX4.txt`). KR ranker statistics favour Condemnation over Judgment Thunder for single targets (`vortexgaming-io-postdetail-730212.md`, KR service).
4. **Skill levels.** expcarry builds Condemnation first, keeps Healing Light and Radiant Recovery reliable, then Bolt, Divine Aura and Judgment Thunder; gameoverdrive takes Condemnation, Earth's Retribution, Bolt, Divine Aura, Chain of Torment and Judgment Thunder to 10 and develops the heals and Debilitating Mark after. Points: 159 at 38 is interpolated from metabot's milestones (153 at 37, 171 at 40); a skill costs 21 points to 10.
5. **Specializations.** The picks in the build are metabot's level-8 options read from the global client. Divine Aura's +50% attack speed is the single-target pick (expcarry's "faster attacks"); BoredAF and Th3Ruthless both run Earth's Retribution's +20% Discharge trigger and, past 12, Bolt −7 s (`evidence/02-youtube/macro-frames-transcription-2026-10-10.md`).
6. **Off-heal stays manual.** Every damage-leaning guide keeps Healing Light, Radiant Recovery, the emergency stigmas and resurrection off the macro (expcarry "Keep manual", playhub "Unmacroed heals are essential", pixelnitro, Antochi); Light of Regeneration is the heal the macro carries (Th3Ruthless's first entry; 001's PvE chain).
7. **The chest still wants a share.** aion2.run: 5% of the final boss's HP in damage or 20% of the party's damage healed, citing GamersTogether; Kaeria warns a heal-only Cleric can leave with nothing (001's aion2.run capture, dungeon tips).
8. **The macro.** playhub's damage macro is Chain of Torment → Debilitating Mark → Condemnation → Judgment Thunder; expcarry's boss template repeats Condemnation to catch resets; BoredAF's dungeon editor lists Earth Punishment, Divine Aura, Earth's Retribution; Th3Ruthless's lists Light of Regeneration, Earth Punishment, Bolt (frames transcription). The record's chain puts Earth Punishment and Chain of Torment before Condemnation, cooldowns before filler, and Judgment Thunder last, the editor order 001 settled on.
9. **Entry model: conflict.** Both creators stack skills in one hotbar column and register only its row-0 skill as an entry; Antochi says the macro is "one step, that column"; playnews says a macro points to the hotbar button; a comment on Lucia's guide reports it alternates one skill per column. 001's in-game read took each entry as one skill. A chain with each skill on its own key and nothing stacked above it behaves the same under both readings, so the build's macro is written that way.
10. **Korean data is direction only.** The KR 2026-08-26 patch cut Earth Punishment's party share to 5% and raised Prayer of Amplification and Earth's Grace (`aion2hub-com-updates-aion-2-update-2026-08-26.md`); whether global carries it isn't stated in any capture.

| Source | Kind | Group stigmas for a damage Cleric | Debilitating Mark | Bolt | Macro | Date |
|---|---|---|---|---|---|---|
| expcarry | global guide | LoP / EP / NA / PoA | in rotation | manual | Condemnation repeated | 2026-10-06 |
| playhub | global guide | LoP / NA / EP / PoA | in macro | — | CoT → DM → Cond. → JT | 2026-10-06 |
| gameoverdrive (Aion 2 Maps) | global guide | LoP 10 / EP / NA / PoA 5 | developed later | charged, manual | opener only | 2026-10-05 |
| aion2.run offensive | sourced fan guide | EP / NA / PoA / LoP | core | core | — | 2026-10-05 |
| metabot | top-player usage | LoP / NA / EP / Summon Res. | 97% on bar | 97% on bar | — | captured 2026-10-10 |
| Antochi | video digest | EP / Yustiel's + LoP, PoA or Salvation | out (KR) | manual | one stacked column | 2026-10-07 |
| Th3Ruthless | video frames | — | — | in macro | LoR, EP, Bolt entries | 2026-10-09 |
| BoredAF | video frames | — | — | stacked with Condemnation | EP, DA, ER entries | 2026-10-05 |
| gamerblurb | global guide | Absolution / Salvation / Yustiel's / Summon Res. | in rotation | — | — | 2026-10-06 |

## The steelman

The case against: the Cleric is the party's only healer and only resurrection, so a dungeon build should be heal-first. gamerblurb's group set has no damage stigma at all, oslink's PvE set is Summon Resurrection, Earth Punishment and Salvation, and more top Clerics run Summon Resurrection than Prayer of Amplification. Answered: the user asked for damage first, and the record scopes the build to farmed or well-geared groups, with the switch back named in the build's why and in 001's `cleric-pve` healer build; the heals still reach 8 and Light of Regeneration runs in the macro; and the chest share (reasoning 7) punishes a Cleric who only heals.

The case for Antochi's set (Earth Punishment and Yustiel's Power fixed): it comes from the Korean meta, which has had the class longest. Answered: Korean parties play with more stigma slots and higher skill levels, and Yustiel's Power is the stigma top global Clerics run least (9.3%, metabot), behind every slot of the set chosen here.

The case for keeping Debilitating Mark out: Antochi and KR ranker data say its debuff is too small to be worth a cast. Answered: a global dummy tester in the comments reports more damage with it, and playhub and expcarry keep it. It stays last-but-one in the chain with a note to delete it if the meter drops; the cost of being wrong is one entry.

## Recommendation

**Dungeon DPS with off-heal (`cleric-pve-dps-offheal`, theory).** Keep it on its own skill preset, beside the healer preset.

| Rank | Skill | Target | Specialization | Why |
|---|---|---|---|---|
| 1 | Condemnation | 10 | +12% vs fewer targets; reset at 12 | The engine; crits inside Earth Punishment |
| 2 | Chain of Torment | 10 | +3 s DoT | Enables Condemnation; boss −5% Tolerance |
| 3 | Earth's Retribution | 10 | +20% Discharge trigger | Held left click, MP |
| 4 | Divine Aura | 10 | +50% attack speed | Free boss damage every 30 s |
| 5 | Bolt | 10 | +30% Skill Speed | Charged by hand inside Prayer |
| 6 | Judgment Thunder | 10 | +12% vs fewer targets | Filler, last in the macro |
| 7 | Healing Light | 8 | +2 consecutive uses | Manual off-heal |
| 8 | Radiant Recovery | 8 | removes up to 2 debuffs | Manual party heal and cleanse |
| 9 | Light of Regeneration | 8 | +20% healed at ≤50% HP | Party HoT in the macro |
| 10 | Empyrean Lord's Grace | 10 | — | +100 Crit |
| 11 | Earth's Grace | 10 | — | +10.5% Crit Damage |
| 12 | Debilitating Mark | 8 | −15% Defense | Contested |

At 38 (about 159 points): the six damage skills at 10 (126), Healing Light and Radiant Recovery at 8 (26), the rest into Light of Regeneration. Targets are invested levels, as in 001; the passives and the rest wait for levels 39–45 and Wisdom Stones.

Stigmas: 22 Light of Protection, 27 Earth Punishment, 32 Noble Aura, 37 Prayer of Amplification. Earth Punishment to 5 first (the crit), Noble Aura and Prayer to 5, then Light of Protection toward 10 (expcarry, gameoverdrive); playhub instead finishes Light of Protection at 20 first. The character hadn't obtained Light of Protection on 2026-10-10 (`account/snapshots/2026-10-10.json`). Swaps: Summon Resurrection for Prayer while the group still dies; Absolution for Light of Protection when a Chanter runs Undefeated Mantra.

**Macro `cleric-dungeon-dps-loop`.** Right Mouse Button, held together with Left Mouse (Earth's Retribution); 10 ms on every entry. Entries, top to bottom: Earth Punishment, Chain of Torment, Condemnation, Divine Aura, Light of Regeneration, Debilitating Mark, Judgment Thunder. Each skill on its own hotbar key with nothing stacked above it. Manual: Bolt (charged), Healing Light, Radiant Recovery, Light of Protection (toggle), Noble Aura, Prayer of Amplification, Summon Resurrection, Defiance.

Open sub-choices, with a recommendation each:

- **Fourth stigma.** Prayer of Amplification for farmed content; Summon Resurrection for the first clears. Recommended: Prayer, with Resurrection on the healer preset.
- **A second Condemnation entry.** Worth it only once Condemnation shows 12 with the reset picked (expcarry). Recommended: add it then, right after the first.
- **Skill Queue.** BoredAF turns it off so Condemnation fires; Antochi and expcarry turn it on. Recommended: test both on the dummy with the DPS meter.

## What would change

Nothing outside this record. Once the snapshot is rebuilt with it, the build is a second current Cleric PvE build; which build the roadmap ranks against is the server's rule (the first current build of the class), not this record's.

## Side findings

- **001's macro entry model may be wrong.** The frames in `evidence/02-youtube/macro-frames-transcription-2026-10-10.md` and Antochi's description point to an entry firing its hotbar column, against 001's mechanic "A macro entry is one skill, not a hotbar column" (confidence `tested`). Surfaced for the user; settling it needs the macro held in game with a stacked column. Not filed as a follow-up file here (the record's branch doesn't reach `.ai/followups/` in the main checkout).
- **Global might not carry the KR 2026-08-26 Cleric changes.** Light of Protection reads +10.5% in the global client (001); the KR patch's numbers aren't on global pages. Consciously dropped until a global patch note exists.

## Sources

- https://expcarry.com/aion-2-cleric-guide — the hybrid boss-healer set, stigma upgrade order, macro templates.
- https://playhub.com/blog/aion-2/best-builds-for-each-class-978315 — healer that maximises damage; damage macro.
- https://gameoverdrive.com.br/aion-2-builds-cleric-ranger-assassin/ — Aion 2 Maps' global Cleric set and stigma levels, the Condemnation combo, the Chanter buff rule.
- https://gamerblurb.com/guides/aion-2-cleric-build-guide-pve-pvp-leveling-global — the defensive counter-view.
- https://metabot.gg/en/aion-2/classes/cleric/build — top-player stigma and skill usage, specialization options (recaptured).
- https://vortexgaming.io/postdetail/730212 — KR ranker skill statistics (direction only).
- https://aion2hub.com/updates/aion-2-update-2026-08-26 — KR party-synergy and Cleric changes.
- https://www.oslink.io/blog/guide/aion-2-cleric-build-guide.html and https://pixelnitro.com/?p=20616 — generic guides, heal-first or pre-launch; low weight.
- YouTube `-86sdRZ4SX4` (Antochi), `5Dy9OA_NEzs` (Th3Ruthless), `tYxkzfd_9-A` (BoredAF), `KptUtnv35vk` (Lucia) — macro setups, stigma views, the column question; frames from the second and third.
- From record 001: aion2.run's Cleric page (offensive dungeon build, chest share), keengamer, allthings.how, playnews, and the 2026-10-10 in-game read.
- Not used: https://www.inven.co.kr/board/aion2/6452/24018 (the post body is images; the capture holds only the board chrome); `sPYma2Jzy-Y` (digest with no description); `w_cmBSY_CpE` (August, before global, digest without a setup).

## Files

- `evidence/captures.jsonl` — the capture ledger.
- `evidence/01-guides/expcarry-com-aion-2-cleric-guide.md` — expcarry Cleric guide.
- `evidence/01-guides/playhub-com-blog-aion-2-best-builds-for-each-class-978315.md` — playhub builds per class.
- `evidence/01-guides/gameoverdrive-com-br-aion-2-builds-cleric-ranger-assassin.md` — gameoverdrive builds (Portuguese).
- `evidence/01-guides/gamerblurb-com-guides-aion-2-cleric-build-guide-pve-pvp-leveling-global.md` — gamerblurb Cleric guide.
- `evidence/01-guides/metabot-gg-en-aion-2-classes-cleric-build.md` — metabot recapture.
- `evidence/01-guides/vortexgaming-io-postdetail-730212.md` — KR ranker statistics.
- `evidence/01-guides/aion2hub-com-updates-aion-2-update-2026-08-26.md` — KR patch notes, 2026-08-26.
- `evidence/01-guides/oslink-io-blog-guide-aion-2-cleric-build-guide-html.md` — oslink Cleric guide.
- `evidence/01-guides/pixelnitro-com.md` — pixelnitro Cleric guide.
- `evidence/01-guides/inven-co-kr-board-aion2-6452-24018.md` — Inven post, empty body (not used).
- `evidence/02-youtube/ytq-*.html` — the YouTube searches in `searches.json`.
- `evidence/02-youtube/yt-<id>.html` and `yt-<id>.txt` — watch pages and digests.
- `evidence/02-youtube/video/` — the BoredAF and Th3Ruthless videos (local only).
- `evidence/02-youtube/frames-tYxkzfd_9-A/`, `frames-5Dy9OA_NEzs/` — frames every 5 s across their macro sections (local only).
- `evidence/02-youtube/macro-frames-transcription-2026-10-10.md` — what those frames show: editor entries, hotbar stacks, specialization picks.
- `curated/` — the dataset the app imports (`manifest.json` lists the collections).
- `research-trail.md` — the search rounds.
- `searches.json` — the saved searches.
