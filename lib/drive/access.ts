import "server-only";
import { getCurrentRole } from "@/lib/auth/server";
import { rolesForPath } from "@/lib/auth/roles";

/**
 * Who may browse and write the shared drive from the dashboard. Mirrors
 * the /dashboard/documents rule in ROUTE_ROLES so the page, its server
 * actions and the /api/dashboard/drive routes (which the proxy does not
 * cover) can't drift apart.
 */
export async function hasDriveAccess() {
  const role = await getCurrentRole();
  return role !== null && rolesForPath("/dashboard/documents").includes(role);
}
