"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccess, type UserRole } from "@/lib/auth/roles";

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

// Mobile bottom nav surfaces the 5 most-used routes. The order is
// stable; we filter by role and then take the first five so the bar
// adapts cleanly across roles (staff sees events/cocktails first,
// compta sees devis/factures, etc.).
const ALL_TABS: Tab[] = [
  { href: "/dashboard", label: "Board", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/leads", label: "Leads", icon: Inbox },
  { href: "/dashboard/devis", label: "Devis", icon: FileText },
  { href: "/dashboard/factures", label: "Factures", icon: Receipt },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/clients", label: "Clients", icon: Contact },
  { href: "/dashboard/cocktails", label: "Cocktails", icon: Wine },
  { href: "/dashboard/images", label: "Images", icon: ImageIcon },
];

/**
 * Bottom tab bar — iOS/Android pattern. Sticky to viewport bottom,
 * respects safe-area-inset so it lifts above the home indicator on
 * iPhones with notch. Theme-aware and exits below md breakpoint
 * where the sidebar takes over.
 *
 * Active tab gets a pill background (more native-feeling than the
 * usual top underline) and an enlarged icon. Inactive icons fade
 * briefly when tapped so users get touch feedback while routing.
 */
export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const tabs = ALL_TABS.filter((t) => canAccess(t.href, role)).slice(0, 5);

  return (
    <nav
      aria-label="Navigation principale"
      className="sticky bottom-0 z-30 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_-2px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-none md:hidden"
    >
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium tracking-tight transition-colors",
              active
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-200",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                active
                  ? "bg-slate-900/10 dark:bg-white/10"
                  : "bg-transparent group-active:bg-slate-900/5 dark:group-active:bg-white/5",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
