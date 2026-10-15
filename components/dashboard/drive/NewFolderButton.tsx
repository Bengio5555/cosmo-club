"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Loader2 } from "lucide-react";
import { createDriveFolder } from "@/app/dashboard/(shell)/documents/actions";

export function NewFolderButton({ parentId }: { parentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const secondary =
    "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white";

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={secondary}>
        <FolderPlus className="h-3.5 w-3.5" aria-hidden />
        Nouveau dossier
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await createDriveFolder(parentId, name);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setOpen(false);
          setName("");
          router.refresh();
        });
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom du dossier"
        maxLength={120}
        required
        className="w-44 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      />
      <button type="submit" disabled={pending} className={secondary}>
        {pending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
        Créer
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      >
        Annuler
      </button>
      {error && <p className="w-full text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
