---
name: aion-game
description: Use when the running Aion 2 client has to be read or driven — "read my character", "audit my account", "snapshot my skills", "apply the build", "set up skills/stigmas/macros", "level my skills", "slot my stigmas", "bind the macro", "drive the game", "what does my hotbar look like". Covers the game bridge (`pnpm game shot|crop|key|click|rclick|drag|scroll|focus|back`), the read-one-window loop, the apply loop and the stop rules. Not for researching what the build should be (deep-research) and never for combat, parties, bots or anything that reads memory or packets.
---

# Driving the Aion 2 client

The game bridge reads the client by window capture and drives its menus with ordinary keyboard and mouse
input. Every read is a PNG you look at yourself; every input is followed by a shot you read before the next
one. Code: `packages/game` (capture and argument checks) and `tools/aion-input/aion.ahk` (the AutoHotkey v2
script that sends the input).

**Clicks don't land.** The client pins the cursor and ignores injected pointer motion, so `click`, `rclick`,
`drag` and `scroll` change nothing in it (seen 2026-10-10). Keys land: `K` opens the Skill window. In
practice the bridge is read-only plus keys, and anything that needs the mouse runs as a guided read: the user
clicks, you record and read (below).

## Preconditions — check before the first input, every session

- `AION2.exe` is running with a 1920×1080 client (a shot warns when the frame is another size; every
  coordinate in `references/windows.md` assumes 1920×1080).
- The character is **out of combat, solo and in a safe zone**. Take `pnpm game shot hud` and look: no target
  frame, no party frame, no combat indicator, no mobs around. If any of these is in doubt, don't send input;
  wait and re-shoot.
- The user knows you're about to take the keyboard and mouse: input focuses the game window, so it steals
  focus from whatever they were doing. `pnpm game back` returns it.
- AutoHotkey v2 is installed (`%LOCALAPPDATA%\Programs\AutoHotkey\v2\AutoHotkey64.exe`, or set `AION_AHK`),
  and `ffmpeg` with the `gfxcapture` filter is on PATH.

## Commands

Run from the repo root. Each prints the path of the PNG it wrote under
`account/snapshots/screens/<date>/`.

