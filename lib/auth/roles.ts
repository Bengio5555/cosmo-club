// Pure module — no server-only imports. This file is consumed from
// client components, server components, server actions and the proxy
// (Edge runtime), so it must stay free of `next/headers` or anything
// that pins it to a specific runtime. The server-only helper
// `getCurrentRole()` lives in `./server`.

export type UserRole = "owner" | "admin" | "manager" | "staff" | "compta";

export const ALL_ROLES: UserRole[] = ["owner", "admin", "manager", "staff", "compta"];

/**
 * Roles allowed to invite new members or change other members' roles.
 * Kept as a single source of truth so middleware, server actions and
 * UI stay in sync.
 */
export const TEAM_MANAGERS: UserRole[] = ["owner", "admin"];

/**
 * Path prefix → roles allowed.
 *
 * Matching is done by prefix: a request for `/dashboard/leads/123` is
 * matched by `/dashboard/leads`. The longest matching prefix wins, so
 * more specific rules can override broader ones.
 *
 * If a path has no match, access is denied — be explicit.
 */
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  // Dashboard home: everyone
  "/dashboard": ["owner", "admin", "manager", "staff", "compta"],

  // Operations
  "/dashboard/leads": ["owner", "admin", "manager"],
  "/dashboard/devis": ["owner", "admin", "manager", "compta"],
  "/dashboard/factures": ["owner", "admin", "compta"],
  "/dashboard/clients": ["owner", "admin", "manager", "compta"],
  "/dashboard/events": ["owner", "admin", "manager", "staff"],
  "/dashboard/cocktails": ["owner", "admin", "manager", "staff"],
  "/dashboard/catalog": ["owner", "admin", "manager"],
  "/dashboard/stock": ["owner", "admin", "manager", "staff"],
  "/dashboard/staff": ["owner", "admin", "manager"],

  // Site content (vitrine + éditorial)
  "/dashboard/blog": ["owner", "admin", "manager"],
  "/dashboard/images": ["owner", "admin"],
  "/dashboard/home-gallery": ["owner", "admin"],
  "/dashboard/logos": ["owner", "admin"],

  // Configuration
  "/dashboard/settings": ["owner", "admin"],
  "/dashboard/team": ["owner", "admin"],
};

/**
 * Returns the roles allowed for a given dashboard path. Uses
 * longest-prefix matching so `/dashboard/devis/[id]/edit` resolves to
 * the rule defined for `/dashboard/devis`.
 */
export function rolesForPath(pathname: string): UserRole[] {
  // Sort prefixes by length descending so the most specific one wins.
  const prefixes = Object.keys(ROUTE_ROLES).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return ROUTE_ROLES[prefix];
    }
  }
  return [];
}

export function canAccess(pathname: string, role: UserRole | null): boolean {
  if (!role) return false;
  const allowed = rolesForPath(pathname);
  return allowed.includes(role);
}

export function canManageTeam(role: UserRole | null): boolean {
  return role !== null && TEAM_MANAGERS.includes(role);
}

/**
 * Human-readable label for a role (used in the team table + invite UI).
 */
export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Propriétaire",
  admin: "Admin",
  manager: "Manager",
  staff: "Équipe",
  compta: "Comptabilité",
};

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  owner: "Tout accès, gestion d'équipe. Un seul propriétaire.",
  admin: "Tout accès dont gestion d'équipe.",
  manager: "Exploitation : leads, devis, événements, équipe, stock.",
  staff: "Événements (planning), cocktails, stock — pour les barmen/baristas.",
  compta: "Factures, devis, clients — accès financier uniquement.",
};
