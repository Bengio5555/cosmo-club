"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Receipt,
  Package,
  Users,
  Contact,
  ImageIcon,
  Building2,
  Settings,
  CalendarDays,
  BookText,
  Wine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoSrc from "@/public/brand/cosmo-logo.avif";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const nav: { section: string; items: NavItem[] }[] = [
  {
    section: "Pilotage",
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/dashboard/leads", label: "Demandes", icon: Inbox },
      { href: "/dashboard/devis", label: "Devis", icon: FileText },
      { href: "/dashboard/factures", label: "Factures", icon: Receipt },
      { href: "/dashboard/events", label: "Événements", icon: CalendarDays },
    ],
  },
  {
    section: "Ressources",
    items: [
      { href: "/dashboard/clients", label: "Clients", icon: Contact },
      { href: "/dashboard/catalog", label: "Catalogue", icon: BookText },
      { href: "/dashboard/cocktails", label: "Cocktails", icon: Wine },
      { href: "/dashboard/stock", label: "Stock", icon: Package },
      { href: "/dashboard/staff", label: "Équipe", icon: Users },
    ],
  },
  {
    section: "Contenu",
    items: [
      { href: "/dashboard/images", label: "Images site", icon: ImageIcon },
      { href: "/dashboard/logos", label: "Logos clients", icon: Building2 },
      { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950 px-3 py-4 text-neutral-300 md:flex">
      <Link
        href="/dashboard"
        aria-label="Cosmo Club — tableau de bord"
        className="mb-6 flex items-center gap-2 px-2 transition-opacity hover:opacity-85"
      >
        <Image
          src={logoSrc}
          alt="Cosmo Club"
          width={Math.round((304 / 106) * 24)}
          height={24}
          priority
          unoptimized
          className="h-6 w-auto select-none"
        />
        <span className="ml-auto text-[10px] uppercase tracking-widest text-neutral-500">
          Admin
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto text-sm">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                        active
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-400 hover:bg-neutral-900 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded bg-red-500/20 px-1.5 text-[10px] font-semibold text-red-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-neutral-800 pt-3 text-[11px] text-neutral-500">
        <Link href="/" className="hover:text-neutral-300" target="_blank">
          ↗ Voir le site public
        </Link>
      </div>
    </aside>
  );
}
