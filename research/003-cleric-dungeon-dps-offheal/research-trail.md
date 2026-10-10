# Research trail: 003 Cleric dungeon DPS with off-heal

Run on 2026-10-10 from a worktree branch off `main`. Search results are leads, not findings: a claim reaches the README only once its page is captured under `evidence/`. Record 001 already held the client-data sources (metabot, aion2.run, keengamer, the macro guides, the in-game read); this record reuses their captures by source id and adds what 001 didn't ask about, the damage-first group build. The searches worth rerunning are in `searches.json`.

## Round 1 — survey

Queries:

- `Aion 2 Cleric DPS build dungeon hybrid healer global`
- `Aion 2 battle cleric damage build stigmas Earth Punishment Noble Aura Prayer of Amplification`
- `아이온2 치유성 딜 세팅 던전 딜힐 스티그마`

Synthesis: the English results are mostly general class guides, several written before the global launch (pixelnitro, 2026-09-27; oslink, 2026-10-01); they agree the Cleric should attack whenever nobody needs healing but give heal-first PvE stigma sets. Two global guides name a damage-leaning group build outright: playhub's Cleric "Group-Healing Build" ("enough healing power to cover just enough of the encounter damage, then wants to get as much personal damage as possible") with Light of Protection, Noble Aura, Earth Punishment and Prayer of Amplification, and gameoverdrive's Portuguese guide built on Aion 2 Maps' global Cleric plan, the same set at stigma levels 10/5/5/5. The Korean results are ranker statistics (vortexgaming 730212, KR service, levels past 10 and more stigma slots) and an Inven post whose body is images, captured empty: not used. metabot was recaptured: the top-player stigma picks are unchanged from 001's capture the same morning (Light of Protection 87%, Noble Aura 79%, Earth Punishment 65%, Summon Resurrection 64%, Prayer of Amplification 50%).

## Round 2 — deepen

Queries:

- `aion2maps cleric build global`
- `Aion 2 cleric "dps" dungeon reddit global launch healer damage contribution`
- `Aion 2 cleric macro dungeon Condemnation Chain of Torment Light of Regeneration October 2026`

Synthesis: no aion2maps page surfaced; gameoverdrive stays the route to its plan. expcarry (2026-10-06, captured) is the most complete global hybrid guide: a "Standard Boss Healer" set identical to playhub's, a stigma upgrade order (Light of Protection to 10, then Earth Punishment toward 15 and 20), skill targets past 10 and macro templates that repeat Condemnation to catch its crit reset. gamerblurb (2026-10-06, captured) is the counter-view: group stigmas Absolution, Salvation, Yustiel's Power and Summon Resurrection, no damage slot. The KR 2026-08-26 patch note (captured) moved the Cleric's party buffs into its own damage (Earth Punishment's party share to 5%, Prayer of Amplification and Earth's Grace up); whether the global client carries it isn't stated anywhere captured. No Reddit thread surfaced.

## Round 3 — verify and harden

Queries:

- YouTube (`pnpm capture youtube search`): `aion 2 cleric dps build`, `aion 2 cleric dungeon guide`
- `Aion 2 global patch notes October 2026 Cleric balance`
- `Aion 2 macro entry hotbar column key registers whole column cleric global test`

Synthesis: the YouTube searches gave the week-one global Cleric macro videos; digests were captured for Antochi, Th3Ruthless, BoredAF, Lucia, jinxan and MR4KTV (none has captions). Antochi maps the Korean meta onto global: Condemnation 51% of damage on a Korean meter, Earth Punishment and Yustiel's Power as the fixed stigmas, and a macro that is "one step, that column". BoredAF's and Th3Ruthless's videos were downloaded and sampled every 5 s across their macro sections; the frames (local only) are transcribed in `evidence/02-youtube/macro-frames-transcription-2026-10-10.md`. Both creators register only the row-0 skill of stacked hotbar columns in the editor, which only makes sense if an entry fires its whole column, against 001's reading that an entry is one skill. Th3Ruthless puts Bolt in the macro; the others keep it manual. No global patch since launch surfaced; the latest Cleric changes found are Korean.

Final takeaways, each tied to its capture:

- The damage-leaning group build is Light of Protection, Earth Punishment, Noble Aura and Prayer of Amplification (expcarry, playhub, gameoverdrive, aion2.run's offensive build); top players put Summon Resurrection in the fourth slot more often than Prayer (metabot).
- Condemnation is the engine: Chain of Torment to enable it, Earth Punishment at 5 for the crit, the reset at skill 12 (gameoverdrive, expcarry, metabot, Antochi).
- Debilitating Mark, Bolt in the macro, Skill Queue and the column question are open conflicts, each with both sides captured.
