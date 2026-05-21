"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Sun,
  Moon,
} from "lucide-react";

const TABS = [
  { href: "/dashboard/preview", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/preview/clients", label: "Clients", icon: Users },
  { href: "/dashboard/preview/calendrier", label: "Calendrier", icon: CalendarDays },
] as const;

const STORAGE_KEY = "cosmo-preview-theme";

/**
 * Wrapper client pour les pages preview : tient le state du thème
 * (light/dark) avec persistance localStorage, affiche le sub-nav
 * (PREVIEW + onglets + toggle thème) et applique la classe `.dark`
 * sur le conteneur pour que tous les `dark:` Tailwind soient actifs.
 *
 * Le pattern reste local à /dashboard/preview — le reste du dashboard
 * Cosmo garde son thème (dark hardcodé via la sidebar et le shell
 * layout). On valide ici l'apparence avant migration éventuelle.
 */
export function PreviewShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();

  // Charge le thème depuis localStorage au mount pour éviter le flash
  // light → dark à l'hydratation. `hydrated` retarde l'application
  // visuelle d'un cycle pour que React et le DOM convergent en silence.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      }
    } catch {
      // localStorage indispo (Safari private mode etc.) — on reste sur
      // la valeur par défaut light, pas grave.
    }
    setHydrated(true);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — voir le useEffect au-dessus
    }
  }

  return (
    <div
      className={
        (theme === "dark" ? "dark " : "") +
        "min-h-full bg-slate-50 dark:bg-slate-950"
      }
    >
      {/* Sub-nav (preview only) */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-10">
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              Preview
            </span>
            <span className="hidden text-slate-600 dark:text-slate-400 md:inline">
              Maquettes de design — aucune action n&apos;est persistée.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
              {TABS.map((t) => {
                const active = pathname === t.href;
                const Icon = t.icon;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={
                      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                      (active
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white")
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={toggle}
              aria-label={theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {hydrated && theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
