# Macro editor and hotbar frames, transcribed (2026-10-10)

Read by eye from frames sampled every 5 s (`pnpm capture youtube frames`, threshold dedup) out of two downloaded global-client videos. The frames and the videos stay local; their ledger lines are committed. Skills on the hotbar were identified by matching each icon to the tooltip the creator opened over it in a nearby frame; an icon never opened in a tooltip is marked "unidentified".

## BoredAF, "AION 2: Cleric Macro Guide - 2 Button Gameplay" (`tYxkzfd_9-A`, published 2026-10-05)

Section "PvE Dungeon / Boss Macro" (0:32).

- `frames-tYxkzfd_9-A/f-00m35.0s.jpg`, the Macro dialog open over the Skill window, preset 1:
  - Entry 1: Earth Punishment, icon badge `4`, Lv. 10, `Delay 10 ms`.
  - Entry 2: Divine Aura, icon badge `2`, Lv. 14, `Delay 10 ms`.
  - Entry 3: Earth's Retribution, icon badge `R`, Lv. 16, `Delay 10 ms`.
  - Entries numbered 1, 2, 3 from the top, a trash can on each, `Add Macro` below.
  - The badge in each entry icon's corner is the hotbar key the skill sits on (the same badges appear on the Active grid at the right).
- Earth's Retribution tooltip (same frame): `(+6)`, specialties highlighted `+20% [Discharge] Chain Skill trigger chance` and `-7s [Bolt] cooldown on landing [Discharge]`; `+20% MP restored` and `+50% Multi-Hit on hit` dimmed.
- `f-01m15.0s.jpg`, `f-01m20.0s.jpg`, Bolt tooltip: `Bolt Lv. 10 (+4)`, highlighted `+30% Skill Speed` and `Up to +20% damage when less targets hit`; `16 Critical Hit on hit` locked; cooldown 45s, 3 charge levels.
- `f-01m40.0s.jpg`, Condemnation tooltip: `(+4)`, highlighted `Up to +12% damage when less targets hit` and `Resets cooldown on landing a Critical Hit...`; `16 Multi-Hit on hit` locked; cooldown 3s.
- Hotbar, rightmost key's column (rows 0 to 3, bottom to top): row 0 a purple lightning icon Lv. 14 (unidentified; the Judgment Thunder slot in other guides), row 1 a purple icon Lv. 14 (unidentified), row 2 Condemnation Lv. 14 (matches the tooltip icon), row 3 Bolt Lv. 14 (matches the tooltip icon). Only one other key holds a second row.
- Overlay text bottom right: `Cleric 1 = 80.7k`, `Cleric 2 = 65k` (his comparison of two setups; not explained in the frame).

## Th3Ruthless, "The ONLY AION 2 Cleric Macro Guide You Need | PvE & PvP" (`5Dy9OA_NEzs`, published 2026-10-09)

Section "My Cleric macro sequence explained" (3:50).

- `frames-5Dy9OA_NEzs/f-04m05.0s.jpg`, the Macro dialog, preset 1:
  - Entry 1: Light of Regeneration, icon badge `5`, Lv. 13, `Delay 10 ms`.
  - Entry 2: Earth Punishment, Lv. 15, `Delay 10 ms` (badge not legible).
  - Entry 3: Bolt, icon badge `4`, Lv. 16, `Delay 10 ms`.
- `f-04m45.0s.jpg`, `f-05m20.0s.jpg`, the hotbar with the dialog closed:
  - The key whose row 0 is Light of Regeneration (Lv. 13) holds three more rows: row 1 an orange icon Lv. 10 (unidentified), row 2 a purple icon Lv. 14 (unidentified), row 3 a red icon Lv. 16 that matches Condemnation's Lv. 16 on the Active grid.
  - The rightmost key's column: row 0 Earth Punishment Lv. 15, row 1 an orange icon Lv. 17 (the Divine Aura icon from BoredAF's dialog), row 2 a purple lightning icon Lv. 5 (unidentified), row 3 a red icon Lv. 14 (unidentified).
  - So each macro entry shows the skill in row 0 of a stacked hotbar column, and the stacked skills above it never appear as entries of their own.
- Earth's Retribution tooltip (same frames): `(+4)`, highlighted `+20% [Discharge] Chain Skill trigger chance` and `-7s [Bolt] cooldown on landing [Discharge]`.

## What the frames do and don't show

- Shown: an entry is drawn as one skill icon with its hotbar key badge and its own delay, numbered from the top; both creators stack several skills in one hotbar column and register only that column's row-0 skill in the editor.
- Not shown: whether the macro fires the whole column behind an entry or only the drawn skill, and in which order entries run. The creators' setups only make sense if the column fires, which Antochi's description says outright ("one step, that column").
