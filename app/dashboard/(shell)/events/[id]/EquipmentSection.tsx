"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, Loader2, QrCode, RotateCcw, ScanLine } from "lucide-react";
import type { Database, Tables } from "@/types/database";
import { EQUIPMENT_CATEGORY_LABEL, type EquipmentCategory } from "@/lib/equipment/shared";
import { clearEquipmentScan, markEquipmentManually, setEventEquipment } from "../actions";

type EventStatus = Database["public"]["Enums"]["event_status"];
export type EquipmentOption = Pick<Tables<"equipment">, "id" | "code" | "name" | "category" | "contents" | "archived">;
type Assignment = Tables<"event_equipment">;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

export function EquipmentSection({
  eventId,
  eventStatus,
  options,
  assignments,
  scanUrl,
  readOnly = false,
}: {
  eventId: string;
  eventStatus: EventStatus;
  options: EquipmentOption[];
  assignments: Assignment[];
  /** Public scan URL (needs the briefing token); null until a briefing exists. */
  scanUrl: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [copied, setCopied] = useState(false);

  const locked = readOnly || eventStatus === "termine" || eventStatus === "annule";
  const byId = new Map(assignments.map((a) => [a.equipment_id, a]));
  const selected = options.filter((o) => byId.has(o.id));
  const departDone = selected.filter((o) => byId.get(o.id)?.depart_at).length;
  const retourDone = selected.filter((o) => byId.get(o.id)?.retour_at).length;

  const grouped = new Map<EquipmentCategory, EquipmentOption[]>();
  for (const o of options) {
    if (o.archived && !byId.has(o.id)) continue;
    const arr = grouped.get(o.category) ?? [];
    arr.push(o);
    grouped.set(o.category, arr);
  }

  function toggle(id: string, next: boolean) {
    setErr(null);
    startTransition(async () => {
      const res = await setEventEquipment(eventId, id, next);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function clear(id: string, phase: "depart" | "retour") {
    if (!window.confirm("Effacer ce scan ?")) return;
    startTransition(async () => {
      const res = await clearEquipmentScan(eventId, id, phase);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function mark(id: string, phase: "depart" | "retour") {
    startTransition(async () => {
      const res = await markEquipmentManually(eventId, id, phase);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function copyScanUrl() {
    if (!scanUrl) return;
    const abs = scanUrl.startsWith("http") ? scanUrl : `${window.location.origin}${scanUrl}`;
    navigator.clipboard?.writeText(abs).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Matériel à charger</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">
            {selected.length === 0
              ? "Aucun élément sélectionné"
              : `${selected.length} élément${selected.length > 1 ? "s" : ""} · départ ${departDone}/${selected.length} · retour ${retourDone}/${selected.length}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {scanUrl && selected.length > 0 && (
            <button
              type="button"
              onClick={copyScanUrl}
              title="Lien du module de scan (le même que dans le brief)"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copié" : "Lien scan"}
            </button>
          )}
          {!locked && !picking && (
            <button
              type="button"
              onClick={() => setPicking(true)}
              disabled={pending || options.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-900 transition-colors hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              <QrCode className="h-3 w-3" /> Choisir
            </button>
          )}
          {picking && (
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              Terminer
            </button>
          )}
        </div>
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {err}
        </div>
      )}

      {options.length === 0 && (
        <p className="rounded-md border border-slate-300 bg-white p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          Aucun matériel enregistré.{" "}
          <Link href="/dashboard/materiel" className="underline decoration-dotted underline-offset-2">
            Crée d&apos;abord tes éléments et leurs QR →
          </Link>
        </p>
      )}

      {picking && (
        <div className="mb-3 space-y-3 rounded-md border border-slate-300 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {EQUIPMENT_CATEGORY_LABEL[cat]}
              </p>
              <div className="grid gap-1 sm:grid-cols-2">
                {items.map((o) => {
                  const on = byId.has(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${on ? "border-[color:var(--color-grenat)] bg-[color:var(--color-grenat)]/5" : "border-slate-200 dark:border-slate-800"}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={pending}
                        onChange={(e) => toggle(o.id, e.target.checked)}
                        className="accent-[color:var(--color-grenat)]"
                      />
                      <span className="font-mono text-[10px] font-semibold text-[color:var(--color-grenat)]">{o.code}</span>
                      <span className="truncate text-slate-800 dark:text-slate-200">{o.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-900">
          {selected.map((o) => {
            const a = byId.get(o.id)!;
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs">
                <span className="w-24 shrink-0 font-mono text-[10px] font-semibold text-[color:var(--color-grenat)]">{o.code}</span>
                <span className="min-w-0 flex-1 truncate text-slate-900 dark:text-white">{o.name}</span>
                <ScanState
                  label="Départ"
                  at={a.depart_at}
                  by={a.depart_by}
                  locked={locked}
                  pending={pending}
                  onClear={() => clear(o.id, "depart")}
                  onMark={() => mark(o.id, "depart")}
                />
                <ScanState
                  label="Retour"
                  at={a.retour_at}
                  by={a.retour_by}
                  locked={locked}
                  pending={pending}
                  onClear={() => clear(o.id, "retour")}
                  onMark={() => mark(o.id, "retour")}
                />
              </li>
            );
          })}
        </ul>
      )}

      {selected.length > 0 && !scanUrl && !readOnly && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <ScanLine className="h-3.5 w-3.5" />
          Crée le briefing staff pour obtenir le lien de scan des manutentionnaires.
        </p>
      )}
    </section>
  );
}

function ScanState({
  label,
  at,
  by,
  locked,
  pending,
  onClear,
  onMark,
}: {
  label: string;
  at: string | null;
  by: string | null;
  locked: boolean;
  pending: boolean;
  onClear: () => void;
  onMark: () => void;
}) {
  if (at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
        <Check className="h-3 w-3" />
        {label} {fmtTime(at)}
        {by ? ` · ${by}` : ""}
        {!locked && (
          <button type="button" onClick={onClear} disabled={pending} title="Effacer ce scan" className="ml-0.5 opacity-60 hover:opacity-100">
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-500">
      {label} —
      {!locked && (
        <button type="button" onClick={onMark} disabled={pending} title="Marquer à la main" className="ml-0.5 underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:hover:text-white">
          marquer
        </button>
      )}
    </span>
  );
}
