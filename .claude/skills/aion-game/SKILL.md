---
name: aion-game
description: Use when the running Aion 2 client has to be read or driven — "read my character", "audit my account", "snapshot my skills", "apply the build", "set up skills/stigmas/macros", "level my skills", "slot my stigmas", "bind the macro", "drive the game", "what does my hotbar look like". Covers the game bridge (`pnpm game shot|crop|key|click|rclick|drag|scroll|focus|back`), the read-one-window loop, the apply loop and the stop rules. Not for researching what the build should be (deep-research) and never for combat, parties, bots or anything that reads memory or packets.
---

# Driving the Aion 2 client

The game bridge reads the client by window capture and drives its menus with ordinary keyboard and mouse
input. Every read is a PNG you look at yourself; every input is followed by a shot you read before the next
one. Code: `packages/game` (capture and argument checks) and `tools/aion-input/aion.ahk` (the AutoHotkey v2
script that sends the input).

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

## Applying a change

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
- What was changed: `account/apply-log-<date>.md` — each change with its before and after shot names.
- Window hotkeys and coordinates: `references/windows.md`.
