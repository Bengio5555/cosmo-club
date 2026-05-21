"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { saveNewEvent, type EventInput } from "./actions";
import { LocationField } from "@/components/dashboard/LocationField";

type ClientOption = {
  id: string;
  label: string;
};

export function NewEventButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [location, setLocation] = useState("");

  // Lazy-load clients when the modal opens. Keeps the initial list page
  // cheap and doesn't hit the DB until the owner actually wants to link
  // a client.
  useEffect(() => {
    if (!open || clients.length > 0) return;
    fetch("/api/dashboard/clients")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: { clients: ClientOption[] }) => setClients(d.clients))
      .catch(() => {
        // non-fatal — the field just stays "(aucun client lié)"
      });
  }, [open, clients.length]);

  function submit(form: FormData) {
    setErr(null);
    const input: EventInput = {
      title: String(form.get("title") || ""),
      date: String(form.get("date") || ""),
      start_time: String(form.get("start_time") || "") || null,
      end_time: String(form.get("end_time") || "") || null,
      duration_hours: null,
      location: String(form.get("location") || ""),
      guests_count: form.get("guests_count")
        ? Number(form.get("guests_count"))
        : null,
      briefing: String(form.get("briefing") || ""),
      client_id: (form.get("client_id") as string) || null,
      quote_id: null,
    };
    startTransition(async () => {
      const res = await saveNewEvent(input);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setOpen(false);
      router.push(`/dashboard/events/${res.id}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setLocation("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)]"
      >
        <Plus className="h-3.5 w-3.5" /> Nouvel événement
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  Nouvel événement
                </p>
                <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
                  Création rapide
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 dark:text-neutral-500 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-900 dark:hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {err && (
              <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {err}
              </div>
            )}

            <form action={submit} className="space-y-3">
              <Field label="Titre de l'événement">
                <input
                  name="title"
                  required
                  autoFocus
                  placeholder="Mariage Dubois · Château de Vaux"
                  className={inputCls}
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Date">
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Début">
                  <input type="time" name="start_time" className={inputCls} />
                </Field>
                <Field label="Fin">
                  <input type="time" name="end_time" className={inputCls} />
                </Field>
              </div>

              <Field label="Lieu">
                <LocationField
                  name="location"
                  value={location}
                  onChange={setLocation}
                  placeholder="Adresse ou nom du site"
                  inputClassName={inputCls}
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Invités">
                  <input
                    type="number"
                    name="guests_count"
                    min="0"
                    step="1"
                    className={inputCls}
                  />
                </Field>
                <Field label="Client (optionnel)">
                  <select name="client_id" defaultValue="" className={inputCls}>
                    <option value="">— Aucun</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Briefing (optionnel)">
                <textarea
                  name="briefing"
                  rows={3}
                  placeholder="Setup spécial, carte cocktails prévue, contraintes lieu…"
                  className={inputCls}
                />
              </Field>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-neutral-900 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-2 text-xs text-slate-600 dark:text-neutral-300 hover:border-slate-300 dark:hover:border-neutral-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-60"
                >
                  {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Créer l&apos;événement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
