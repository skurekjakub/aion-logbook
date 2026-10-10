# aion-input

`aion.ahk` is the AutoHotkey v2 script behind `pnpm game focus|back|key|click|rclick|drag|scroll`. It focuses
the AION2 window and sends one ordinary keyboard or mouse input to it. Don't run it directly: `pnpm game`
checks the arguments against the 1920×1080 client first and shoots the result afterwards.

How to use the bridge, its preconditions and its stop rules: `.claude/skills/aion-game/SKILL.md`. Window
hotkeys and coordinates: `.claude/skills/aion-game/references/windows.md`.

- Interpreter: `AION_AHK`, defaulting to `%LOCALAPPDATA%\Programs\AutoHotkey\v2\AutoHotkey64.exe`.
- Syntax check without running it:
  `"%LOCALAPPDATA%\Programs\AutoHotkey\v2\AutoHotkey64.exe" /ErrorStdOut /validate tools\aion-input\aion.ahk`.
- Exit codes: 0 done, 2 game window not found, 3 game window not (or no longer) in front, 4 bad verb or
  arguments.
- `back` re-activates the window recorded in `%TEMP%\aion-input-prev.txt` when the game was first focused.
