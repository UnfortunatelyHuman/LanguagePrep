/**
 * Light / dark / system theme. The choice lives in localStorage (it's a
 * per-browser display preference, not study data) and is applied as
 * data-theme on <html>; with no choice the CSS follows the system setting.
 */

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "lp-theme";

/** Runs inline in <head> before paint. Storage can throw (private mode), so it's guarded. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function readTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Not saved; the choice still applies until the page reloads.
  }
}
