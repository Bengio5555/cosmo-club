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

export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const tabs = ALL_TABS.filter((t) => canAccess(t.href, role)).slice(0, 5);

  return (
    <nav className="sticky bottom-0 z-30 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
              active ? "text-white" : "text-slate-500 hover:text-slate-300",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
