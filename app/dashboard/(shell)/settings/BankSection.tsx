"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Lock, ShieldCheck, X } from "lucide-react";
import { formatIban, isValidIban, maskIban } from "@/lib/iban";
import { formatDateFR } from "@/lib/format";
import { confirmBankChange, requestBankChange } from "./bankActions";

export type BankLogItem = {
  id: number;
  changedAt: string;
  by: string | null;
  viaDashboard: boolean;
  oldIban: string | null;
  newIban: string | null;
};

/**
 * IBAN des factures. Lecture seule : le changement passe par une fenêtre
 * en deux étapes (nouvel IBAN, puis code reçu par e-mail), réservée au
 * propriétaire. La base refuse toute autre écriture.
 */
export function BankSection({
  isOwner,
  iban,
  bic,
  updatedAt,
  history,
}: {
  isOwner: boolean;
  iban: string | null;
  bic: string | null;
  updatedAt: string | null;
  history: BankLogItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Banque (affichage facture)</h2>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Landmark className="h-3.5 w-3.5" /> IBAN
            </p>
            <p className="mt-1 font-mono text-sm text-slate-900 dark:text-white">
              {iban ? (isOwner ? formatIban(iban) : maskIban(iban)) : "Non renseigné"}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-500">BIC {bic || "—"}</p>
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Lock className="h-3.5 w-3.5" />
              Modifier l&apos;IBAN
            </button>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5" /> Modifiable par le propriétaire uniquement
            </p>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          Protégé : changement par le propriétaire avec un code reçu par e-mail, alerte envoyée à chaque modification.
          {updatedAt && <> Dernière modification le {formatDateFR(updatedAt, { withTime: true })}.</>}
        </p>
        {isOwner && history.length > 0 && (
          <details className="border-t border-slate-100 pt-3 dark:border-slate-900">
            <summary className="cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400">
              Historique des changements ({history.length})
            </summary>
            <ul className="mt-2 space-y-1.5 text-xs">
              {history.map((h) => (
                <li key={h.id} className="flex flex-col gap-0.5 md:flex-row md:justify-between md:gap-4">
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {h.oldIban ?? "—"} → {h.newIban ?? "—"}
                  </span>
                  <span className={h.viaDashboard ? "text-slate-500" : "text-amber-700 dark:text-amber-400"}>
                    {formatDateFR(h.changedAt, { withTime: true })} ·{" "}
                    {h.viaDashboard ? (h.by ?? "propriétaire") : "hors dashboard"}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {open && <BankChangeDialog currentIban={iban} onClose={() => setOpen(false)} />}
    </section>
  );
}

function BankChangeDialog({ currentIban, onClose }: { currentIban: string | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"form" | "code" | "done">("form");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [code, setCode] = useState("");
  const [request, setRequest] = useState<{ id: string; sentTo: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  function askCode() {
    startTransition(async () => {
      setErr(null);
      const res = await requestBankChange({ iban, bic });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setRequest({ id: res.requestId, sentTo: res.sentTo });
      setCode("");
      setStep("code");
    });
  }

  function confirm() {
    if (!request) return;
    startTransition(async () => {
      setErr(null);
      const res = await confirmBankChange({ requestId: request.id, code });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setStep("done");
      router.refresh();
    });
  }

  const ibanOk = isValidIban(iban);
  const input =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white";
  const primary =
    "inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bank-dialog-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 md:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && !pending && onClose()}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="bank-dialog-title" className="text-base font-semibold text-slate-900 dark:text-white">
            {step === "done" ? "IBAN modifié" : "Modifier l'IBAN des factures"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Fermer"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "form" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askCode();
            }}
            className="space-y-3"
          >
            <p className="text-xs text-slate-600 dark:text-slate-400">
              IBAN actuel : <span className="font-mono">{maskIban(currentIban)}</span>. Un code de confirmation sera
              envoyé sur ton adresse e-mail de connexion.
            </p>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Nouvel IBAN</span>
              <input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="FR76 …"
                autoComplete="off"
                spellCheck={false}
                className={input}
              />
            </label>
            {iban.replace(/\s/g, "").length >= 15 && !ibanOk && (
              <p className="text-xs text-red-700 dark:text-red-400">Cet IBAN ne passe pas le contrôle : vérifie chaque caractère.</p>
            )}
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">BIC</span>
              <input
                value={bic}
                onChange={(e) => setBic(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className={input}
              />
            </label>
            {err && <p className="text-xs text-red-700 dark:text-red-400">{err}</p>}
            <button type="submit" disabled={pending || !ibanOk} className={`${primary} w-full`}>
              {pending ? "Envoi du code…" : "Recevoir le code par e-mail"}
            </button>
          </form>
        )}

        {step === "code" && request && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
            className="space-y-3"
          >
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Code envoyé à <span className="font-medium">{request.sentTo}</span>. Il expire dans 10 minutes.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Nouvel IBAN : <span className="font-mono">{formatIban(iban)}</span>
            </p>
            <input
              ref={codeRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label="Code à 6 chiffres"
              className={`${input} text-center text-2xl tracking-[0.5em]`}
            />
            {err && <p className="text-xs text-red-700 dark:text-red-400">{err}</p>}
            <button type="submit" disabled={pending || code.length !== 6} className={`${primary} w-full`}>
              {pending ? "Vérification…" : "Confirmer le changement"}
            </button>
            <button
              type="button"
              onClick={askCode}
              disabled={pending}
              className="w-full text-center text-xs text-slate-500 underline-offset-2 hover:underline"
            >
              Renvoyer un code
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Les prochaines factures envoyées porteront le nouvel IBAN. Une alerte est partie par e-mail.
            </p>
            <button type="button" onClick={onClose} className={`${primary} w-full`}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
