"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { Tables } from "@/types/database";
import { formatDateFR, formatEUR } from "@/lib/format";
import { addPayment, removePayment } from "./actions";

type Payment = Tables<"invoice_payments">;

const METHODS = ["virement", "chèque", "espèces", "carte", "autre"];

export function PaymentsSection({
  invoiceId,
  invoiceStatus,
  totalTtc,
  payments,
}: {
  invoiceId: string;
  invoiceStatus: string;
  totalTtc: number;
  payments: Payment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  const canEdit = invoiceStatus !== "brouillon" && invoiceStatus !== "annule";

  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.round((totalTtc - paid) * 100) / 100;

  function flash(m: { kind: "ok" | "err"; text: string }) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  }

  function handleAdd(form: FormData) {
    const amount = Number(form.get("amount"));
    if (!Number.isFinite(amount) || amount === 0) {
      return flash({ kind: "err", text: "Montant invalide." });
    }
    const input = {
      amount,
      paid_on: String(form.get("paid_on") || new Date().toISOString().slice(0, 10)),
      method: String(form.get("method") || "") || null,
      reference: String(form.get("reference") || "") || null,
      notes: String(form.get("notes") || "") || null,
    };
    startTransition(async () => {
      const res = await addPayment(invoiceId, input);
      if (!res.ok) return flash({ kind: "err", text: res.error });
      setAdding(false);
      flash({ kind: "ok", text: "Paiement enregistré." });
      router.refresh();
    });
  }

  function handleRemove(id: string) {
    if (!window.confirm("Supprimer ce paiement ?")) return;
    startTransition(async () => {
      const res = await removePayment(id, invoiceId);
      if (!res.ok) return flash({ kind: "err", text: res.error });
      flash({ kind: "ok", text: "Paiement supprimé." });
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Encaissements
        </p>
        {canEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-900 dark:text-white transition-colors hover:bg-slate-700"
          >
            <Plus className="h-3 w-3" /> Paiement
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-3 text-center">
        <Stat label="Total TTC" value={formatEUR(totalTtc)} />
        <Stat label="Encaissé" value={formatEUR(paid)} tone="ok" />
        <Stat
          label="Reste à encaisser"
          value={formatEUR(remaining)}
          tone={remaining <= 0 ? "ok" : "pending"}
        />
      </div>

      {msg && (
        <div
          className={`mb-3 rounded-md border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {adding && canEdit && (
        <form
          action={handleAdd}
          className="mb-3 space-y-2 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-3"
        >
          <div className="grid gap-2 md:grid-cols-[minmax(0,120px)_minmax(0,140px)_minmax(0,1fr)]">
            <Field label="Montant">
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                autoFocus
                defaultValue={remaining > 0 ? remaining : undefined}
                className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
              />
            </Field>
            <Field label="Date">
              <input
                name="paid_on"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
              />
            </Field>
            <Field label="Moyen">
              <select
                name="method"
                defaultValue="virement"
                className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <Field label="Référence (optionnelle)">
              <input
                name="reference"
                type="text"
                placeholder="N° virement, chèque…"
                className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
              />
            </Field>
            <Field label="Notes (optionnelles)">
              <input
                name="notes"
                type="text"
                className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
              />
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {payments.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-500">
          Aucun paiement enregistré.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-900">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 dark:text-slate-200">
                  <span className="font-medium">{formatEUR(p.amount)}</span>
                  {p.method && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-500">
                      · {p.method}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-500">
                  {formatDateFR(p.paid_on)}
                  {p.reference ? ` · réf. ${p.reference}` : ""}
                  {p.notes ? ` · ${p.notes}` : ""}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  className="rounded p-1.5 text-slate-500 dark:text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── Helpers ──────────────────────────────────────────────── */

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
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "pending"
      ? "text-amber-700 dark:text-amber-300"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
