"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Save,
  Play,
  Flag,
  Ban,
  Trash2,
  CalendarDays,
  X,
  Package,
} from "lucide-react";
import type { Tables } from "@/types/database";
import { formatDateFR } from "@/lib/format";
import { LocationField } from "@/components/dashboard/LocationField";
import {
  saveEvent,
  setEventStatus,
  closeEvent,
  deleteEvent,
  type EventInput,
} from "../actions";

type Event = Tables<"events">;

export type CloseReservation = {
  product_id: string;
  product_name: string;
  unit: string;
  qty_reserved: number;
};

export function EventEditor({
  event,
  closeReservations = [],
}: {
  event: Event;
  closeReservations?: CloseReservation[];
}) {
  const router = useRouter();
  const readOnly = event.status === "termine" || event.status === "annule";
  const [closeOpen, setCloseOpen] = useState(false);

  const [title, setTitle] = useState(event.title ?? "");
  const [date, setDate] = useState<string>(
    event.date ? event.date.slice(0, 10) : "",
  );
  const [start_time, setStart] = useState(event.start_time?.slice(0, 5) ?? "");
  const [end_time, setEnd] = useState(event.end_time?.slice(0, 5) ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [guests_count, setGuests] = useState<string>(
    event.guests_count != null ? String(event.guests_count) : "",
  );
  const [briefing, setBriefing] = useState(event.briefing ?? "");

  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const [baseline, setBaseline] = useState("");
  useEffect(() => {
    setBaseline(serialize());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function serialize(): string {
    return JSON.stringify({
      title: title.trim(),
      date,
      start_time: start_time || null,
      end_time: end_time || null,
      location: location.trim() || null,
      guests_count: guests_count === "" ? null : Number(guests_count),
      briefing: briefing.trim() || null,
    });
  }
  const dirty = baseline !== "" && serialize() !== baseline;

  function save() {
    if (!title.trim() || !date) {
      setMsg({ kind: "err", text: "Titre et date requis." });
      return;
    }
    const patch: Partial<EventInput> = {
      title,
      date,
      start_time,
      end_time,
      location,
      guests_count: guests_count === "" ? null : Number(guests_count),
      briefing,
    };
    startTransition(async () => {
      setMsg(null);
      const res = await saveEvent(event.id, patch);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setBaseline(serialize());
      setMsg({ kind: "ok", text: "Événement enregistré." });
      setTimeout(() => setMsg(null), 2500);
      router.refresh();
    });
  }

  function startEvent() {
    startTransition(async () => {
      const res = await setEventStatus(event.id, "en_cours");
      if (!res.ok) setMsg({ kind: "err", text: res.error });
      else router.refresh();
    });
  }

  function cancelEvent() {
    if (!window.confirm("Annuler cet événement ?")) return;
    startTransition(async () => {
      const res = await setEventStatus(event.id, "annule");
      if (!res.ok) setMsg({ kind: "err", text: res.error });
      else router.refresh();
    });
  }

  function confirmClose(
    returns: Array<{ product_id: string; qty_returned: number }>,
  ) {
    startTransition(async () => {
      const res = await closeEvent(event.id, returns);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setCloseOpen(false);
      setMsg({ kind: "ok", text: "Événement clôturé. Stocks mis à jour." });
      setTimeout(() => setMsg(null), 3000);
      router.refresh();
    });
  }

  function doDelete() {
    if (!window.confirm("Supprimer définitivement cet événement ?")) return;
    startTransition(async () => {
      const res = await deleteEvent(event.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.replace("/dashboard/events");
    });
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-900 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Événement · {statusLabel(event.status)}
          </p>
          <h1 className="font-display text-2xl text-slate-900 dark:text-white md:text-3xl">
            {event.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDateFR(event.date)}
              {event.start_time && ` · ${event.start_time.slice(0, 5)}`}
              {event.end_time && `–${event.end_time.slice(0, 5)}`}
            </span>
            <StatusPill status={event.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 transition-colors hover:border-slate-300 dark:hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : dirty ? (
                <Save className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {dirty ? "Enregistrer" : "Enregistré"}
            </button>
          )}

          {event.status === "a_venir" && (
            <>
              <button
                type="button"
                onClick={startEvent}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
              >
                <Play className="h-3 w-3" /> Démarrer
              </button>
              <button
                type="button"
                onClick={cancelEvent}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                <Ban className="h-3 w-3" /> Annuler
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3 w-3" /> Supprimer
              </button>
            </>
          )}

          {event.status === "en_cours" && (
            <>
              <button
                type="button"
                onClick={() => setCloseOpen(true)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
              >
                <Flag className="h-3 w-3" /> Clôturer
              </button>
              <button
                type="button"
                onClick={cancelEvent}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
              >
                <Ban className="h-3 w-3" /> Annuler
              </button>
            </>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {readOnly && (
        <div className="mt-3 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
          {event.status === "termine"
            ? "Événement clôturé. Les informations sont figées — consulte pour archive."
            : "Événement annulé."}
        </div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <LabeledInput
            label="Titre"
            value={title}
            onChange={setTitle}
            readOnly={readOnly}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <LabeledInput
              label="Date"
              type="date"
              value={date}
              onChange={setDate}
              readOnly={readOnly}
            />
            <LabeledInput
              label="Début"
              type="time"
              value={start_time}
              onChange={setStart}
              readOnly={readOnly}
            />
            <LabeledInput
              label="Fin"
              type="time"
              value={end_time}
              onChange={setEnd}
              readOnly={readOnly}
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Lieu
            </span>
            <LocationField
              value={location}
              onChange={setLocation}
              readOnly={readOnly}
              placeholder="Adresse ou nom du site"
              inputClassName="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
            />
          </label>
          <LabeledInput
            label="Invités"
            type="number"
            value={guests_count}
            onChange={setGuests}
            readOnly={readOnly}
          />
        </div>

        <div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Briefing & notes internes
            </span>
            <textarea
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              rows={10}
              readOnly={readOnly}
              placeholder="Setup bar, carte cocktails, contraintes lieu, contact staff sur place, coupure courant vers 00h…"
              className="w-full resize-y rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
            />
          </label>
        </div>
      </div>

      {closeOpen && (
        <CloseEventDialog
          reservations={closeReservations}
          pending={pending}
          onCancel={() => setCloseOpen(false)}
          onConfirm={confirmClose}
        />
      )}
    </div>
  );
}

function CloseEventDialog({
  reservations,
  pending,
  onCancel,
  onConfirm,
}: {
  reservations: CloseReservation[];
  pending: boolean;
  onCancel: () => void;
  onConfirm: (
    returns: Array<{ product_id: string; qty_returned: number }>,
  ) => void;
}) {
  const [returns, setReturns] = useState<Record<string, string>>(
    () => Object.fromEntries(reservations.map((r) => [r.product_id, ""])),
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  function setReturn(productId: string, raw: string) {
    setReturns((prev) => ({ ...prev, [productId]: raw }));
  }

  const totals = reservations.reduce(
    (acc, r) => {
      const ret = Math.min(
        Math.max(0, Number(returns[r.product_id] || 0)),
        r.qty_reserved,
      );
      acc.reserved += r.qty_reserved;
      acc.returned += ret;
      acc.consumed += Math.max(0, r.qty_reserved - ret);
      return acc;
    },
    { reserved: 0, returned: 0, consumed: 0 },
  );

  function submit() {
    const payload = reservations.map((r) => ({
      product_id: r.product_id,
      qty_returned: Math.min(
        Math.max(0, Number(returns[r.product_id] || 0)),
        r.qty_reserved,
      ),
    }));
    onConfirm(payload);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Clôturer l'événement"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => !pending && onCancel()}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-900 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Clôture événement
            </p>
            <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
              Quantités retournées
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Renseigne les quantités revenues du terrain. La consommation
              réelle (= sortie − retour) est déduite du stock.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Fermer"
            className="rounded-md p-1 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {reservations.length === 0 ? (
            <div className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/40 px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">
              Aucun produit réservé pour cet événement. La clôture
              n&apos;écrira aucun mouvement de stock.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  <th className="pb-2 font-medium">Produit</th>
                  <th className="pb-2 text-right font-medium">Sortie</th>
                  <th className="pb-2 text-right font-medium">Retour</th>
                  <th className="pb-2 text-right font-medium">Consommé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {reservations.map((r) => {
                  const raw = returns[r.product_id] ?? "";
                  const ret = Math.min(
                    Math.max(0, Number(raw || 0)),
                    r.qty_reserved,
                  );
                  const consumed = Math.max(0, r.qty_reserved - ret);
                  return (
                    <tr key={r.product_id}>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-200">
                        {r.product_name}
                      </td>
                      <td className="py-2 pr-2 text-right text-slate-500 dark:text-slate-400">
                        {r.qty_reserved} {r.unit}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={r.qty_reserved}
                          step={1}
                          value={raw}
                          onChange={(e) =>
                            setReturn(r.product_id, e.target.value)
                          }
                          placeholder="0"
                          disabled={pending}
                          className="w-20 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1 text-right text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
                        />
                      </td>
                      <td className="py-2 text-right text-slate-700 dark:text-slate-200">
                        {consumed} {r.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {reservations.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 dark:border-slate-900 px-5 py-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              {totals.reserved} sortis
            </span>
            <span>· {totals.returned} retournés</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              · {totals.consumed} consommés
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-900 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            <Flag className="h-3 w-3" /> Clôturer définitivement
          </button>
        </div>
      </div>
    </div>
  );
}

function statusLabel(s: Event["status"]): string {
  return { a_venir: "À venir", en_cours: "En cours", termine: "Terminé", annule: "Annulé" }[s];
}

function StatusPill({ status }: { status: Event["status"] }) {
  const map: Record<Event["status"], { cls: string; label: string }> = {
    a_venir: {
      cls: "border-sky-500/40 bg-sky-500/10 text-sky-200",
      label: "À venir",
    },
    en_cours: {
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-200",
      label: "En cours",
    },
    termine: {
      cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
      label: "Terminé",
    },
    annule: {
      cls: "border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
      label: "Annulé",
    },
  };
  const p = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${p.cls}`}
    >
      {p.label}
    </span>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />
    </label>
  );
}
