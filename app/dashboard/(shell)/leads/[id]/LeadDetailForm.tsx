"use client";

import { useState, useTransition } from "react";
import { Check, FileText, Loader2 } from "lucide-react";
import type { Tables } from "@/types/database";
import { updateLead, convertLeadToQuote } from "./actions";

type Lead = Tables<"leads">;

const STATUS_OPTIONS: { value: Lead["status"]; label: string }[] = [
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "gagne", label: "Gagné" },
  { value: "perdu", label: "Perdu" },
];

export function LeadDetailForm({ lead, hasQuote }: { lead: Lead; hasQuote: boolean }) {
  const [status, setStatus] = useState<Lead["status"]>(lead.status);
  const [notes, setNotes] = useState<string>(lead.internal_notes ?? "");
  const [pending, startTransition] = useTransition();
  const [converting, startConverting] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const dirty = status !== lead.status || (notes ?? "") !== (lead.internal_notes ?? "");

  function save() {
    startTransition(async () => {
      setMsg(null);
      const res = await updateLead(lead.id, { status, internal_notes: notes || null });
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setMsg({ kind: "ok", text: "Enregistré" });
      setTimeout(() => setMsg(null), 2000);
    });
  }

  function convert() {
    if (
      hasQuote &&
      !window.confirm("Un devis existe déjà pour ce lead. Créer un second ?")
    ) {
      return;
    }
    startConverting(async () => {
      setMsg(null);
      const res = await convertLeadToQuote(lead.id);
      // On success the action redirects, so we never reach this branch.
      if (res && "error" in res && res.error) {
        setMsg({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <div className="sticky top-16 space-y-4">
      {/* Status */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
          Statut
        </p>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Lead["status"])}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:shadow-none focus:border-[color:var(--color-grenat)] focus:outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Internal notes */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
          Notes internes
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Détails, points à vérifier, pricing indicatif…"
          className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
        />
      </div>

      {msg && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Save */}
      <button
        type="button"
        disabled={pending || !dirty}
        onClick={save}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-200 dark:bg-neutral-800 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Enregistrer
      </button>

      {/* Convert to devis */}
      <button
        type="button"
        disabled={converting}
        onClick={convert}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[color:var(--color-grenat)] px-4 py-2.5 text-sm font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        {hasQuote ? "Créer un nouveau devis" : "Transformer en devis"}
      </button>

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-neutral-500">
        Crée ou ré-utilise une fiche client et génère un devis brouillon. Le
        statut passera automatiquement à <em>Devis envoyé</em>.
      </p>
    </div>
  );
}
