"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Check, Link2, Link2Off, EyeOff, Eye, Loader2, Paperclip, Sparkles } from "lucide-react";
import { formatDateFR, formatEUR } from "@/lib/format";
import { REASON_LABEL, type MatchReason } from "@/lib/bank/match";
import { matchTransaction, ignoreTransaction, unmatchTransaction } from "./actions";

export type TxRow = {
  id: string;
  side: "credit" | "debit";
  amount: number;
  operation_type: string | null;
  label: string | null;
  reference: string | null;
  note: string | null;
  status: string;
  date: string | null;
  has_attachment: boolean;
  match_status: "a_traiter" | "rapproche" | "ignore";
  match_mode: "auto" | "manuel" | null;
  invoice: { id: string; number: string } | null;
};

export type OpenInvoiceOption = {
  id: string;
  number: string;
  client: string | null;
  remaining: number;
  issue_date: string;
};

export type Suggestion = {
  invoiceId: string;
  number: string;
  client: string | null;
  remaining: number;
  score: number;
  reasons: MatchReason[];
};

type View = "rapprocher" | "tous" | "entrees" | "sorties" | "ignores";

const OP_LABEL: Record<string, string> = {
  transfer: "Virement",
  income: "Virement reçu",
  card: "Carte",
  direct_debit: "Prélèvement",
  qonto_fee: "Frais Qonto",
  cheque: "Chèque",
  recall: "Rappel",
  swift_income: "Virement international",
  direct_debit_collection: "Encaissement SEPA",
  pay_later: "Paiement différé",
};

