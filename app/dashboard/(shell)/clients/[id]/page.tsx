import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  Receipt,
  Inbox,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateFR, formatEUR } from "@/lib/format";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ClientForm } from "./ClientForm";
import { ClientActions } from "./ClientActions";

type Params = Promise<{ id: string }>;

export default async function ClientDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const [{ data: leads }, { data: quotes }, { data: invoices }] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id,status,event_type,event_date,created_at,message,contact_name,guests_count",
        )
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("quotes")
        .select(
          "id,number,status,issue_date,event_date,event_type,total_ttc,accepted_at,sent_at",
        )
        .eq("client_id", id)
        .order("issue_date", { ascending: false }),
      supabase
        .from("invoices")
        .select(
          "id,number,status,issue_date,due_date,total_ttc,paid_at,sent_at,is_credit_note,source_invoice_id,reminder_count",
        )
        .eq("client_id", id)
        .order("issue_date", { ascending: false }),
    ]);

  // Payments depend on invoice IDs — second roundtrip. Acceptable: one client's
  // invoice set is bounded.
  const invoiceIds = (invoices ?? []).map((i) => i.id);
  const paymentsForClient = invoiceIds.length
    ? (
        await supabase
          .from("invoice_payments")
          .select("id,invoice_id,amount,paid_on,method,reference")
          .in("invoice_id", invoiceIds)
          .order("paid_on", { ascending: false })
      ).data ?? []
    : [];

  // ─── Stats ─────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  let caTotal = 0;
  let caYear = 0;
  let nbFactures = 0;
  let nbAvoirs = 0;
  let unpaidRemaining = 0;

  const paidByInvoice = new Map<string, number>();
  for (const p of paymentsForClient) {
    paidByInvoice.set(
      p.invoice_id,
      (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount ?? 0),
    );
  }

  for (const inv of invoices ?? []) {
    if (inv.status === "brouillon" || inv.status === "annule") continue;
    const ttc = Number(inv.total_ttc ?? 0);
    caTotal += ttc;
    if (inv.issue_date && inv.issue_date.startsWith(String(currentYear))) {
      caYear += ttc;
    }
    if (inv.is_credit_note) nbAvoirs++;
    else {
      nbFactures++;
      const paid = paidByInvoice.get(inv.id) ?? 0;
      unpaidRemaining += Math.max(0, ttc - paid);
    }
  }

  const acceptedQuotes = (quotes ?? []).filter((q) => q.status === "accepte");

  const displayName =
    client.company_name ||
    [client.first_name, client.last_name].filter(Boolean).join(" ") ||
    client.email ||
    "Client";

  return (
    <>
      <div className="border-b border-slate-100 dark:border-slate-900 px-4 pt-6 md:px-8">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Tous les clients
        </Link>
      </div>

      {/* Header */}
      <div className="px-4 pt-6 md:px-8">
        <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-900 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Client
              {client.company_name && " · B2B"}
              {client.archived && " · archivé"}
            </p>
            <h1 className="font-display text-2xl text-slate-900 dark:text-white md:text-3xl">
              {displayName}
              {client.archived && (
                <span className="ml-3 align-middle rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Archivé
                </span>
              )}
            </h1>
            {client.company_name &&
              (client.first_name || client.last_name) && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Contact :{" "}
                  {[client.first_name, client.last_name]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                >
                  <Mail className="h-3 w-3" /> {client.email}
                </a>
              )}
              {client.phone && (
                <a
                  href={`tel:${client.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                >
                  <Phone className="h-3 w-3" /> {client.phone}
                </a>
              )}
              {client.city && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3 w-3" /> {client.city}
                </span>
              )}
            </div>
          </div>

          <ClientActions
            clientId={client.id}
            archived={client.archived}
            hasRefs={
              (leads?.length ?? 0) +
                (quotes?.length ?? 0) +
                (invoices?.length ?? 0) >
              0
            }
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 px-4 py-5 md:grid-cols-4 md:px-8">
        <StatCard label="CA cumulé" value={formatEUR(caTotal)} tone="ok" />
        <StatCard
          label={`CA ${currentYear}`}
          value={formatEUR(caYear)}
          tone="ok"
        />
        <StatCard
          label="Factures émises"
          value={`${nbFactures}${nbAvoirs > 0 ? ` · ${nbAvoirs} avoir${nbAvoirs > 1 ? "s" : ""}` : ""}`}
        />
        <StatCard
          label="Reste à encaisser"
          value={formatEUR(unpaidRemaining)}
          tone={unpaidRemaining > 0 ? "pending" : "ok"}
        />
      </div>

      {/* Form (inline editor for coords) + history */}
      <div className="grid gap-5 px-4 pb-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:px-8">
        <ClientForm client={client} />

        <div className="space-y-5">
          {/* Devis */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
                Devis
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-500">
                  · {quotes?.length ?? 0}
                  {acceptedQuotes.length > 0 &&
                    ` · ${acceptedQuotes.length} accepté${acceptedQuotes.length > 1 ? "s" : ""}`}
                </span>
              </h2>
            </div>
            {quotes && quotes.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-900 text-sm">
                {quotes.map((q) => (
                  <li key={q.id} className="flex items-center gap-3 py-2.5">
                    <Link
                      href={`/dashboard/devis/${q.id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 transition-colors hover:text-slate-900 dark:hover:text-white"
                    >
                      {q.number}
                    </Link>
                    <div className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-500">
                      {formatDateFR(q.issue_date)}
                      {q.event_date && ` · événement ${formatDateFR(q.event_date)}`}
                    </div>
                    <StatusBadge status={q.status} />
                    <span className="w-20 text-right font-medium text-slate-700 dark:text-slate-200">
                      {formatEUR(q.total_ttc)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-500">
                Aucun devis pour l&apos;instant.
              </p>
            )}
          </section>

          {/* Factures */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Receipt className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
                Factures & avoirs
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-500">
                  · {invoices?.length ?? 0}
                </span>
              </h2>
            </div>
            {invoices && invoices.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-900 text-sm">
                {invoices.map((inv) => {
                  const paid = paidByInvoice.get(inv.id) ?? 0;
                  const remaining = inv.is_credit_note
                    ? 0
                    : Math.round((Number(inv.total_ttc) - paid) * 100) / 100;
                  return (
                    <li key={inv.id} className="flex items-center gap-3 py-2.5">
                      <Link
                        href={`/dashboard/factures/${inv.id}`}
                        className="inline-flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100 transition-colors hover:text-slate-900 dark:hover:text-white"
                      >
                        {inv.number}
                        {inv.is_credit_note && (
                          <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-200">
                            Avoir
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-500">
                        {formatDateFR(inv.issue_date)}
                        {!inv.is_credit_note && remaining > 0 && (
                          <span className="ml-2 text-amber-400">
                            · reste {formatEUR(remaining)}
                          </span>
                        )}
                        {(inv.reminder_count ?? 0) > 0 && (
                          <span className="ml-2 text-amber-500/70">
                            · {inv.reminder_count} relance
                            {(inv.reminder_count ?? 0) > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <StatusBadge status={inv.status} />
                      <span
                        className={`w-24 text-right font-medium ${inv.is_credit_note ? "text-violet-700 dark:text-violet-200" : "text-slate-700 dark:text-slate-200"}`}
                      >
                        {formatEUR(inv.total_ttc)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-500">
                Aucune facture émise.
              </p>
            )}
          </section>

          {/* Paiements */}
          {paymentsForClient.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <CalendarDays className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
                Encaissements
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-500">
                  · {paymentsForClient.length}
                </span>
              </h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-900 text-sm">
                {paymentsForClient.map((p) => {
                  const inv = (invoices ?? []).find(
                    (i) => i.id === p.invoice_id,
                  );
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-2">
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        {formatEUR(Number(p.amount))}
                      </span>
                      <div className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-500">
                        {formatDateFR(p.paid_on)}
                        {p.method && ` · ${p.method}`}
                        {p.reference && ` · réf. ${p.reference}`}
                      </div>
                      {inv && (
                        <Link
                          href={`/dashboard/factures/${inv.id}`}
                          className="text-xs text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
                        >
                          {inv.number}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Leads (historique demande initiale) */}
          {leads && leads.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Inbox className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
                Demandes initiales
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-500">
                  · {leads.length}
                </span>
              </h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-900 text-sm">
                {leads.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2">
                    <Link
                      href={`/dashboard/leads/${l.id}`}
                      className="text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors hover:text-slate-900 dark:hover:text-white"
                    >
                      {formatDateFR(l.created_at)}
                    </Link>
                    <div className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-500">
                      {l.event_type && <span>{l.event_type}</span>}
                      {l.event_date && ` · ${formatDateFR(l.event_date)}`}
                      {l.guests_count && ` · ${l.guests_count} pers.`}
                    </div>
                    <StatusBadge status={l.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({
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
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "pending"
      ? "text-amber-700 dark:text-amber-300"
      : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold ${toneCls}`}>{value}</p>
    </div>
  );
}
