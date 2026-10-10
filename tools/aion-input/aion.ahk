#Requires AutoHotkey v2.0
#SingleInstance Off
; aion.ahk <verb> [args]: focus | back | key <keys> | click x y | rclick x y | drag x1 y1 x2 y2 | scroll x y n
; Coordinates are AION2 client pixels. Run it through `pnpm game`, which checks the arguments and shoots the result.
; Exit codes start at 10, clear of AutoHotkey's own (a script that fails to load exits 2):
; 0 done, 10 game window not found, 11 game window not (or no longer) active, 12 bad verb or arguments.
SendMode "Event"
SetKeyDelay 60, 50
SetMouseDelay 20
CoordMode "Mouse", "Client"

GAME := "ahk_exe AION2.exe"
; The window that was active before the first input; `back` re-activates it.
PREV_FILE := A_Temp "\aion-input-prev.txt"
ARITY := Map("focus", 0, "key", 1, "click", 2, "rclick", 2, "drag", 4, "scroll", 3)
; `key` never clicks, scrolls or presses the Windows key; `pnpm game` also refuses system chords.
KEY_REFUSED := "i)\{Click|[LRM]Button|XButton[12]|Wheel(Up|Down|Left|Right)|[LR]Win|(?<!\{)#|#(?!\})"

Breathe() => Sleep(Random(80, 200))
Clamp(v, lo, hi) => Min(Max(v, lo), hi)
; Moves to a point with a pixel or two of jitter, kept inside the 1920x1080 client.
MoveTo(x, y) => MouseMove(Clamp(Integer(x) + Random(-2, 2), 0, 1919), Clamp(Integer(y) + Random(-2, 2), 0, 1079), Random(6, 12))

; Stops before sending anything if the game lost the foreground.
Guard() {
    if !WinActive(GAME)
        ExitApp 11
}

verb := A_Args.Length ? A_Args[1] : ""

if (verb = "back" && A_Args.Length = 1) {
    if !FileExist(PREV_FILE) {
        FileAppend "nothing to go back to`n", "*"
        ExitApp 0
    }
    prev := Integer(FileRead(PREV_FILE))
    FileDelete PREV_FILE
    if (prev && WinExist("ahk_id " prev)) {
        WinActivate
        FileAppend "restored the previous window`n", "*"
    } else {
        FileAppend "the previous window is gone`n", "*"
    }
    ExitApp 0
}

; Everything is checked before the game window is touched.
if !ARITY.Has(verb) || A_Args.Length != ARITY[verb] + 1
    ExitApp 12
if (verb = "key" && RegExMatch(A_Args[2], KEY_REFUSED))
    ExitApp 12
if !WinExist(GAME)
    ExitApp 10
if !WinActive(GAME) {
    if FileExist(PREV_FILE)
        FileDelete PREV_FILE
    FileAppend WinExist("A"), PREV_FILE
    WinActivate GAME
    if !WinWaitActive(GAME, , 3)
        ExitApp 11
    Sleep Random(150, 300)
}

switch verb {
    case "focus":
        Guard()
    case "key":
        Guard()
        Send A_Args[2]
    case "click":
        MoveTo(A_Args[2], A_Args[3]), Breathe(), Guard()
        Click()
    case "rclick":
        MoveTo(A_Args[2], A_Args[3]), Breathe(), Guard()
        Click("Right")
    case "drag":
        MoveTo(A_Args[2], A_Args[3]), Breathe(), Guard()
        Click("Down"), Breathe()
        MouseMove(Integer(A_Args[4]), Integer(A_Args[5]), Random(15, 25)), Breathe()
        Click("Up")
    case "scroll":
        MoveTo(A_Args[2], A_Args[3]), Breathe()
        n := Integer(A_Args[4])
        Loop Abs(n) {
            Guard()
            Click(n > 0 ? "WheelUp" : "WheelDown"), Breathe()
        }
    default:
        ExitApp 12
}
; Lets the UI settle so the after-shot shows the result.
Sleep Random(400, 700)
ExitApp 0
