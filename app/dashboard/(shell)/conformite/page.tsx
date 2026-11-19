import { ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadComplianceRows, complianceLink } from "@/lib/server/staffCompliance";
import { ALERT_THRESHOLD, LEGAL_THRESHOLD } from "@/lib/staff/compliance";
import { ComplianceTable, type TableRow } from "./ComplianceTable";
import { AutoEmailsToggle } from "./AutoEmailsToggle";

type SP = Promise<{ vue?: string }>;

export const metadata = { title: "Conformité" };

/**
 * Conformité des indépendants : obligation de vigilance URSSAF.
 * Lecture via le client admin (documents privés, RLS owner/admin/compta) ;
 * l'accès à la page est restreint par ROUTE_ROLES.
 */
export default async function ConformitePage({ searchParams }: { searchParams: SP }) {
  const { vue } = await searchParams;
  const showAll = vue === "tous";
  const db = createAdminClient();
  const [rows, { data: settings }] = await Promise.all([
    loadComplianceRows(db),
    db.from("settings").select("compliance_auto_emails").eq("id", 1).maybeSingle(),
  ]);

  const relevant = rows.filter((r) => !r.salaried && (r.projected >= ALERT_THRESHOLD || r.attestation || r.status.siretProblem));
  const visible = (showAll ? rows.filter((r) => r.events12m > 0 || r.upcoming > 0 || r.attestation || r.staff.siret) : relevant).sort(
    (a, b) => rank(b.status.severity) - rank(a.status.severity) || b.projected - a.projected,
  );

  const alerts = relevant.filter((r) => r.status.severity === "alert").length;
  const toVerify = relevant.filter((r) => r.attestation && !r.attestation.verified_at).length;
  const toRequest = relevant.filter((r) => r.status.needsRequest).length;
  const withoutSiret = rows.filter((r) => !r.salaried && r.events12m > 0 && !r.staff.siret).length;

  const tableRows: TableRow[] = visible.map((r) => ({
    id: r.staff.id,
    name: r.staff.full_name,
    role: r.staff.role,
    email: r.staff.email,
    legalStatus: r.staff.legal_status,
    siret: r.staff.siret,
    siretStatus: r.staff.siret_status,
    siretName: r.staff.siret_name,
    past12m: r.past12m,
    upcoming: r.upcoming,
    projected: r.projected,
    events12m: r.events12m,
    salaried: r.salaried,
    state: r.status.state,
    severity: r.status.severity,
    needsRequest: r.status.needsRequest,
    requestedAt: r.staff.compliance_requested_at,
    remindedAt: r.staff.compliance_reminded_at,
    link: complianceLink(r.staff.compliance_token),
    attestation: r.attestation
      ? {
          id: r.attestation.id,
          issuedAt: r.attestation.issued_at,
          validUntil: r.attestation.computedValidUntil,
          verifiedAt: r.attestation.verified_at,
          createdAt: r.attestation.created_at,
          via: r.attestation.uploaded_via,
        }
      : null,
    rcPro: r.rcPro ? { id: r.rcPro.id, validUntil: r.rcPro.valid_until, createdAt: r.rcPro.created_at } : null,
  }));

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
          <ShieldCheck className="h-6 w-6 text-slate-500" /> Conformité des indépendants
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Obligation de vigilance URSSAF : dès {fmt(LEGAL_THRESHOLD)} HT cumulés avec un même indépendant, il faut détenir son attestation de
          vigilance de moins de 6 mois. Ici, la demande part dès {fmt(ALERT_THRESHOLD)} (12 derniers mois + événements planifiés) et se
          renouvelle tous les 3 mois. Le SIRET est vérifié dans l&apos;annuaire public des entreprises.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Obligation non couverte" value={alerts} tone={alerts ? "alert" : "ok"} hint="au-dessus de 5 000 € sans attestation valide, ou SIRET en défaut" />
        <Kpi label="À demander ou renouveler" value={toRequest} tone={toRequest ? "warn" : "ok"} hint="dès 4 000 € projetés" />
        <Kpi label="À vérifier sur urssaf.fr" value={toVerify} tone={toVerify ? "warn" : "ok"} hint="code de sécurité de l'attestation" />
        <Kpi label="Sans SIRET" value={withoutSiret} tone={withoutSiret ? "info" : "ok"} hint="ont travaillé dans les 12 derniers mois" />
      </div>

      <AutoEmailsToggle enabled={!!settings?.compliance_auto_emails} />

      <div className="mb-3 mt-6 flex items-center gap-2 text-sm">
        <a
          href="/dashboard/conformite"
          className={`rounded-full px-3 py-1 ${!showAll ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
        >
          Concernés ({relevant.length})
        </a>
        <a
          href="/dashboard/conformite?vue=tous"
          className={`rounded-full px-3 py-1 ${showAll ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
        >
          Tous les actifs
        </a>
      </div>

      <ComplianceTable rows={tableRows} />
    </div>
  );
}

function rank(s: "ok" | "info" | "warn" | "alert") {
  return { alert: 3, warn: 2, ok: 1, info: 0 }[s];
}

function fmt(n: number) {
  return `${n.toLocaleString("fr-FR")} €`;
}

function Kpi({ label, value, tone, hint }: { label: string; value: number; tone: "ok" | "info" | "warn" | "alert"; hint: string }) {
  const color = {
    ok: "text-emerald-600 dark:text-emerald-400",
    info: "text-slate-700 dark:text-slate-300",
    warn: "text-amber-600 dark:text-amber-400",
    alert: "text-red-600 dark:text-red-400",
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
