import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/server";
import { SettingsForm } from "./SettingsForm";
import { BankSection, type BankLogItem } from "./BankSection";
import { CalendarSection } from "./CalendarSection";
import { ReviewLinkSection } from "./ReviewLinkSection";

export default async function SettingsPage() {
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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Mentions légales utilisées sur devis et factures (nom, SIRET, TVA, IBAN…).
        </p>
      </header>

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
    </div>
  );
}
