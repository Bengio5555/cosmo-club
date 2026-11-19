"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { setAutoEmails } from "./actions";

export function AutoEmailsToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    start(async () => {
      const res = await setAutoEmails(next);
      if (res.ok) setOn(next);
      setMsg(res.ok ? res.message : res.error);
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Demandes et relances automatiques</p>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          Chaque lundi : un email de demande aux personnes concernées, une seule relance 10 jours plus tard sans dépôt, puis plus rien
          pendant 45 jours. Une nouvelle demande part automatiquement quand l&apos;attestation a plus de 3 mois.
        </p>
        {msg && <p className="mt-1 text-xs text-slate-500">{msg}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={pending}
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${on ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"} ${pending ? "opacity-60" : ""}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
        <span className="sr-only">{on ? "Désactiver" : "Activer"} les relances automatiques</span>
      </button>
    </div>
  );
}
