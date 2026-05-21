import { createClient } from "@/lib/supabase/server";
import { StaffTable } from "./StaffTable";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: staff, error } = await supabase
    .from("staff")
    .select("*")
    .order("archived", { ascending: true })
    .order("full_name", { ascending: true });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">Équipe</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          Barmen, baristas, runners, chefs de salle. Un taux horaire par défaut
          qui peut être surchargé par événement dans la fiche event.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error.message}
        </div>
      )}

      <StaffTable staff={staff ?? []} />
    </div>
  );
}
