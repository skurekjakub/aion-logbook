---
url: null
captured_at: 2026-10-10T11:21:20+02:00
title: Global client, Skill window and macro editor, read from a 1 fps recording
---

# Global client: the Skill window and the macro editor (2026-10-10)

- captured: 2026-10-10, 11:21:20 to 11:23:02 (+02:00)
- client: AION2.exe, Steam global, English, 1920×1080
- character: Baon, Cleric, level 36 (`account/snapshots/2026-10-10.json`)
- method: Windows Graphics Capture through ffmpeg `gfxcapture` at 1 fps while the user clicked; the agent sent no input. Frames are local only (`account/snapshots/screens/2026-10-10/tour/f-0001.png` onwards); the ones this file transcribes are copied beside it.

Transcribed verbatim from the frames; coordinates are client pixels.

## `skill-window-mastery-f-0060.png` (11:22:20)

Skill window, Mastery tab. Top right: a `Macro` button (1513,140 to 1693,180) and preset buttons `1` `2` `3` (1 selected). Below them the `Active` grid, then the `Passive` grid. Bottom right: `Level Up` with the key hint `F` and its cost.

The hotbar block at the bottom of the window shows each hotbar key as a column with row labels `3`, `2`, `1`, `0` from top to bottom (rows 0 to 3 at x 1332). The key labels under the columns read `1` to `8`, `Q`, `E`, `R`, `T`. The `T` column holds, from row 0 up: `Lv. 12` (Chain of Torment's icon), `Lv. 12` (Debilitating Mark's), `Lv. 10` (Condemnation's), `Lv. 11` (Judgment Thunder's). The `Q` column holds `Lv. 9` (Light of Regeneration's) at row 0 and `Lv. 10` (Healing Light's) at row 1.

## `macro-editor-entries-f-0066.png` (11:22:26)

A dialog titled `Macro` with an `i` icon beside the title and a close `X` (1253,134). Entries, numbered down the left from the top:

| Entry | Icon key label | Name under the icon | Delay field |
| --- | --- | --- | --- |
| 1 | T, Lv. 12 | Chain of Torment | `10` ms |
| 2 | 1, Lv. 9 | Bolt | `10` ms |
| 3 | R, Lv. 10 | Earth's Retribution | `10` ms |
| 4 | R, Lv. 10 | Earth's Retribution | `10` ms |
| 5 | R, Lv. 10 | (cut off by the list's bottom edge) | |

Each entry has one skill icon, one name, one `Delay [ ] ms` field and a trash-can icon at the right (x ≈ 1214). An `Add Macro` button sits under the list (851,905 to 1069,955).

## `macro-editor-empty-f-0068.png` (11:22:28)

The same dialog with no entries. Centre text: `No macros available.` / `You can register a new macro with the Add Macro button.` The `Add Macro` button is unchanged.

## `macro-editor-add-f-0069.png` (11:22:29)

One second later, the cursor on `Add Macro`: a single entry `1`, icon `R`, `Lv. 10`, name `Earth's Retribution`, `Delay 10 ms`, trash-can icon.

## Not shown in these frames

- How an entry's skill is changed to another skill.
- The order the macro runs its entries when its key is held.
- The text behind the `i` icon next to the `Macro` title.
- The maximum number of entries.
