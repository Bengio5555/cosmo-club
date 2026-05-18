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
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Prestataires</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Fournisseurs et services utilisés par Cosmo Club : matériel, imprimeurs,
          fleuristes, agences com, photographes, achats…
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <ProvidersTable providers={providers ?? []} />
    </div>
  );
}
