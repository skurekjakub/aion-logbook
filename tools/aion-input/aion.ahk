#Requires AutoHotkey v2.0
#SingleInstance Off
; aion.ahk <verb> [args]: focus | back | key <keys> | click x y | rclick x y | drag x1 y1 x2 y2 | scroll x y n
; Coordinates are AION2 client pixels. Run it through `pnpm game`, which checks the arguments and shoots the result.
; Exit codes: 0 done, 2 game window not found, 3 game window not (or no longer) active, 4 bad verb or arguments.
SendMode "Event"
SetKeyDelay 60, 50
SetMouseDelay 20
CoordMode "Mouse", "Client"

GAME := "ahk_exe AION2.exe"
; The window that was active before the first input; `back` re-activates it.
PREV_FILE := A_Temp "\aion-input-prev.txt"
ARITY := Map("focus", 0, "key", 1, "click", 2, "rclick", 2, "drag", 4, "scroll", 3)

Breathe() => Sleep(Random(80, 200))
MoveTo(x, y) => MouseMove(Integer(x) + Random(-2, 2), Integer(y) + Random(-2, 2), Random(6, 12))

; Stops before sending anything if the game lost the foreground.
Guard() {
    if !WinActive(GAME)
        ExitApp 3
}

verb := A_Args.Length ? A_Args[1] : "focus"

if (verb = "back") {
    if !FileExist(PREV_FILE) {
        FileAppend "nothing to go back to`n", "*"
        ExitApp 0
    }
    prev := Integer(FileRead(PREV_FILE))
    FileDelete PREV_FILE
    if (prev && WinExist("ahk_id " prev))
        WinActivate
    ExitApp 0
}

; Everything is checked before the game window is touched.
if !ARITY.Has(verb) || A_Args.Length != ARITY[verb] + 1
    ExitApp 4
if !WinExist(GAME)
    ExitApp 2
if !WinActive(GAME) {
    if FileExist(PREV_FILE)
        FileDelete PREV_FILE
    FileAppend WinExist("A"), PREV_FILE
    WinActivate GAME
    if !WinWaitActive(GAME, , 3)
        ExitApp 3
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
        ExitApp 4
}
; Lets the UI settle so the after-shot shows the result.
Sleep Random(400, 700)
ExitApp 0
