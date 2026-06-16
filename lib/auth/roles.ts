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
  // Dashboard home: everyone except staff. Staff (barmen/baristas) are
  // locked down to the Événements page only — see defaultRouteForRole,
  // which lands them there instead of here.
  "/dashboard": ["owner", "admin", "manager", "compta"],

  // Operations
  "/dashboard/leads": ["owner", "admin", "manager"],
  "/dashboard/devis": ["owner", "admin", "manager", "compta"],
  "/dashboard/factures": ["owner", "admin", "compta"],
  "/dashboard/clients": ["owner", "admin", "manager", "compta"],
  // Events: the ONLY page staff can reach.
  "/dashboard/events": ["owner", "admin", "manager", "staff"],
  "/dashboard/cocktails": ["owner", "admin", "manager"],
  "/dashboard/catalog": ["owner", "admin", "manager"],
  "/dashboard/stock": ["owner", "admin", "manager"],
  "/dashboard/staff": ["owner", "admin", "manager"],
  "/dashboard/providers": ["owner", "admin", "manager"],
  "/dashboard/partners": ["owner", "admin", "manager"],

  // Site content (vitrine + éditorial)
  "/dashboard/blog": ["owner", "admin", "manager"],
  "/dashboard/reddit": ["owner", "admin", "manager"],
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
 * Where to send a user when they have no specific destination — after
 * login, or when bounced off a forbidden route. Staff cannot access the
 * dashboard home, so sending them there would loop; they land on the
 * Événements page (the only thing they can open) instead.
 */
export function defaultRouteForRole(role: UserRole | null): string {
  if (role === "staff") return "/dashboard/events";
  return "/dashboard";
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
  staff: "Accès limité à la page Événements uniquement — pour les barmen/baristas.",
  compta: "Factures, devis, clients — accès financier uniquement.",
};
