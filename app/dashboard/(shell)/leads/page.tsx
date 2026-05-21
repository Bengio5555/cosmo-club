import { createClient } from "@/lib/supabase/server";
import { LeadsBrowser } from "./LeadsBrowser";

/**
 * Charge tous les leads en une seule requête au mount de la page.
 * La table reste petite (quelques centaines de lignes au pic), donc
 * pas besoin de filtrer côté serveur. Le LeadsBrowser client filtre
 * + trie en mémoire au clic d'onglet, ce qui élimine entièrement
 * le roundtrip SSR qui rendait la pagination par filtre lente.
 */
export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id,status,contact_name,contact_email,company,event_type,event_date,guests_count,message,raw_payload,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pilotage · Pipeline commercial
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
              Demandes
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Leads entrants depuis le site (formulaire{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px] text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                /contact
              </code>
              ).
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            Erreur de chargement : {error.message}
          </div>
        )}

        <LeadsBrowser leads={leads ?? []} />
      </div>
    </div>
  );
}