| Command                                         | Does                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm game shot <name>`                         | Captures the window, even behind others, without focusing it. Never sends input.                                                               |
| `pnpm game crop <name> <x> <y> <w> <h> [--scale n]` | Cuts a region out of today's `<name>.png` into `<name>-crop-<x>-<y>-<w>-<h>.png`; `--scale 2` or `3` makes small UI text legible.          |
| `pnpm game focus`                               | Brings the game to the front, remembering the window it replaced.                                                                              |
| `pnpm game key "<keys>"`                        | Sends AutoHotkey `Send` syntax: `i`, `{Esc}`, `{Enter}`, `^a` (Ctrl+A), `+{Tab}` (Shift+Tab), `{#}` (a literal #), `{Down 3}`. Menu keys only: typed characters, `+ ^ !` prefixes, and the braced keys allowed by `MENU_KEYS` in `packages/game/src/input.ts`. Everything else (mouse, Windows key, `down`/`up`, vk/sc codes, media keys) and system chords such as Alt+F4 or Ctrl+Alt+Delete are refused. |
| `pnpm game click <x> <y>` / `rclick <x> <y>`    | Left or right click at a client point.                                                                                                          |
| `pnpm game drag <x1> <y1> <x2> <y2>`            | Press at the first point, move, release at the second: skill to hotbar, stigma to slot.                                                         |
| `pnpm game scroll <x> <y> <n>`                  | Wheel notches over a point; positive scrolls up, negative down, at most 20 per call.                                                            |
| `pnpm game back`                                | Re-activates the window that was in front before the first input. Takes no shot and works with the game closed.                                 |

Every input verb except `back` then shoots `<n>-after-<verb>.png` and prints its path: read it before the
next command. Coordinates outside 0–1919 × 0–1079 are refused before anything reaches the game. `aion.ahk`
exits 10 when the game window is missing, 11 when the window isn't (or stops being) in front, and 12 on a
refused verb or argument; the CLI prints the reason. A failed capture leaves no file behind, so a shot path
that prints is always the new frame.

## Reading one window

1. Open it: its hotkey from `references/windows.md` (`pnpm game key i`), or a click on its HUD icon.
2. Read the after-shot. Is the window open, on the expected tab? If not, stop and look.
3. Crop the regions that carry text (`pnpm game crop 004-after-key 300 200 600 400 --scale 2`) and read them.
   Scroll lists one step at a time, shooting each step, until the list stops changing.
4. Close it (`pnpm game key "{Esc}"`) and confirm from the after-shot that it closed.
5. Record every hotkey and coordinate you used or found into `references/windows.md`, so the next session
   clicks from the map instead of rediscovering it.

Write what you read into the account snapshot as you go, with `unread[]` for anything you couldn't read; never
fill a value from memory or from a guide.

## Sync first, read the rest

`pnpm sync` (`packages/armory`) reads the character from the official site's public data without touching
the client: name, class, level, item level, server, every skill and stigma with its level, and which stigmas
are equipped. Run it before a read; the game read is then only for what the site doesn't publish.

- **From the site:** levels, gear score, equipped stigmas. The sync writes `account/snapshots/<date>.json`,
  imports it and exports the database; `--no-push` stops before the commit.
- **From the game read:** hotbar slots, macro chains and their keys, stigma slot positions, specialization
  picks. The sync carries these from the latest snapshot and lists what it can't settle in `unread[]`.
- **When they disagree** (Voice of Doom equipped at level 0 online, padlocked in game, 2026-10-10): the game
  read wins for what the client shows; note the disagreement in `unread[]` and the roadmap.
- **Order on one day:** sync, then read. A sync after a game read replaces that day's file: it keeps the
  read's macros, slots and notes but takes levels and stigmas from the site, which can lag the client.

## Guided read (the user clicks, you record)

When a window or tab needs the mouse, record the client while the user works through it, then read the frames.

1. Tell the user which windows and tabs to open, in order, and to pause a second on each.
2. Start a 1 fps recording in the background (cursor kept, so the frames show what was clicked):

   ```sh
   mkdir -p account/snapshots/screens/<date>/tour
   ffmpeg -filter_complex "gfxcapture=window_exe=AION2.exe,hwdownload,format=bgra,fps=1" \
     account/snapshots/screens/<date>/tour/f-%04d.png
   ```

   Stop it (`q`, or stop the background task) when the user says they're done.
3. Find the frames worth reading with contact sheets, one per run of frames:

   ```sh
   ffmpeg -start_number 61 -i account/snapshots/screens/<date>/tour/f-%04d.png -frames:v 1 \
     -vf "scale=480:-1,tile=6x7" <scratch>/sheet-61.png
   ```

4. Read the chosen frames full size, and crop text regions (`ffmpeg -i f-0066.png -vf "crop=w:h:x:y,scale=iw*2:-1"`)
   using `references/windows.md` for the regions.
5. Each frame's mtime is its capture time: put the first frame's time in the snapshot's `capturedAt`, and the
   frames read in its `screens[]`.

A frame that a research record cites goes into the record's `evidence/` as a copy, with a ledger line from
`pnpm capture log … --tool manual --at <frame time>`, and a text transcription beside it so the record reads
without the media.

## Applying a change

A change that needs the mouse is made by the user, by hand, from a walkthrough you write (the roadmap's
actions, with the coordinates from `references/windows.md`); log it from the guided read's frames. A change
that keys alone can make follows the loop below.

One action, one shot, one check:

1. State the change and the expected result ("Skill X: Lv. 3 → 4, points 5 → 4").
2. Send one input.
3. Read the after-shot and compare with the expected result.
4. Matches: log it (action, before-shot, after-shot) and go to the next. Anything else: stop.

Multi-step edits (the macro editor, key settings) follow the same rule per step. Save dialogs and confirm
buttons are read before they're clicked; a "discard changes" or "reset" prompt is never confirmed.

## Stop rules

Stop sending input, take a shot, `pnpm game back`, and tell the user, when:

- the character enters combat, is attacked, joins or is invited to a party, or anything moves the camera;
- a shot shows a window, dialog, tab or value you didn't expect, or the expected change didn't happen;
- a dialog asks to spend premium currency, buy, sell, delete, reset, or confirm anything not in the plan;
- `pnpm game` exits non-zero, or a shot warns about the frame size;
- the user takes the mouse or keyboard back.

Never: input during combat or in a party, combat rotations or macros that play the game, loops that act without
reading the shot, memory reading, packet capture, injection. AGENTS.md § Game bridge holds the rule.

## Where outputs go

- Shots and crops: `account/snapshots/screens/<date>/` — local only, gitignored, never committed.
- What was read: `account/snapshots/<date>.json` (`aion-account-snapshot/1`, loaded by `pnpm import:account`),
  and `account/snapshots/<date>-after.json` when re-read after applying.
- What's left to apply: `account/roadmap-<date>.json` (`aion-account-roadmap/1`), ranked against that day's snapshot.
- What was changed: `account/apply-log-<date>.md` — each change with its before and after shot names.
- Recording frames: `account/snapshots/screens/<date>/tour/` — local only, like the shots.
- Window hotkeys and coordinates: `references/windows.md`.
