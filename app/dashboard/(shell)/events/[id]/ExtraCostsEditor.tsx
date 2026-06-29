"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import {
  type EventExtraCosts,
  type Supplement,
  extraCostTotal,
} from "@/lib/extraCosts";
import { formatEUR } from "@/lib/format";
import { saveEventExtraCosts } from "../actions";

/**
 * Editable additional-charges block under the margin: glassware rental,
 * ice, and any number of free-form supplements (description + amount).
 * Saving refreshes the page so the margin recomputes with the new costs.
 */
export function ExtraCostsEditor({
  eventId,
  initial,
}: {
  eventId: string;
  initial: EventExtraCosts;
}) {
  const router = useRouter();
  const [verrerie, setVerrerie] = useState<string>(
    initial.verrerie ? String(initial.verrerie) : "",
  );
  const [glacons, setGlacons] = useState<string>(
    initial.glacons ? String(initial.glacons) : "",
  );
  const [supplements, setSupplements] = useState<Supplement[]>(
    initial.supplements.length ? initial.supplements : [],
  );
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const current: EventExtraCosts = {
    verrerie: Number(verrerie) || 0,
    glacons: Number(glacons) || 0,
    supplements,
  };
  const total = extraCostTotal(current);

  function addSupplement() {
    setSupplements((prev) => [...prev, { description: "", amount: 0 }]);
  }
  function patchSupplement(idx: number, patch: Partial<Supplement>) {
    setSupplements((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }
  function removeSupplement(idx: number) {
    setSupplements((prev) => prev.filter((_, i) => i !== idx));
  }

  function save() {
    startTransition(async () => {
      const res = await saveEventExtraCosts(eventId, current);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setMsg({ kind: "ok", text: "Charges enregistrées" });
      router.refresh();
      setTimeout(() => setMsg(null), 3000);
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Charges additionnelles
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">
            Déduites de la marge nette. Total&nbsp;: {formatEUR(total)} HT
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Enregistrer
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <AmountField
          label="Location verrerie (€ HT)"
          value={verrerie}
          onChange={setVerrerie}
        />
        <AmountField
          label="Glaçons (€ HT)"
          value={glacons}
          onChange={setGlacons}
        />
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Suppléments
          </p>
          <button
            type="button"
            onClick={addSupplement}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
          >
            <Plus className="h-3 w-3" /> Supplément
          </button>
        </div>

        {supplements.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Aucun supplément. Ajoute des charges ponctuelles (transport,
            décoration, prestataire…) avec leur description.
          </p>
        ) : (
          <ul className="space-y-2">
            {supplements.map((s, idx) => (
              <li
                key={idx}
                className="grid grid-cols-[minmax(0,1fr)_110px_28px] items-center gap-2"
              >
                <input
                  type="text"
                  value={s.description}
                  onChange={(e) =>
                    patchSupplement(idx, { description: e.target.value })
                  }
                  placeholder="Description (ex. Transport, décoration…)"
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={s.amount || ""}
                  onChange={(e) =>
                    patchSupplement(idx, { amount: Number(e.target.value) || 0 })
                  }
                  placeholder="€ HT"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm text-slate-900 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => removeSupplement(idx)}
                  aria-label="Retirer le supplément"
                  className="shrink-0 rounded p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {msg && (
        <p
          className={
            "mt-3 rounded-md px-3 py-2 text-xs " +
            (msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200")
          }
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-right text-sm text-slate-900 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      />
    </label>
  );
}
