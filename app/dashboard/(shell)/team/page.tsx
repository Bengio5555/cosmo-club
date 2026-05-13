import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, ROLE_DESCRIPTION, type UserRole } from "@/lib/auth/roles";
import { TeamTable } from "./TeamTable";
import { InviteForm } from "./InviteForm";

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: members, error } = await supabase
    .from("profiles")
    .select("id, email, role, invited_by, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Utilisateurs</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Invitez vos collaborateurs et attribuez-leur un rôle. Chaque rôle
          déverrouille un ensemble précis de pages du dashboard.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TeamTable
          members={(members ?? []).map((m) => ({
            ...m,
            role: m.role as UserRole,
          }))}
          currentUserId={user?.id ?? null}
        />
        <div className="space-y-5">
          <InviteForm />
          <RolesLegend />
        </div>
      </div>
    </div>
  );
}

function RolesLegend() {
  const order: UserRole[] = ["owner", "admin", "manager", "staff", "compta"];
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <h2 className="text-sm font-semibold text-white">Les rôles</h2>
      <p className="mt-1 text-[11px] text-neutral-500">
        Périmètre d'accès résumé. Le propriétaire ne peut pas être modifié.
      </p>
      <dl className="mt-4 space-y-3 text-xs">
        {order.map((r) => (
          <div key={r}>
            <dt className="font-semibold text-neutral-200">{ROLE_LABEL[r]}</dt>
            <dd className="mt-0.5 text-neutral-500">{ROLE_DESCRIPTION[r]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
