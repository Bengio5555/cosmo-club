import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Paramètres</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Mentions légales utilisées sur devis et factures (nom, SIRET, TVA, IBAN…).
        </p>
      </header>

      <SettingsForm initial={data ?? null} />
    </div>
  );
}
