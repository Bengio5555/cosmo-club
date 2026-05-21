"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, FilePlus2, Loader2, Trash2 } from "lucide-react";
import { createQuoteForClient, deleteClient, setClientArchived } from "../actions";

export function ClientActions({
  clientId,
  hasRefs,
  archived,
}: {
  clientId: string;
  hasRefs: boolean;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function newQuote() {
    startTransition(async () => {
      const res = await createQuoteForClient(clientId);
      // Success path redirects — if we get here, it failed.
      if (res && !res.ok) setErr(res.error);
    });
  }

  function removeClient() {
    if (
      !window.confirm(
        "Supprimer définitivement ce client ? Irréversible.",
      )
    )
      return;
    startTransition(async () => {
      setErr(null);
      const res = await deleteClient(clientId);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.replace("/dashboard/clients");
    });
  }

  function toggleArchive() {
    startTransition(async () => {
      setErr(null);
      const res = await setClientArchived(clientId, !archived);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 md:items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={newQuote}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <FilePlus2 className="h-3 w-3" />
          )}
          Nouveau devis
        </button>
        <button
          type="button"
          onClick={toggleArchive}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-60"
          title={archived ? "Désarchiver" : "Archiver (masquer du listing)"}
        >
          {archived ? (
            <>
              <ArchiveRestore className="h-3 w-3" /> Désarchiver
            </>
          ) : (
            <>
              <Archive className="h-3 w-3" /> Archiver
            </>
          )}
        </button>
        {!hasRefs && (
          <button
            type="button"
            onClick={removeClient}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-300 transition-colors hover:bg-red-100 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-3 w-3" /> Supprimer
          </button>
        )}
      </div>
      {err && (
        <div className="rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-[11px] text-red-800 dark:text-red-200">
          {err}
        </div>
      )}
    </div>
  );
}
