import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewInvoiceButton } from "./NewInvoiceButton";
import { FacturesBrowser, type InvoiceRow } from "./FacturesBrowser";

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

  // Full client roster for the "Nouvelle facture" picker (direct
  // billing without a quote). Non-archived, alphabetical-ish.
  const { data: allClients } = await supabase
    .from("clients")
    .select("id,first_name,last_name,company_name,email")
    .eq("archived", false)
    .order("company_name", { ascending: true, nullsFirst: false })
    .limit(1000);
  const clientPickerOptions = (allClients ?? []).map((c) => {
    const name =
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.company_name ||
      c.email ||
      "Client sans nom";
    const sub =
      c.company_name && (c.first_name || c.last_name) ? c.company_name : c.email;
    return { id: c.id, label: name, sub: sub ?? null };
  });

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByInvoice.set(
      p.invoice_id,
      (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount ?? 0),
    );
  }

  // Credit notes (avoirs) offset what's still owed on their source
  // invoice. Queried independently of the date/type filter so a credit
  // always cancels its invoice's "reste", even if the avoir falls
  // outside the current view. Cancelled avoirs don't count.
  const nonCreditIds = (invoices ?? [])
    .filter((i) => !i.is_credit_note)
    .map((i) => i.id);
  const { data: creditNotes } = nonCreditIds.length
    ? await supabase
        .from("invoices")
        .select("source_invoice_id,total_ttc,status")
        .eq("is_credit_note", true)
        .in("source_invoice_id", nonCreditIds)
    : { data: [] };
  const creditedByInvoice = new Map<string, number>();
  for (const c of creditNotes ?? []) {
    if (!c.source_invoice_id || c.status === "annule") continue;
    creditedByInvoice.set(
      c.source_invoice_id,
      (creditedByInvoice.get(c.source_invoice_id) ?? 0) +
        Math.abs(Number(c.total_ttc ?? 0)),
    );
  }

  // Prepare row view-models (resolve client name + payments) so the
  // client-side browser can search/filter and total without re-querying.
  const rows: InvoiceRow[] = (invoices ?? []).map((inv) => {
    const client = inv.client_id ? clientsMap.get(inv.client_id) : null;
    const who =
      client?.company_name ||
      [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
      client?.email ||
      "—";
    return {
      id: inv.id,
      number: inv.number,
      status: inv.status,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      total_ttc: Number(inv.total_ttc ?? 0),
      is_credit_note: inv.is_credit_note,
      who,
      paid: paidByInvoice.get(inv.id) ?? 0,
      credited: creditedByInvoice.get(inv.id) ?? 0,
    };
  });
  const hasServerFilter = !!(from || to || (kind && kind !== "all"));

  const exportQs = new URLSearchParams();
  if (from) exportQs.set("from", from);
  if (to) exportQs.set("to", to);
  if (kind && kind !== "all") exportQs.set("kind", kind);
  const exportHref = `/api/dashboard/factures/export${
    exportQs.toString() ? `?${exportQs}` : ""
  }`;

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
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
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={exportHref}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter CSV
          </a>
          <NewInvoiceButton clients={clientPickerOptions} />
        </div>
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
          {hasServerFilter && (
            <Link
              href="/dashboard/factures"
              className="inline-flex items-center rounded-md border border-transparent px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Réinitialiser
            </Link>
          )}
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error.message}
        </div>
      )}

      <FacturesBrowser rows={rows} hasServerFilter={hasServerFilter} />
      </div>
    </div>
  );
}
