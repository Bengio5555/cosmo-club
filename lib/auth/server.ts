import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "./roles";

/**
 * Server-only: look up the role of the current authenticated user.
 * Returns null if the user is not signed in or the profile row is
 * missing. Use from server components and server actions. The proxy
 * (Edge runtime) queries the profile directly instead of going through
 * this helper because it cannot use `next/headers`.
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data.role as UserRole;
}
