"use client";

import { useState } from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";

/**
 * "Exporter PDF (ZIP)" with real progress feedback: generating dozens of
 * PDFs server-side takes long enough that a bare <a> feels broken. The
 * click fetches the ZIP as a blob behind a modal overlay (spinner +
 * explanation), then triggers the download; errors surface in the same
 * overlay instead of a silent failure.
 */
export function ExportPdfButton({ href }: { href: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        let msg = "Échec de l'export — réessaie.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          /* non-JSON error body — keep the generic message */
        }
        setError(msg);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? "factures.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Échec de l'export — vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        title="Télécharge un ZIP contenant le PDF de chaque facture émise sur la période filtrée (Du / Au / Type)"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Exporter PDF (ZIP)
      </button>

      {(loading || error) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Export des factures en PDF"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            {loading ? (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
                  <FileArchive className="h-5 w-5 animate-pulse text-slate-500 dark:text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Génération des PDF en cours…
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Chaque facture de la période est convertie en PDF puis
                  compressée en ZIP. Cela peut prendre jusqu&apos;à une minute
                  selon le nombre de factures — ne ferme pas cette page.
                </p>
                <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Export impossible
                </p>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="mt-4 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
                >
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
