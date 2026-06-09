"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

/**
 * Dashboard light/dark theme, persisted in localStorage.
 *
 * No-flash strategy: the actual `.dark` class is applied to
 * <html> by a blocking inline script (see ThemeNoFlashScript) BEFORE
 * first paint, so the page renders in the correct theme immediately —
 * no light→dark flicker on reload. This provider then just keeps React
 * state in sync with that class and re-applies it on toggle. It no
 * longer wraps children in a `.dark` div (the variant matches the
 * <html> ancestor instead), which is what removed the flash.
 */
function readInitialTheme(): Theme {
  if (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  ) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy init from the <html> class the inline script already set, so
  // the very first client render matches what's painted (no flash, no
  // hydration mismatch since we render no theme-dependent DOM here).
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  // Reflect state → <html> after every change (covers toggles; the
  // inline script handled the initial paint).
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", theme === "dark");
    el.setAttribute("data-theme", theme);
  }, [theme]);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("dashboardTheme", next);
      } catch {
        // localStorage indispo (private mode) — on garde le défaut
      }
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Blocking inline script — render it once, early in the dashboard
 * layout. It reads the saved preference (or the OS scheme as fallback)
 * and toggles `.dark` on <html> synchronously during HTML parse,
 * before the styled shell paints. This is what kills the reload flash.
 */
export function ThemeNoFlashScript() {
  const js = `(function(){try{
    var t=localStorage.getItem('dashboardTheme');
    var dark = t==='dark' || (t!=='light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var el=document.documentElement;
    if(dark){el.classList.add('dark');el.setAttribute('data-theme','dark');}
    else{el.classList.remove('dark');el.setAttribute('data-theme','light');}
  }catch(e){}})();`;
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
