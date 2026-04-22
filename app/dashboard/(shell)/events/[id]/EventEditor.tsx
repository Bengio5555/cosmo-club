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
} from "lucide-react";
import type { Tables } from "@/types/database";
import { formatDateFR } from "@/lib/format";
import {
  saveEvent,
  setEventStatus,
  closeEvent,
  deleteEvent,
  type EventInput,
} from "../actions";

type Event = Tables<"events">;

export function EventEditor({ event }: { event: Event }) {
  const router = useRouter();
  const readOnly = event.status === "termine" || event.status === "annule";

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

  function close() {
    if (
      !window.confirm(
        "Clôturer l'événement ? Les stocks réservés seront déduits des produits (mouvements OUT automatiques).",
      )
    )
      return;
    startTransition(async () => {
      const res = await closeEvent(event.id);
      if (!res.ok) setMsg({ kind: "err", text: res.error });
      else {
        setMsg({ kind: "ok", text: "Événement clôturé. Stocks mis à jour." });
        setTimeout(() => setMsg(null), 3000);
        router.refresh();
      }
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
      <div className="flex flex-col gap-3 border-b border-neutral-900 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">
            Événement · {statusLabel(event.status)}
          </p>
          <h1 className="font-display text-2xl text-white md:text-3xl">
            {event.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
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
              className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-100 transition-colors hover:border-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-60"
              >
                <Play className="h-3 w-3" /> Démarrer
              </button>
              <button
                type="button"
                onClick={cancelEvent}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 transition-colors hover:border-neutral-700"
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
                onClick={close}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
              >
                <Flag className="h-3 w-3" /> Clôturer
              </button>
              <button
                type="button"
                onClick={cancelEvent}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:border-neutral-700"
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
        <div className="mt-3 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-400">
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
          <LabeledInput
            label="Lieu"
            value={location}
            onChange={setLocation}
            readOnly={readOnly}
            placeholder="Adresse ou nom du site"
          />
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
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Briefing & notes internes
            </span>
            <textarea
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              rows={10}
              readOnly={readOnly}
              placeholder="Setup bar, carte cocktails, contraintes lieu, contact staff sur place, coupure courant vers 00h…"
              className="w-full resize-y rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
            />
          </label>
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
      cls: "border-neutral-700 bg-neutral-800 text-neutral-400",
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
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />
    </label>
  );
}
