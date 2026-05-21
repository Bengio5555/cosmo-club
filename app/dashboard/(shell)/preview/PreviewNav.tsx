"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays } from "lucide-react";

const TABS = [
  { href: "/dashboard/preview", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/preview/clients", label: "Clients", icon: Users },
  { href: "/dashboard/preview/calendrier", label: "Calendrier", icon: CalendarDays },
] as const;

export function PreviewNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3 md:px-10">
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            Preview
          </span>
          <span className="text-slate-600">
            Maquettes de design — aucune action n&apos;est persistée.
          </span>
        </div>
        <nav className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
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
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
