import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDateFR, formatEUR } from "@/lib/format";

type SP = Promise<{ from?: string; to?: string; kind?: string }>;

export default async function InvoicesListPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { from, to, kind } = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("invoices")
    .select(
      "id,number,status,issue_date,due_date,total_ttc,client_id,is_credit_note,source_invoice_id",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (from) q = q.gte("issue_date", from);
  if (to) q = q.lte("issue_date", to);
  if (kind === "factures") q = q.eq("is_credit_note", false);
  if (kind === "avoirs") q = q.eq("is_credit_note", true);

  const { data: invoices, error } = await q;

  const clientIds = Array.from(
    new Set((invoices ?? []).map((i) => i.client_id).filter((x): x is string => !!x)),
  );
  const invoiceIds = (invoices ?? []).map((i) => i.id);

  const [{ data: clientsList }, { data: payments }] = await Promise.all([
    clientIds.length
      ? supabase
          .from("clients")
          .select("id,first_name,last_name,company_name,email")
          .in("id", clientIds)
      : Promise.resolve({ data: [] }),
    invoiceIds.length
      ? supabase
          .from("invoice_payments")
          .select("invoice_id,amount")
          .in("invoice_id", invoiceIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clientsMap = new Map((clientsList ?? []).map((c) => [c.id, c]));
  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByInvoice.set(
      p.invoice_id,
      (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount ?? 0),
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const exportQs = new URLSearchParams();
  if (from) exportQs.set("from", from);
  if (to) exportQs.set("to", to);
  if (kind && kind !== "all") exportQs.set("kind", kind);
  const exportHref = `/api/dashboard/factures/export${
    exportQs.toString() ? `?${exportQs}` : ""
  }`;

  // Totals bar (sum over current filter).
  let sumHt = 0;
  let sumTtc = 0;
  let sumPaid = 0;
  let sumRemaining = 0;
  for (const inv of invoices ?? []) {
    sumHt += Number(inv.total_ttc ?? 0); // TTC only; HT aggregation would need a separate query
    sumTtc += Number(inv.total_ttc ?? 0);
    const paid = paidByInvoice.get(inv.id) ?? 0;
    sumPaid += inv.is_credit_note ? 0 : paid;
    if (!inv.is_credit_note && inv.status !== "annule") {
      sumRemaining += Math.max(0, Number(inv.total_ttc ?? 0) - paid);
    }
  }
  void sumHt; // placeholder, we display TTC aggregates

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pilotage · Comptabilité
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
            Factures
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Numérotation continue FR, PDF imprimable, lock après émission (art.
            242 nonies A du CGI). Avoirs et paiements partiels supportés.
          </p>
        </div>
        <a
          href={exportHref}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Download className="h-3.5 w-3.5" />
          Exporter CSV
        </a>
      </header>

      <form
        method="GET"
        className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-3 md:grid-cols-[minmax(0,140px)_minmax(0,140px)_minmax(0,140px)_auto] md:items-end"
      >
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Du
          </span>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Au
          </span>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Type
          </span>
          <select
            name="kind"
            defaultValue={kind ?? "all"}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none"
          >
            <option value="all">Tous</option>
            <option value="factures">Factures</option>
            <option value="avoirs">Avoirs</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:text-white dark:shadow-none"
          >
            Filtrer
          </button>
          {(from || to || (kind && kind !== "all")) && (
            <Link
              href="/dashboard/factures"
              className="inline-flex items-center rounded-md border border-transparent px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Réinitialiser
            </Link>
          )}
        </div>
      </form>

      {/* Totals bar */}
      {(invoices?.length ?? 0) > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-3 text-center">
          <Stat label={`Total TTC (${invoices?.length})`} value={formatEUR(sumTtc)} />
          <Stat label="Encaissé" value={formatEUR(sumPaid)} tone="ok" />
          <Stat label="Reste à encaisser" value={formatEUR(sumRemaining)} tone="pending" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        {invoices && invoices.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-medium md:px-4">Numéro</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Client</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Émise</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Échéance</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Statut</th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">Total TTC</th>
                <th className="hidden px-3 py-2.5 text-right font-medium md:table-cell md:px-4">
                  Reste
                </th>
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
                  !inv.is_credit_note &&
                  inv.status === "envoye" &&
                  inv.due_date &&
                  inv.due_date < today;
                const paid = paidByInvoice.get(inv.id) ?? 0;
                const remaining = inv.is_credit_note
                  ? 0
                  : Math.round((Number(inv.total_ttc) - paid) * 100) / 100;
                return (
                  <tr
                    key={inv.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
                  >
                    <td className="px-3 py-3 md:px-4">
                      <Link
                        href={`/dashboard/factures/${inv.id}`}
                        className="inline-flex items-center gap-2 font-medium text-slate-900 transition-colors hover:text-[color:var(--color-grenat)] dark:text-white dark:hover:text-[color:var(--color-grenat-glow)]"
                      >
                        {inv.number}
                        {inv.is_credit_note && (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-700 dark:text-violet-200">
                            Avoir
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-700 dark:text-slate-200 md:px-4">{who}</td>
                    <td className="hidden px-3 py-3 text-xs text-slate-500 dark:text-slate-400 md:table-cell md:px-4">
                      {formatDateFR(inv.issue_date)}
                    </td>
                    <td className="hidden px-3 py-3 text-xs md:table-cell md:px-4">
                      {inv.due_date ? (
                        <span className={overdue ? "text-red-600 dark:text-red-300" : "text-slate-500 dark:text-slate-400"}>
                          {formatDateFR(inv.due_date)}
                          {overdue && <span className="ml-1 text-red-600 dark:text-red-600 dark:text-red-400">(en retard)</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 md:px-4">
                      <StatusBadge
                        status={overdue && inv.status === "envoye" ? "en_retard" : inv.status}
                      />
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-medium md:px-4 ${
                        inv.is_credit_note
                          ? "text-violet-700 dark:text-violet-700 dark:text-violet-200"
                          : "text-slate-900 dark:text-slate-200"
                      }`}
                    >
                      {formatEUR(Number(inv.total_ttc))}
                    </td>
                    <td className="hidden px-3 py-3 text-right md:table-cell md:px-4">
                      {inv.is_credit_note ? (
                        <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                      ) : remaining <= 0 ? (
                        <span className="text-xs text-emerald-700 dark:text-emerald-700 dark:text-emerald-300">Soldé</span>
                      ) : (
                        <span
                          className={`text-xs font-medium ${
                            overdue
                              ? "text-red-600 dark:text-red-300"
                              : "text-amber-700 dark:text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {formatEUR(remaining)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-500">
            Aucune facture{from || to || (kind && kind !== "all") ? " sur ce filtre" : ""}.
            Depuis un{" "}
            <Link
              href="/dashboard/devis"
              className="text-slate-700 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              devis accepté
            </Link>
            , clique « Créer la facture » pour en générer une.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "pending";
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-700 dark:text-emerald-300"
      : tone === "pending"
      ? "text-amber-700 dark:text-amber-700 dark:text-amber-300"
      : "text-slate-900 dark:text-slate-100";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold ${toneCls}`}>{value}</p>
    </div>
  );
}
