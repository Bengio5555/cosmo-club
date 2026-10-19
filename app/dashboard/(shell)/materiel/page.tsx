import Link from "next/link";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { qrSvgForToken, svgToDataUri } from "@/lib/equipment/qr";
import { EquipmentManager, type EquipmentRow } from "./EquipmentManager";

/**
 * Matériel identifié par QR code : le bar, les caisses, le kit tech. Un
 * élément = une étiquette. Les éléments se cochent ensuite sur chaque
 * événement et se scannent au départ du stock et avant le retour.
 */
export default async function MaterielPage() {
  const supabase = await createClient();
  const [{ data: items, error }, { data: usage }] = await Promise.all([
    supabase
      .from("equipment")
      .select("id,code,name,category,contents,qr_token,archived,created_at")
      .order("archived", { ascending: true })
      .order("category", { ascending: true })
      .order("code", { ascending: true }),
    supabase.from("event_equipment").select("equipment_id,event_id"),
  ]);

  const usedBy = new Map<string, number>();
  for (const u of usage ?? []) {
    usedBy.set(u.equipment_id, (usedBy.get(u.equipment_id) ?? 0) + 1);
  }

  const rows: EquipmentRow[] = await Promise.all(
    (items ?? []).map(async (it) => ({
      ...it,
      events: usedBy.get(it.id) ?? 0,
      qr: svgToDataUri(await qrSvgForToken(it.qr_token)),
    })),
  );
  const active = rows.filter((r) => !r.archived).length;

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
            Matériel
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Le bar, les caisses, le kit tech : chaque élément porte un QR code à
            coller dessus. Sur un événement tu coches ce qui part, le
            manutentionnaire scanne au stock puis avant de recharger le camion.
          </p>
        </div>
        <Link
          href="/dashboard/materiel/etiquettes"
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Printer className="h-4 w-4" />
          Imprimer les étiquettes
        </Link>
      </header>

      {error && (
        <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Lecture impossible ({error.message}). Les tables sont-elles créées ? Voir
          docs/migrations/2026-10-19_equipment_qr.sql.
        </p>
      )}

      <EquipmentManager rows={rows} activeCount={active} />
    </div>
  );
}
