"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Copy, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { rotateCalendarToken, clearCalendarToken } from "./actions";

/**
 * "Synchronisation Agenda" card on the Settings page. Generates an
 * opaque token, exposes the public ICS URL, and lets the owner rotate
 * or revoke it. The whole feed is read-only — Google polls our
 * endpoint at its own cadence (8-24h typically). The "Refresh"
 * instructions point the owner at Google's manual-refresh button for
 * cases where they need an immediate update.
 */
export function CalendarSection({ initialToken }: { initialToken: string | null }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(initialToken);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/calendar/${token}`
      : token
        ? `/calendar/${token}`
        : null;

  function generate() {
    startTransition(async () => {
      setMsg(null);
      const res = await rotateCalendarToken();
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setToken(res.token);
      setMsg({ kind: "ok", text: "Lien généré." });
      router.refresh();
    });
  }

  function rotate() {
    if (
      !window.confirm(
        "Régénérer un nouveau lien ? L'ancien sera invalidé immédiatement.",
      )
    )
      return;
    generate();
  }

  function clear() {
    if (
      !window.confirm(
        "Désactiver le partage agenda ? Le lien actuel cessera de fonctionner.",
      )
    )
      return;
    startTransition(async () => {
      setMsg(null);
      const res = await clearCalendarToken();
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setToken(null);
      setMsg({ kind: "ok", text: "Partage désactivé." });
      router.refresh();
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg({
        kind: "err",
        text: "Impossible de copier — sélectionne le lien manuellement.",
      });
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-300">
          <Calendar className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Synchronisation Google Agenda
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Expose tes événements en flux iCalendar pour les afficher dans
            Google Agenda, Apple Calendar ou Outlook. Lecture seule — tes
            modifications dans Cosmo se propagent automatiquement.
          </p>
        </div>
      </div>

      {token && url ? (
        <>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Lien d&apos;abonnement
            </span>
            <div className="flex flex-wrap gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-200 focus:border-[color:var(--color-grenat)] focus:outline-none"
              />
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
              >
                <Copy className="h-3 w-3" /> {copied ? "Copié ✓" : "Copier"}
              </button>
            </div>
          </label>

          <details className="mt-4 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/50 px-3 py-2 text-xs">
            <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
              Comment ajouter à Google Agenda&nbsp;?
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-slate-500 dark:text-slate-400">
              <li>
                Ouvre{" "}
                <a
                  href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                >
                  Google Agenda → Ajouter par URL
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Colle le lien ci-dessus dans le champ URL</li>
              <li>Clique sur « Ajouter un agenda »</li>
              <li>
                Tu peux renommer l&apos;agenda et changer la couleur depuis
                la barre latérale
              </li>
            </ol>
            <p className="mt-2 text-slate-500 dark:text-slate-500">
              Google rafraîchit automatiquement toutes les 8 à 24h. Pour
              forcer&nbsp;: clic droit sur l&apos;agenda dans la barre
              latérale → « Actualiser ».
            </p>
          </details>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-900 pt-4">
            <button
              type="button"
              onClick={rotate}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" /> Régénérer le lien
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" /> Désactiver
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-4 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-60"
        >
          <Calendar className="h-3 w-3" /> Générer le lien d&apos;abonnement
        </button>
      )}

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
    </section>
  );
}
