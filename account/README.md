# account

The character as read from the Aion 2 client, and what's left to apply from the research.

| Path | What it holds |
|---|---|
| `snapshots/<id>.json` | A read of the character (`aion-account-snapshot/1`, `packages/schema/src/account.ts`). The id leads with the day; `<day>-after` is a re-read after applying. |
| `roadmap-<id>.json` | The next actions ranked against snapshot `<id>` (`aion-account-roadmap/1`), most urgent first, each pointing at the record it follows. |
| `apply-log-<day>.md` | What changed in the game that day, each change with its before and after evidence. |
| `snapshots/screens/<day>/` | The shots and recording frames a snapshot was read from. Local only, gitignored. |

`pnpm import:account` loads the latest snapshot and its roadmap into the database (`README.md` § The database); `--replace` reloads one already loaded.

## How a snapshot is read

- **Pointer input doesn't land.** The client pins the cursor and ignores injected mouse motion and clicks, so `pnpm game click|drag` change nothing. Keys work (`K` opens the Skill window). The read is guided: the user clicks, the agent records and reads.
- **Record, don't drive.** A background `ffmpeg` `gfxcapture` recording at 1 fps writes frames into `snapshots/screens/<day>/tour/` while the user opens each window and tab. Contact sheets (ffmpeg `tile`) find the frames worth reading; crops at 2× make small text legible. `.claude/skills/aion-game/SKILL.md` has the commands.
- **Windows read:** the Skill window (`K`): Mastery tab for skill levels and the hotbar, Stigma tab, the Macro button's editor. Coordinates are in `.claude/skills/aion-game/references/windows.md`.
- **Character facts** (name, server, level, item level) come from the official site's public data (`research/002-character-data-source`), not from a game window.
- **Safety:** out of combat, solo, in a safe zone, and no input at all while the user plays. AGENTS.md § Game bridge holds the rule.

## Reading a snapshot

- **Levels are totals**, the gear bonus included: the Skill window shows `Lv. 12` on the icon and `(+2)` beside the name.
- **`slot` is the hotbar key**; a key holding a stack is `<key>·<row>`, row 0 at the bottom (the row the game tries first), as the Skill window's hotbar block labels them.
- **Names are the client's English names**, matched to the record's `curated/skills.json`. Truncated names in the UI (`Empyrean Lord's …`) are completed by the grid's unlock order and the official data's skill list.
- **Stigma `slotLevel`** isn't shown by the game or published by the site; a snapshot maps equipped stigmas onto the open slots by hotbar key and says so in `unread[]`.
- **`unread[]`** lists what the read didn't reach or couldn't settle.

## 2026-10-10

Read from the recording `snapshots/screens/2026-10-10/tour/` (11:21 to 11:23, +02:00) after the user had spent skill points; the macro shown is the one first seen, which the user cleared minutes later (`apply-log-2026-10-10.md`).

- **Character:** Baon, Fafnir (EU), Asmodian Cleric, level 36; item level 749 as `gearScore` (combat power 33293). Source: `research/002-character-data-source/evidence/03-api/character-info-baon.json`.
- **Skill points:** 2 left; Radiant Recovery's Level Up costs 2 (frame `f-0047`). **Stigma points:** 1; a stigma level costs 2 (frame `f-0001`).
- **Stigmas, two sources that disagree on one stigma:**

  | Stigma | Game, Stigma tab (`f-0001`) | Official data (`character-equipment-baon.json`, 11:11) |
  |---|---|---|
  | Prayer of Amplification | owned, Lv 3, key 4 | equipped, Lv 3 |
  | Earth Punishment | owned, Lv 4, key 5 | equipped, Lv 4 |
  | Noble Aura | owned, Lv 6, key 6 | equipped, Lv 6 |
  | Voice of Doom | padlock | equipped, Lv 0 |
  | Power Burst | padlock | acquired, not equipped, Lv 0 |
  | Light of Protection and the rest | padlock | not acquired |

  The snapshot lists the stigmas the game shows owned and carries Voice of Doom in `unread[]`; the roadmap has a check for it.
- **Skill levels against the official data:** Debilitating Mark, Divine Aura and Chain of Torment read higher in game than in the 11:11 official data, matching the points the user spent (`apply-log-2026-10-10.md`); every other level agrees.
