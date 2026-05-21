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
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">Utilisateurs</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Invitez vos collaborateurs et attribuez-leur un rôle. Chaque rôle
          déverrouille un ensemble précis de pages du dashboard.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
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
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Les rôles</h2>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
        Périmètre d'accès résumé. Le propriétaire ne peut pas être modifié.
      </p>
      <dl className="mt-4 space-y-3 text-xs">
        {order.map((r) => (
          <div key={r}>
            <dt className="font-semibold text-slate-700 dark:text-slate-200">{ROLE_LABEL[r]}</dt>
            <dd className="mt-0.5 text-slate-500 dark:text-slate-500">{ROLE_DESCRIPTION[r]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