export function BankBrowser({
  view,
  rows,
  suggestions,
  options,
}: {
  view: View;
  rows: TxRow[];
  suggestions: Record<string, Suggestion[]>;
  options: OpenInvoiceOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});

  const counts = useMemo(() => {
    const c = { rapprocher: 0, tous: rows.length, entrees: 0, sorties: 0, ignores: 0 };
    for (const r of rows) {
      if (r.side === "credit") c.entrees += 1;
      else c.sorties += 1;
      if (r.match_status === "ignore") c.ignores += 1;
      if (r.side === "credit" && r.match_status === "a_traiter" && r.status === "completed") c.rapprocher += 1;
    }
    return c;
  }, [rows]);

  const visible = rows.filter((r) => {
    if (view === "rapprocher") return r.side === "credit" && r.match_status === "a_traiter" && r.status === "completed";
    if (view === "entrees") return r.side === "credit" && r.match_status !== "ignore";
    if (view === "sorties") return r.side === "debit";
    if (view === "ignores") return r.match_status === "ignore";
    return r.match_status !== "ignore";
  });

  function run(id: string, fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) {
    setBusyId(id);
    start(async () => {
      const res = await fn();
      setFlash(res.ok ? { kind: "ok", text: res.message } : { kind: "err", text: res.error });
      setTimeout(() => setFlash(null), 4000);
      setBusyId(null);
      router.refresh();
    });
  }

  const tabs: { key: View; label: string; count: number }[] = [
    { key: "rapprocher", label: "À rapprocher", count: counts.rapprocher },
    { key: "entrees", label: "Entrées", count: counts.entrees },
    { key: "sorties", label: "Sorties", count: counts.sorties },
    { key: "tous", label: "Tous", count: counts.tous },
    { key: "ignores", label: "Ignorés", count: counts.ignores },
  ];

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "rapprocher" ? "/dashboard/banque" : `/dashboard/banque?vue=${t.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              view === t.key
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums opacity-70">{t.count}</span>
          </Link>
        ))}
        {flash && (
          <span className={`ml-auto text-xs ${flash.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {flash.text}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            {view === "rapprocher"
              ? "Aucun virement entrant en attente. Tout est rapproché."
              : "Aucun mouvement sur cette vue."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {visible.map((r) => {
              const sugg = suggestions[r.id] ?? [];
              const best = sugg[0];
              const chosen = picked[r.id] ?? best?.invoiceId ?? "";
              const busy = pending && busyId === r.id;
              const canMatch = r.side === "credit" && r.match_status === "a_traiter" && r.status === "completed";
              return (
                <li key={r.id} className="px-4 py-3 md:px-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
                    {/* Icône + libellé */}
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          r.side === "credit"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {r.side === "credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {r.label || OP_LABEL[r.operation_type ?? ""] || "Mouvement"}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                          <span>{formatDateFR(r.date)}</span>
                          <span>·</span>
                          <span>{OP_LABEL[r.operation_type ?? ""] ?? r.operation_type ?? "—"}</span>
                          {r.status !== "completed" && (
                            <span className="rounded-full border border-amber-300 px-1.5 text-[10px] uppercase text-amber-700 dark:border-amber-700 dark:text-amber-300">
                              {r.status === "pending" ? "en attente" : r.status}
                            </span>
                          )}
                          {r.has_attachment && <Paperclip className="h-3 w-3" aria-label="Justificatif joint" />}
                        </p>
                        {(r.reference || r.note) && (
                          <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">
                            {r.reference}
                            {r.reference && r.note ? " · " : ""}
                            {r.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Montant */}
                    <p
                      className={`shrink-0 text-right text-sm font-semibold tabular-nums md:w-32 ${
                        r.side === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {r.side === "credit" ? "+" : "−"}
                      {formatEUR(r.amount)}
                    </p>

                    {/* État / actions */}
                    <div className="shrink-0 md:w-72">
                      {r.match_status === "rapproche" && r.invoice ? (
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/dashboard/factures/${r.invoice.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Facture {r.invoice.number}
                            {r.match_mode === "auto" && <Sparkles className="h-3 w-3 opacity-70" aria-label="Automatique" />}
                          </Link>
                          <button
                            type="button"
                            disabled={busy}
                            title="Détacher de la facture"
                            onClick={() => {
                              if (!window.confirm("Détacher ce virement de la facture ? L'encaissement sera supprimé.")) return;
                              run(r.id, () => unmatchTransaction(r.id));
                            }}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2Off className="h-4 w-4" />}
                          </button>
                        </div>
                      ) : r.match_status === "ignore" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(r.id, () => ignoreTransaction(r.id, false))}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" /> Remettre à traiter
                        </button>
                      ) : canMatch ? (
                        <div className="space-y-1.5">
                          <select
                            value={chosen}
                            onChange={(e) => setPicked((p) => ({ ...p, [r.id]: e.target.value }))}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          >
                            <option value="">Choisir une facture…</option>
                            {sugg.length > 0 && (
                              <optgroup label="Suggestions">
                                {sugg.map((s) => (
                                  <option key={s.invoiceId} value={s.invoiceId}>
                                    {s.number} · {s.client ?? "client ?"} · reste {formatEUR(s.remaining)}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Toutes les factures ouvertes">
                              {options
                                .filter((o) => !sugg.some((s) => s.invoiceId === o.id))
                                .map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.number} · {o.client ?? "client ?"} · reste {formatEUR(o.remaining)}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          {best && chosen === best.invoiceId && (
                            <p className="text-[11px] text-slate-500">
                              {best.reasons.map((x) => REASON_LABEL[x]).join(", ")}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busy || !chosen}
                              onClick={() => run(r.id, () => matchTransaction(r.id, chosen))}
                              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                            >
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                              Rapprocher
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => run(r.id, () => ignoreTransaction(r.id, true))}
                              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Pas lié à une facture (remboursement, apport…)"
                            >
                              <EyeOff className="h-3.5 w-3.5" /> Ignorer
                            </button>
                          </div>
                        </div>
                      ) : r.side === "credit" && r.status !== "completed" ? (
                        <p className="text-xs text-slate-500">Rapprochable une fois le virement exécuté.</p>
                      ) : (
                        <p className="text-xs text-slate-400">—</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
