"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Receipt,
  CalendarDays,
  Contact,
  Wine,
  ImageIcon,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccess, type UserRole } from "@/lib/auth/roles";
import { DASHBOARD_NAV } from "./nav";

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

// The four most-used routes get a permanent slot in the bottom bar. The
// order is stable; we filter by role and take the first four so the bar
// adapts across roles (staff sees events first, compta sees devis/
// factures, etc.). The fifth slot is always "Plus", which opens the full
// menu — the bar alone used to be the only navigation on a phone, and it
// left most of the dashboard unreachable.
const PRIMARY_TABS: Tab[] = [
  { href: "/dashboard", label: "Board", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/leads", label: "Demandes", icon: Inbox },
  { href: "/dashboard/devis", label: "Devis", icon: FileText },
  { href: "/dashboard/factures", label: "Factures", icon: Receipt },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/clients", label: "Clients", icon: Contact },
  { href: "/dashboard/cocktails", label: "Boissons", icon: Wine },
  { href: "/dashboard/images", label: "Images", icon: ImageIcon },
];

/** Demandes counter. Module-level so React keeps the same component type
 *  across renders instead of remounting it on every state change. */
function Badge({ count, small }: { count: number; small?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} nouvelle${count > 1 ? "s" : ""} demande${count > 1 ? "s" : ""}`}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[color:var(--color-grenat)] font-semibold text-white",
        small
          ? "absolute -right-0.5 -top-0.5 min-w-[16px] px-1 text-[9px] leading-4"
          : "min-w-[18px] px-1.5 text-[10px] leading-[18px]",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact || href === "/dashboard"
    ? pathname === href
    : pathname.startsWith(href);
}

/**
 * Bottom tab bar — iOS/Android pattern. Sticky to viewport bottom,
 * respects safe-area-inset so it lifts above the home indicator on
 * iPhones with notch. Theme-aware and exits below md breakpoint
 * where the sidebar takes over.
 *
 * "Plus" opens a bottom sheet listing every section the role can reach,
 * grouped exactly like the desktop sidebar (same DASHBOARD_NAV source).
 * When the current page lives in that sheet rather than in the bar,
 * "Plus" is the highlighted tab so the user always sees where they are.
 */
export function MobileNav({
  role,
  newLeadsCount = 0,
}: {
  role: UserRole;
  newLeadsCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const tabs = PRIMARY_TABS.filter((t) => canAccess(t.href, role)).slice(0, 4);
  const sections = DASHBOARD_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => canAccess(i.href, role)),
  })).filter((g) => g.items.length > 0);

  // The page being viewed isn't one of the four bar tabs → it's in the
  // sheet, so light up "Plus" as the active tab.
  const inBar = tabs.some((t) => isActive(pathname, t.href, t.exact));
  const moreActive = !inBar;

  // Navigating closes the sheet; Escape too. Lock body scroll while open
  // so the page behind doesn't move under the finger.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const tabCls = (active: boolean) =>
    cn(
      "group flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium tracking-tight transition-colors",
      active
        ? "text-slate-900 dark:text-white"
        : "text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-200",
    );
  const pillCls = (active: boolean) =>
    cn(
      "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
      active
        ? "bg-slate-900/10 dark:bg-white/10"
        : "bg-transparent group-active:bg-slate-900/5 dark:group-active:bg-white/5",
    );

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="sticky bottom-0 z-30 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_-2px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-none md:hidden"
      >
        {tabs.map((t) => {
          const active = isActive(pathname, t.href, t.exact);
          const Icon = t.icon;
          const count = t.href === "/dashboard/leads" ? newLeadsCount : 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={tabCls(active)}
            >
              <span className={pillCls(active)}>
                <Icon className="h-[18px] w-[18px]" />
                <Badge count={count} small />
              </span>
              <span>{t.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-current={moreActive ? "page" : undefined}
          className={tabCls(moreActive)}
        >
          <span className={pillCls(moreActive)}>
            <Menu className="h-[18px] w-[18px]" />
            {/* Surface the Demandes count on "Plus" when Demandes isn't
                one of the bar tabs (e.g. a role whose four slots don't
                include it), so the alert is never hidden. */}
            {!tabs.some((t) => t.href === "/dashboard/leads") &&
              canAccess("/dashboard/leads", role) && (
                <Badge count={newLeadsCount} small />
              )}
          </span>
          <span>Plus</span>
        </button>
      </nav>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu complet"
          className="fixed inset-0 z-40 md:hidden"
        >
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-900">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Menu
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {sections.map((group) => (
                <div key={group.section} className="mb-4 last:mb-1">
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {group.section}
                  </p>
                  <ul className="grid grid-cols-2 gap-1">
                    {group.items.map((item) => {
                      const active = isActive(pathname, item.href);
                      const Icon = item.icon;
                      const count =
                        item.href === "/dashboard/leads" ? newLeadsCount : 0;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                              active
                                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                                : "text-slate-700 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-900",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 truncate">{item.label}</span>
                            <Badge count={count} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-900">
              <Link href="/" target="_blank" className="hover:text-slate-700 dark:hover:text-slate-300">
                ↗ Voir le site public
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
