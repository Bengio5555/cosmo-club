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
  UserCog,
  Newspaper,
  Truck,
  Network,
  MessageSquareText,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

export type NavSection = { section: string; items: NavItem[] };

/**
 * Single source of truth for the dashboard menu. Consumed by the desktop
 * sidebar and the mobile "Plus" sheet so both surfaces expose exactly the
 * same set of pages — the mobile bar used to hardcode its own short list,
 * which left 14 of these 19 entries unreachable on a phone.
 *
 * Role gating is not encoded here: callers filter with canAccess().
 */
export const DASHBOARD_NAV: NavSection[] = [
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
      { href: "/dashboard/cocktails", label: "Boissons", icon: Wine },
      { href: "/dashboard/stock", label: "Stock", icon: Package },
      { href: "/dashboard/staff", label: "Équipe", icon: Users },
      { href: "/dashboard/providers", label: "Prestataires", icon: Truck },
      { href: "/dashboard/partners", label: "Partenaires réseau", icon: Network },
    ],
  },
  {
    section: "Contenu",
    items: [
      { href: "/dashboard/blog", label: "Le Mag", icon: Newspaper },
      { href: "/dashboard/reddit", label: "Reddit veille", icon: MessageSquareText },
      { href: "/dashboard/images", label: "Images site", icon: ImageIcon },
      { href: "/dashboard/home-gallery", label: "Galerie home", icon: ImageIcon },
      { href: "/dashboard/logos", label: "Logos clients", icon: Building2 },
    ],
  },
  {
    section: "Configuration",
    items: [
      { href: "/dashboard/team", label: "Utilisateurs", icon: UserCog },
      { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
    ],
  },
];
