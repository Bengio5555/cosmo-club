import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/server";
import { SettingsForm } from "./SettingsForm";
import { BankSection, type BankLogItem } from "./BankSection";
import { CalendarSection } from "./CalendarSection";
import { ReviewLinkSection } from "./ReviewLinkSection";
import { ChangelogView } from "./ChangelogView";
import { CHANGELOG } from "@/lib/changelog";
import Link from "next/link";

type SP = Promise<{ onglet?: string }>;

export default async function SettingsPage({ searchParams }: { searchParams: SP }) {
  const { onglet } = await searchParams;
  const tab: "general" | "mises-a-jour" = onglet === "mises-a-jour" ? "mises-a-jour" : "general";
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  const isOwner = (await getCurrentRole()) === "owner";

  // Historique des changements d'IBAN : lisible par le propriétaire seul (RLS).
  let history: BankLogItem[] = [];
  if (isOwner) {
    const { data: log } = await supabase
      .from("bank_change_log")
      .select("id,changed_at,changed_by,via_dashboard,old_iban_masked,new_iban_masked")
      .order("changed_at", { ascending: false })
      .limit(20);
    const ids = [...new Set((log ?? []).map((l) => l.changed_by).filter((x): x is string => !!x))];
    const { data: people } = ids.length
      ? await supabase.from("profiles").select("id,email").in("id", ids)
      : { data: [] };
    const emailOf = new Map((people ?? []).map((p) => [p.id, p.email]));
    history = (log ?? []).map((l) => ({
      id: l.id,
      changedAt: l.changed_at,
      by: l.changed_by ? (emailOf.get(l.changed_by) ?? null) : null,
      viaDashboard: l.via_dashboard,
      oldIban: l.old_iban_masked,
      newIban: l.new_iban_masked,
    }));
  }

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {tab === "general"
            ? "Mentions légales utilisées sur devis et factures (nom, SIRET, TVA, IBAN…)."
            : "Ce qui a été ajouté, amélioré ou corrigé sur le site et le dashboard, du plus récent au plus ancien."}
        </p>
      </header>

      <nav className="mb-7 flex gap-1 border-b border-slate-200 dark:border-slate-800" aria-label="Onglets des paramètres">
        <TabLink href="/dashboard/settings" active={tab === "general"} label="Général" />
        <TabLink
          href="/dashboard/settings?onglet=mises-a-jour"
          active={tab === "mises-a-jour"}
          label={`Mises à jour (${CHANGELOG.length})`}
        />
      </nav>

      {tab === "mises-a-jour" ? (
        <ChangelogView entries={CHANGELOG} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SettingsForm initial={data ?? null} />
          <div className="space-y-5">
            <BankSection
              isOwner={isOwner}
              iban={data?.iban ?? null}
              bic={data?.bic ?? null}
              updatedAt={data?.bank_updated_at ?? null}
              history={history}
            />
            <CalendarSection initialToken={data?.calendar_token ?? null} />
            <ReviewLinkSection initialUrl={data?.google_review_url ?? null} />
          </div>
        </div>
      )}
    </div>
  );
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
          : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
