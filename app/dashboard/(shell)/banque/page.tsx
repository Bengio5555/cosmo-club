import Link from "next/link";
import { Landmark, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isQontoConfigured } from "@/lib/bank/qonto";
import { bankIsStale, loadOpenInvoices, syncBank, clientDisplayName } from "@/lib/bank/sync";
import { rankCandidates } from "@/lib/bank/match";
import { formatDateFR, formatEUR } from "@/lib/format";
import { SyncButton } from "./SyncButton";
import { BankBrowser, type TxRow, type OpenInvoiceOption, type Suggestion } from "./BankBrowser";

type SP = Promise<{ vue?: string }>;

export const metadata = { title: "Banque" };

/**
 * Banque (Qonto) : solde, mouvements des derniers mois et rapprochement
 * des virements entrants avec les factures. Lecture seule côté Qonto.
 * La synchro se fait à l'ouverture si la dernière date de plus de 15 min.
 */
export default async function BanquePage({ searchParams }: { searchParams: SP }) {
  const { vue } = await searchParams;
  const view: "rapprocher" | "tous" | "entrees" | "sorties" | "ignores" =
    vue === "tous" || vue === "entrees" || vue === "sorties" || vue === "ignores" ? vue : "rapprocher";

  const configured = isQontoConfigured();
  const admin = createAdminClient();
  let syncError: string | null = null;
  if (configured && (await bankIsStale(admin))) {
    const res = await syncBank();
    if (!res.ok) syncError = res.error;
  }

  const supabase = await createClient();
  const since = daysAgoISO(120);
  const [{ data: accounts }, { data: txs }] = await Promise.all([
    supabase.from("bank_accounts").select("*").order("is_main", { ascending: false }),
    supabase
      .from("bank_transactions")
      .select(
        "id,qonto_id,bank_account_id,side,amount,currency,operation_type,label,reference,note,status,emitted_at,settled_at,has_attachment,invoice_payment_id,match_status,match_mode,matched_at",
      )
      .or(`settled_at.gte.${since},settled_at.is.null`)
      .order("settled_at", { ascending: false, nullsFirst: true })
      .limit(600),
  ]);

  // Factures liées aux mouvements rapprochés (pour afficher le n° et le lien)
  const paymentIds = (txs ?? []).map((t) => t.invoice_payment_id).filter((x): x is string => !!x);
  const paymentToInvoice = new Map<string, { id: string; number: string }>();
  if (paymentIds.length) {
    const { data: pays } = await supabase.from("invoice_payments").select("id,invoice_id").in("id", paymentIds);
    const invIds = Array.from(new Set((pays ?? []).map((p) => p.invoice_id)));
    const { data: invs } = invIds.length
      ? await supabase.from("invoices").select("id,number").in("id", invIds)
      : { data: [] as { id: string; number: string }[] };
    const invMap = new Map((invs ?? []).map((i) => [i.id, i]));
    for (const p of pays ?? []) {
      const inv = invMap.get(p.invoice_id);
      if (inv) paymentToInvoice.set(p.id, inv);
    }
  }

  // Suggestions pour les virements entrants à traiter
  const openInvoices = configured ? await loadOpenInvoices(admin) : [];
  const options: OpenInvoiceOption[] = openInvoices.map((i) => ({
    id: i.id,
    number: i.number,
    client: i.client_name,
    remaining: i.remaining,
    issue_date: i.issue_date,
  }));
  const suggestions: Record<string, Suggestion[]> = {};
  for (const t of txs ?? []) {
    if (t.side !== "credit" || t.match_status !== "a_traiter") continue;
    suggestions[t.id] = rankCandidates({ ...t, amount: Number(t.amount) }, openInvoices)
      .slice(0, 3)
      .map((c) => ({ invoiceId: c.invoice.id, number: c.invoice.number, client: c.invoice.client_name, remaining: c.invoice.remaining, score: c.score, reasons: c.reasons }));
  }

  const rows: TxRow[] = (txs ?? []).map((t) => {
    const inv = t.invoice_payment_id ? paymentToInvoice.get(t.invoice_payment_id) : undefined;
    return {
      id: t.id,
      side: t.side,
      amount: Number(t.amount),
      operation_type: t.operation_type,
      label: t.label,
      reference: t.reference,
      note: t.note,
      status: t.status,
      date: t.settled_at ?? t.emitted_at,
      has_attachment: t.has_attachment,
      match_status: t.match_status,
      match_mode: t.match_mode,
      invoice: inv ? { id: inv.id, number: inv.number } : null,
    };
  });

  // KPI du mois en cours
  const monthStart = startOfMonth();
  let inMonth = 0;
  let outMonth = 0;
  for (const r of rows) {
    if (!r.date || new Date(r.date) < monthStart || r.status !== "completed") continue;
    if (r.side === "credit") inMonth += r.amount;
    else outMonth += r.amount;
  }
  const toMatch = rows.filter((r) => r.side === "credit" && r.match_status === "a_traiter" && r.status === "completed").length;
  const lastSync = (accounts ?? []).map((a) => a.synced_at).filter(Boolean).sort().at(-1) ?? null;
  const accountError = (accounts ?? []).find((a) => a.last_error)?.last_error ?? null;

  void clientDisplayName; // réexporté pour les pages futures

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
            Banque
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Compte Qonto en lecture seule. Les virements reçus sont rapprochés des factures : automatiquement
            quand le numéro et le montant concordent, sinon tu confirmes en un clic.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {lastSync ? <>Dernière synchronisation {formatDateFR(lastSync, { withTime: true })}.</> : "Jamais synchronisé."}{" "}
            Mise à jour automatique à l&apos;ouverture de la page si elle date de plus de 15 minutes.
          </p>
        </div>
        {configured && <SyncButton />}
      </header>

      {!configured && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Qonto n&apos;est pas connecté.</p>
            <p className="mt-0.5 text-xs">
              Ajoute les variables <code>QONTO_LOGIN</code> et <code>QONTO_SECRET_KEY</code> dans Vercel, puis
              redéploie. La clé se crée dans Qonto : Paramètres, Intégrations et partenariats, Clé API.
            </p>
          </div>
        </div>
      )}

      {(syncError || accountError) && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">La synchronisation Qonto a échoué.</p>
            <p className="mt-0.5 text-xs">{syncError ?? accountError}</p>
          </div>
        </div>
      )}

      {/* Comptes */}
      {(accounts ?? []).length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(accounts ?? []).map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none"
            >
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <Landmark className="h-3.5 w-3.5" />
                {a.name ?? "Compte"}
                {a.iban_last4 && <span className="font-mono normal-case tracking-normal">···{a.iban_last4}</span>}
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatEUR(a.balance)}
              </p>
              {a.authorized_balance != null && Math.abs(Number(a.authorized_balance) - Number(a.balance ?? 0)) > 0.009 && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Disponible {formatEUR(a.authorized_balance)} (opérations en attente)
                </p>
              )}
            </div>
          ))}
          <Kpi label="Entrées ce mois" value={formatEUR(inMonth)} tone="ok" />
          <Kpi label="Sorties ce mois" value={formatEUR(outMonth)} tone="neutral" />
          <Kpi
            label="Virements à rapprocher"
            value={String(toMatch)}
            tone={toMatch > 0 ? "pending" : "ok"}
            hint={toMatch > 0 ? "Entrées sans facture associée" : "Tout est rapproché"}
          />
          <Kpi
            label="Factures en attente"
            value={String(openInvoices.length)}
            tone="neutral"
            hint={
              openInvoices.length
                ? `${formatEUR(openInvoices.reduce((s, i) => s + i.remaining, 0))} à encaisser`
                : "Aucune facture ouverte"
            }
          />
        </div>
      )}

      <BankBrowser view={view} rows={rows} suggestions={suggestions} options={options} />

      <p className="mt-6 text-xs text-slate-500">
        Un encaissement créé ici apparaît sur la facture avec la mention « Rapproché depuis Qonto ». Détacher un
        mouvement supprime cet encaissement.{" "}
        <Link href="/dashboard/factures" className="underline underline-offset-2">
          Voir les factures
        </Link>
      </p>
    </div>
  );
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function Kpi({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "ok" | "pending" | "neutral";
  hint?: string;
}) {
  const color =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "pending"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
