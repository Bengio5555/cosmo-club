"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Link2, Loader2, Unlink } from "lucide-react";
import {
  createEventFolder,
  linkEventFolder,
  listEventFolders,
} from "@/app/dashboard/(shell)/documents/actions";

const secondary =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white";

/** No folder yet: create "Évènements/<date> – <titre>" or link an existing one. */
export function EventFolderSetup({
  eventId,
  suggestedName,
}: {
  eventId: string;
  suggestedName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[] | null>(null);
  const [choice, setChoice] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Erreur inconnue.");
      else router.refresh();
    });

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Aucun dossier Drive pour cet événement.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => createEventFolder(eventId))}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <FolderPlus className="h-3.5 w-3.5" aria-hidden />}
          Créer « {suggestedName} »
        </button>
        {folders === null && (
          <button
            type="button"
            disabled={pending}
            className={secondary}
            onClick={() =>
              startTransition(async () => {
                const res = await listEventFolders();
                if (!res.ok) setError(res.error);
                else setFolders(res.folders);
              })
            }
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            Rattacher un dossier existant
          </button>
        )}
      </div>
      {folders !== null && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            className="max-w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">
              {folders.length ? "Choisir un dossier d'Évènements…" : "Aucun dossier dans Évènements"}
            </option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!choice || pending}
            className={secondary}
            onClick={() => run(() => linkEventFolder(eventId, choice))}
          >
            Rattacher
          </button>
        </div>
      )}
      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/** Detach the folder from the event (the folder itself stays in Drive). */
export function EventFolderUnlink({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      title="Détacher ce dossier de l'événement (il reste dans Google Drive)"
      onClick={() => {
        if (!window.confirm("Détacher ce dossier ? Il reste dans Google Drive.")) return;
        startTransition(async () => {
          await linkEventFolder(eventId, null);
          router.refresh();
        });
      }}
      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:hover:text-slate-200"
    >
      <Unlink className="h-3 w-3" aria-hidden />
      Détacher
    </button>
  );
}
