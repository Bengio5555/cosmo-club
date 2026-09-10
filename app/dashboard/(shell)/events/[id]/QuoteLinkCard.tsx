"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { linkEventToQuote } from "../actions";

export type QuoteOption = { id: string; label: string; taken: boolean };

/**
 * "Devis source" on the event sheet. Mirrors the invoice editor's card:
 * pick a quote (awaiting signature or signed), saved immediately. Once
 * linked, the margin reads the quote's price; fields the event was
 * missing get filled from the quote (the action reports which).
 */
export function QuoteLinkCard({
  eventId,
  current,
  options,
}: {
  eventId: string;
  current: { id: string; number: string; status: string } | null;
  options: QuoteOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current?.id ?? "");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function change(next: string) {
    const previous = value;
    setValue(next);
    setMsg(null);
    startTransition(async () => {
      const res = await linkEventToQuote(eventId, next || null);
      if (!res.ok) {
        setValue(previous);
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setMsg({
        kind: "ok",
        text: !next
          ? "Devis détaché."
          : res.filled.length > 0
            ? `Devis rattaché · complété : ${res.filled.join(", ")}.`
            : "Devis rattaché.",
      });
      router.refresh();
    });
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
        Devis source
      </p>
      {current ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/devis/${current.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-white"
          >
            <FileText className="h-3.5 w-3.5" />
            {current.number}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <StatusBadge status={current.status} />
        </div>
      ) : (
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-500">
          Aucun devis lié — la marge ne connaît pas le prix de vente.
        </p>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => change(e.target.value)}
          disabled={pending}
          className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        >
          <option value="">— Aucun devis lié —</option>
          {options.map((q) => (
            <option key={q.id} value={q.id} disabled={q.taken}>
              {q.label}
              {q.taken ? " (déjà lié à un événement)" : ""}
            </option>
          ))}
        </select>
        {pending && (
          <Loader2 className="absolute right-8 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-500">
        Devis envoyés (en attente de signature) et signés. Rattacher donne le
        prix à la marge et complète ce qui manque à l&apos;événement, sans
        écraser ce que tu as saisi. Enregistré immédiatement.
      </p>
      {msg && (
        <p
          className={`mt-2 rounded-md px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
