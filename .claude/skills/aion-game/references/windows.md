# Window map

Client coordinates (1920×1080, origin top-left) of the HUD and of each window's tabs, buttons and slots. A
value marked **≈** was estimated from a passive shot and is still to be confirmed by opening the window;
replace it with the measured value and the date. Add a row for every hotkey and coordinate used, as it's
found.

**Pointer input doesn't land.** The client pins the cursor and ignores injected mouse motion, so
`pnpm game click|rclick|drag|scroll` change nothing (tried 2026-10-10). Keys do land. The coordinates below are
for reading shots and frames, cropping them, and telling the user where to click.

## HUD (passive shot, 2026-10-10)

**Top-right icon row** (y ≈ 32), each icon labelled with its hotkey letter:

| Key | Icon centre (x, y) | Opens |
| --- | ------------------ | ----- |
| G   | ≈ 1590, 32         | to confirm |
| H   | ≈ 1640, 32         | to confirm |
| U   | ≈ 1690, 32         | to confirm |
| I   | ≈ 1737, 32         | to confirm |
| K   | ≈ 1790, 32         | the Skill window (key confirmed 2026-10-10) |
| J   | ≈ 1845, 32         | to confirm |
| —   | ≈ 1882, 32         | unlabelled icon |

**Hotbars**, bottom-centre, either side of the level portrait (≈ 960, 975):

| Row   | y      | Keys, left to right                                                             | First slot centre |
| ----- | ------ | ------------------------------------------------------------------------------- | ----------------- |
| upper | ≈ 993  | X, F1–F4, then right of the portrait F5–F8, B                                   | X ≈ 695           |
| lower | ≈ 1048 | 1–8, then Q, E and further slots; round V button left (≈ 617), C right (≈ 1300) | 1 ≈ 677           |

Lower-row slots 1–8 sit ≈ 50 px apart.

## Windows

### Skill window

- **Opens with:** key `K`. `{Right}` does nothing in it.
- **Closes with:** close button (1880, 43); `{Esc}` not tried.
- **Confirmed:** 2026-10-10, from a 1 fps recording while the user clicked (`account/snapshots/screens/2026-10-10/tour/`).

| Element | Kind | Centre (x, y) | Region for crops (x y w h) | Notes |
| ------- | ---- | ------------- | -------------------------- | ----- |
| Mastery | tab | 860, 85 | 770 62 180 46 | skill levels, hotbar, the Macro button |
| Stigma | tab | 1065, 85 | 975 62 180 46 | owned stigmas bright, the rest padlocked |
| Selected skill | panel | — | 30 140 400 400 | name with `(+N)` gear bonus, level, specialty options, cooldown |
| Macro | button | 1603, 160 | 1513 140 180 40 | opens the macro editor |
| Presets 1, 2, 3 | buttons | 1768 / 1815 / 1862, 160 | 1745 140 135 40 | the selected preset is outlined |
| Active grid (Mastery) | slots | x 1548 / 1623 / 1697 / 1771 / 1845; y 265 / 340 / 414 | 1511 228 372 224 | 68 px icons; hotbar key top-left, `Lv. N` bottom; unlock order, row by row |
| Passive grid (Mastery) | slots | same x; y 549 / 623 | 1511 512 372 150 | unlock order, row by row |
| Stigma grid (Stigma tab) | slots | same x; y 265 / 340 / 414 | 1511 228 372 224 | the official data's `Dp` order, row by row |
| Hotbar block | slots | columns x 641 / 698 / 755 / 812 / 875 / 932 / 989 / 1046 (keys 1–8), 1108 / 1165 / 1222 / 1279 (Q, E, R, T); rows y 950 / 893 / 836 / 779 (rows 0–3) | 612 748 698 292 | row labels 0–3 at x 1332, row 0 at the bottom; key labels at y ≈ 1010 |
| Points counter | counter | region centre 1672, 963; digit ≈ 1729, 962 | 1598 948 148 30 | without Reset (`f-0060`); skill points on Mastery, stigma points on Stigma |
| Points counter | counter | region centre 1704, 963; digit ≈ 1761, 962 | 1630 948 148 30 | with Reset shown (`f-0016`, `f-0047`) |
| Reset | button | ≈ 1544, 1016 | — | shown when the selected skill or stigma has levels above 1 to refund; absent for a level-1 passive or a padlocked stigma |
| Level Up (`F`) | button | 1697, 1016 | 1513 990 368 52 | without Reset; shows the cost |
| Level Up (`F`) | button | 1730, 1016 | 1580 990 300 52 | beside Reset; greyed with the cost in red when points fall short; reads `Max Level` at invested 10 (`f-0031` to `f-0040`) |
| Acquire (`F`) | button | 1697, 1016 | 1513 990 368 52 | in place of Level Up for a padlocked stigma, which shows `Lv. 1`; costs 1 (`f-0005` to `f-0027`) |

### Macro editor

- **Opens with:** the Skill window's Macro button (1603, 160).
- **Closes with:** close button (1253, 134).
- **Confirmed:** 2026-10-10, same recording.

| Element | Kind | Centre (x, y) | Region for crops (x y w h) | Notes |
| ------- | ---- | ------------- | -------------------------- | ----- |
| Dialog | window | — | 643 110 633 860 | title `Macro` with an `i` help icon (997, 144), not opened |
| Entry rows | list | number x ≈ 685; rows y ≈ 244 / 400 / 555 / 710 / 865 | — | one skill per entry, numbered from the top; about 155 px apart; the list scrolls |
| Entry skill icon | slot | 960, entry y − 14 | 925 195 72 72 (entry 1) | how to swap its skill wasn't seen |
| Entry delay | field | 966, entry y + 79 | 924 308 84 32 (entry 1) | ms; default 10 |
| Entry trash can | button | 1214, entry y | — | deletes the entry |
| Add Macro | button | 960, 930 | 851 905 218 50 | appends an Earth's Retribution entry |
| Empty state | text | dialog centre | — | "No macros available. You can register a new macro with the Add Macro button." |

Still to map:

- Settings > Key Settings > General > Gameplay > Macro, where the macro key binds.
- The Character window.
- The HUD icons marked "to confirm".
