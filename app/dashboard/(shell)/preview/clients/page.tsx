import { createClient } from "@/lib/supabase/server";
import { PreviewClientsTable } from "./PreviewClientsTable";

/**
 * Page de preview UI — clone Zenith / shadcn pour valider visuellement
 * avant de migrer tout le dashboard. Utilise les vrais clients pour
 * que le rendu soit représentatif. Aucune action live ici : c'est un
 * démonstrateur de design uniquement.
 */
export default async function PreviewPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select(
      "id,first_name,last_name,company_name,email,phone,city,created_at,archived",
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  // Charge devis + factures pour calculer le CA et la dernière commande
  // par client, comme sur la page actuelle. Cheap pour la base réelle.
  const ids = (clients ?? []).map((c) => c.id);
  const [{ data: invoices }, { data: quotes }] = await Promise.all([
    ids.length
      ? supabase
          .from("invoices")
          .select("client_id,total_ttc,status,issue_date")
          .in("client_id", ids)
          .neq("status", "brouillon")
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("quotes").select("client_id,status,created_at").in("client_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const stats = new Map<
    string,
    { ca: number; orders: number; quotes: number; lastDate: string | null }
  >();
  for (const id of ids) stats.set(id, { ca: 0, orders: 0, quotes: 0, lastDate: null });
  for (const inv of invoices ?? []) {
    if (!inv.client_id) continue;
    const s = stats.get(inv.client_id);
    if (!s) continue;
    if (inv.status !== "annule") {
      s.ca += Number(inv.total_ttc ?? 0);
      s.orders += 1;
    }
    if (inv.issue_date && (!s.lastDate || inv.issue_date > s.lastDate)) {
      s.lastDate = inv.issue_date;
    }
  }
  for (const q of quotes ?? []) {
    if (!q.client_id) continue;
    const s = stats.get(q.client_id);
    if (!s) continue;
    s.quotes += 1;
    if (q.created_at && (!s.lastDate || q.created_at > s.lastDate)) {
      s.lastDate = q.created_at;
    }
  }

  const enriched = (clients ?? []).map((c) => ({
    ...c,
    ca: stats.get(c.id)?.ca ?? 0,
    orders: stats.get(c.id)?.orders ?? 0,
    quotes: stats.get(c.id)?.quotes ?? 0,
    lastDate: stats.get(c.id)?.lastDate ?? null,
  }));

  return <PreviewClientsTable clients={enriched} />;
}
