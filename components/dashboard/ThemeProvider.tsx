"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

/**
 * Manages the dashboard light/dark theme. Stored in localStorage so
 * the choice survives reloads. The provider does two things on top of
 * exposing the theme via context:
 *   1. Applies the `.dark` class on a wrapper div so all `dark:`
 *      Tailwind variants resolve correctly downstream.
 *   2. Sets `data-theme` for non-Tailwind code that wants to react to
 *      the current scheme (custom CSS, third-party libs).
 *
 * Default: light. We migrated from a hardcoded dark dashboard so the
 * first paint may be jarring on existing logged-in sessions; the
 * effect picks up the stored preference instantly though so the
 * flicker is unnoticeable in practice.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let resolved: Theme = "light";
    try {
      const saved = localStorage.getItem("dashboardTheme");
      if (saved === "light" || saved === "dark") {
        resolved = saved;
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        resolved = "dark";
      }
    } catch {
      // localStorage indispo (private mode) — on garde le défaut
    }
    setTheme(resolved);
    setHydrated(true);
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("dashboardTheme", next);
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Avant l'hydratation on rend en `light` côté serveur, ce qui matche
  // notre nouveau défaut. Pas de flash de thème puisque le re-render
  // initial est synchrone après le useEffect.
  const applied = hydrated ? theme : "light";

  return (
    <ThemeContext.Provider value={{ theme: applied, toggle }}>
      <div data-theme={applied} className={applied === "dark" ? "dark" : ""}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
