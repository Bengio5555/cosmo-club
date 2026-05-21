import { createClient } from "@/lib/supabase/server";
import { PartnersTable } from "./PartnersTable";

export default async function PartnersPage() {
  const supabase = await createClient();
  const { data: partners, error } = await supabase
    .from("partners")
    .select("*")
    .order("archived", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">Partenaires réseau</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Contacts métier : orchestres, traiteurs, wedding planners, lieux de
          réception, agences corporate, technique…
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error.message}
        </div>
      )}

      <PartnersTable partners={partners ?? []} />
    </div>
  );
}
