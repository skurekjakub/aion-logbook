import { useEffect, useState } from "react";

/** A theme choice: follow the system, or force one. */
export type Theme = "system" | "light" | "dark";

/** The storage key the choice is remembered under. */
export const THEME_KEY = "aion-theme";

/** The order the button steps through. */
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };

/** Each choice's label and glyph. */
const LABEL: Record<Theme, [label: string, glyph: string]> = {
  system: ["Auto", "◐"],
  light: ["Light", "☀"],
  dark: ["Dark", "☾"],
};

/**
 * Reads the remembered theme; storage can be missing or blocked.
 *
 * @returns the stored choice, or "system"
 */
function stored(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/**
 * A button that steps the colour theme through auto, light and dark. It
 * sets `data-theme` on the root element (which `tokens.css` reads; "auto"
 * removes it) and remembers the choice in local storage when it can.
 *
 * @returns the button
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(stored);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try {
      if (theme === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage is a convenience: the theme still applies for this visit.
    }
  }, [theme]);
  const [label, glyph] = LABEL[theme];
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme: ${label}. Switch to ${LABEL[NEXT[theme]][0]}`}
      title={`Theme: ${label}`}
      onClick={() => {
        setTheme(NEXT[theme]);
      }}
    >
      <span aria-hidden="true">{glyph}</span>
      {label}
    </button>
  );
}
