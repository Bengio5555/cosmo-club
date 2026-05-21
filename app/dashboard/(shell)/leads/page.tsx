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
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Demandes
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Leads entrants depuis le site (formulaire{" "}
            <code className="text-neutral-500">/contact</code>).
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          Erreur de chargement : {error.message}
        </div>
      )}

      <LeadsBrowser leads={leads ?? []} />
    </div>
  );
}
