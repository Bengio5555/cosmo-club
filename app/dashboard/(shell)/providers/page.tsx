import { createClient } from "@/lib/supabase/server";
import { ProvidersTable } from "./ProvidersTable";

export default async function ProvidersPage() {
  const supabase = await createClient();
  const { data: providers, error } = await supabase
    .from("providers")
    .select("*")
    .order("archived", { ascending: true })
    .order("category", { ascending: true })
    .order("company_name", { ascending: true, nullsFirst: false });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">Prestataires</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Fournisseurs et services utilisés par Cosmo Club : matériel, imprimeurs,
          fleuristes, agences com, photographes, achats…
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error.message}
        </div>
      )}

      <ProvidersTable providers={providers ?? []} />
    </div>
  );
}
