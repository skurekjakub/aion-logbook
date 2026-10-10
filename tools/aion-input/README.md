# aion-input

`aion.ahk` is the AutoHotkey v2 script behind `pnpm game focus|back|key|click|rclick|drag|scroll`. It focuses
the AION2 window and sends one ordinary keyboard or mouse input to it. Don't run it directly: `pnpm game`
checks the arguments against the 1920×1080 client first and shoots the result afterwards.

How to use the bridge, its preconditions and its stop rules: `.claude/skills/aion-game/SKILL.md`. Window
hotkeys and coordinates: `.claude/skills/aion-game/references/windows.md`.

- Interpreter: `AION_AHK`, defaulting to `%LOCALAPPDATA%\Programs\AutoHotkey\v2\AutoHotkey64.exe`.
- Syntax check without running it:
  `"%LOCALAPPDATA%\Programs\AutoHotkey\v2\AutoHotkey64.exe" /ErrorStdOut /validate tools\aion-input\aion.ahk`.
- Exit codes start at 10, clear of AutoHotkey's own (a script that fails to load exits 2): 0 done, 10 game
  window not found, 11 game window not (or no longer) in front, 12 bad verb or arguments, including a `key`
  string that clicks, scrolls or presses the Windows key. With no arguments the script exits 12.
- `key` strings are checked twice: `pnpm game` refuses mouse buttons, wheel, `{Click}`, the Windows key and
  system chords such as Alt+F4 or Ctrl+Alt+Delete; the script refuses the mouse and Windows-key tokens again.
- `back` re-activates the window recorded in `%TEMP%\aion-input-prev.txt` when the game was first focused. It
  doesn't need the game running, and `pnpm game back` takes no after-shot.
