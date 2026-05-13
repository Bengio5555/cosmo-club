"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_ROLES, canManageTeam, type UserRole } from "@/lib/auth/roles";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Belt-and-suspenders authorization gate. The proxy already blocks
 * routes that aren't allowed for the current role, but server actions
 * can be invoked from anywhere — so each one re-checks that the caller
 * is an owner or admin before mutating anything.
 */
async function requireTeamManager(): Promise<
  | { role: UserRole; userId: string; email: string }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile?.role as UserRole | undefined) ?? null;
  if (!canManageTeam(role)) {
    return { error: "Accès refusé : seuls les propriétaires et admins peuvent gérer l'équipe." };
  }
  return { role: role!, userId: user.id, email: user.email ?? "" };
}

function isValidRole(value: string): value is UserRole {
  return (ALL_ROLES as string[]).includes(value);
}

/**
 * Invite a new team member by email. Uses Supabase's native invite
 * flow: the recipient receives an email with a magic link that lets
 * them set a password and sign in. The role + inviter id are stamped
 * in user_metadata so the on-signup trigger picks them up and creates
 * the right profile row.
 */
export async function inviteMember(input: {
  email: string;
  role: UserRole;
}): Promise<ActionResult> {
  const gate = await requireTeamManager();
  if ("error" in gate) return { ok: false, error: gate.error };

  const email = input.email.trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) {
    return { ok: false, error: "Email invalide." };
  }
  if (!isValidRole(input.role)) {
    return { ok: false, error: "Rôle invalide." };
  }
  if (input.role === "owner") {
    return { ok: false, error: "Le rôle 'Propriétaire' ne peut pas être attribué via une invitation." };
  }

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cosmoclub.fr"}/dashboard/auth/callback`;

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: input.role,
      invited_by: gate.userId,
    },
    redirectTo,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/team");
  return { ok: true };
}

/**
 * Change a user's role. Owner cannot be demoted, and a non-owner
 * cannot grant the owner role.
 */
export async function updateMemberRole(input: {
  userId: string;
  role: UserRole;
}): Promise<ActionResult> {
  const gate = await requireTeamManager();
  if ("error" in gate) return { ok: false, error: gate.error };

  if (!isValidRole(input.role)) {
    return { ok: false, error: "Rôle invalide." };
  }
  if (input.userId === gate.userId) {
    return { ok: false, error: "Vous ne pouvez pas modifier votre propre rôle." };
  }
  if (input.role === "owner") {
    return { ok: false, error: "Le rôle 'Propriétaire' ne peut pas être attribué." };
  }

  // Use admin client so RLS doesn't get in the way; we've already
  // verified the caller is owner/admin.
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", input.userId)
    .single();
  if (target?.role === "owner") {
    return { ok: false, error: "Le propriétaire ne peut pas être rétrogradé." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ role: input.role })
    .eq("id", input.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  return { ok: true };
}

/**
 * Remove a user entirely (auth.users delete cascades to profiles via
 * the FK). The owner cannot be removed. Self-removal is also blocked.
 */
export async function removeMember(input: {
  userId: string;
}): Promise<ActionResult> {
  const gate = await requireTeamManager();
  if ("error" in gate) return { ok: false, error: gate.error };

  if (input.userId === gate.userId) {
    return { ok: false, error: "Vous ne pouvez pas vous retirer vous-même." };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", input.userId)
    .single();
  if (target?.role === "owner") {
    return { ok: false, error: "Le propriétaire ne peut pas être retiré." };
  }

  const { error } = await admin.auth.admin.deleteUser(input.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  return { ok: true };
}
