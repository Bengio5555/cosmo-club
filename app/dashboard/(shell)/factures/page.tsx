import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDateFR, formatEUR } from "@/lib/format";

export default async function InvoicesListPage() {
  const supabase = await createClient();
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id,number,status,issue_date,due_date,total_ttc,client_id")
    .order("created_at", { ascending: false })
    .limit(200);

  const clientIds = Array.from(
    new Set((invoices ?? []).map((i) => i.client_id).filter((x): x is string => !!x)),
  );
  const { data: clientsList } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id,first_name,last_name,company_name,email")
        .in("id", clientIds)
    : { data: [] };
  const clientsMap = new Map((clientsList ?? []).map((c) => [c.id, c]));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Factures</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Numérotation continue française, PDF imprimable, lock après émission
          (art. 242 nonies A du CGI).
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
        {invoices && invoices.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-[10px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2.5 font-medium md:px-4">Numéro</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Client</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Émise</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Échéance</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Statut</th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const client = inv.client_id ? clientsMap.get(inv.client_id) : null;
                const who =
                  client?.company_name ||
                  [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
                  client?.email ||
                  "—";
                const overdue =
                  inv.status === "envoye" && inv.due_date && inv.due_date < today;
                return (
                  <tr
                    key={inv.id}
                    className="border-t border-neutral-900 transition-colors hover:bg-neutral-900"
                  >
                    <td className="px-3 py-3 md:px-4">
                      <Link
                        href={`/dashboard/factures/${inv.id}`}
                        className="font-medium text-white transition-colors hover:text-[color:var(--color-grenat-glow)]"
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-neutral-200 md:px-4">{who}</td>
                    <td className="hidden px-3 py-3 text-xs text-neutral-400 md:table-cell md:px-4">
                      {formatDateFR(inv.issue_date)}
                    </td>
                    <td className="hidden px-3 py-3 text-xs md:table-cell md:px-4">
                      {inv.due_date ? (
                        <span className={overdue ? "text-red-300" : "text-neutral-400"}>
                          {formatDateFR(inv.due_date)}
                          {overdue && <span className="ml-1 text-red-400">(en retard)</span>}
                        </span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 md:px-4">
                      <StatusBadge
                        status={overdue && inv.status === "envoye" ? "en_retard" : inv.status}
                      />
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-neutral-200 md:px-4">
                      {formatEUR(inv.total_ttc)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-sm text-neutral-500">
            Aucune facture. Depuis un{" "}
            <Link href="/dashboard/devis" className="text-neutral-300 underline">
              devis accepté
            </Link>
            , clique « Créer la facture » pour en générer une.
          </div>
        )}
      </div>
    </div>
  );
}
