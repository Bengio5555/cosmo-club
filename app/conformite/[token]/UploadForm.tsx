"use client";

import { useState, useTransition } from "react";
import { submitComplianceDocs } from "./actions";

export function UploadForm({
  token,
  siret,
  legalStatus,
  hasRc,
}: {
  token: string;
  siret: string | null;
  legalStatus: "micro" | "societe" | null;
  hasRc: boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [showRc, setShowRc] = useState(false);

  if (result?.ok) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-600/30 bg-emerald-50 p-5 text-[15px] text-emerald-900">
        {result.text} Vous pouvez fermer cette page.
      </div>
    );
  }

  const input = "mt-1 block w-full rounded-lg border border-[#d9c89f] bg-white px-3 py-2 text-[15px] focus:border-[#8b1a1a] focus:outline-none";
  return (
    <form
      className="mt-6 space-y-5"
      action={(f) =>
        start(async () => {
          const res = await submitComplianceDocs(token, f);
          setResult(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
        })
      }
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Attestation de vigilance</legend>
        <label className="block text-sm">
          Fichier PDF (ou photo)
          <input name="attestation" type="file" accept="application/pdf,image/jpeg,image/png" className={input} />
        </label>
        <label className="block text-sm">
          Date de délivrance <span className="text-[#6b5a48]">(en haut de l&apos;attestation)</span>
          <input name="issued_at" type="date" className={input} />
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Votre entreprise</legend>
        <label className="block text-sm">
          Statut
          <select name="legal_status" defaultValue={legalStatus ?? ""} className={input}>
            <option value="">Choisir…</option>
            <option value="micro">Micro-entrepreneur</option>
            <option value="societe">Société (SAS, SARL, EURL…)</option>
          </select>
        </label>
        <label className="block text-sm">
          SIRET <span className="text-[#6b5a48]">(14 chiffres)</span>
          <input name="siret" defaultValue={siret ?? ""} inputMode="numeric" autoComplete="off" className={`${input} font-mono`} />
        </label>
      </fieldset>

      {showRc ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Assurance responsabilité civile pro (facultatif)</legend>
          <label className="block text-sm">
            Attestation d&apos;assurance
            <input name="rc_pro" type="file" accept="application/pdf,image/jpeg,image/png" className={input} />
          </label>
          <label className="block text-sm">
            Valable jusqu&apos;au
            <input name="rc_valid_until" type="date" className={input} />
          </label>
        </fieldset>
      ) : (
        <button type="button" onClick={() => setShowRc(true)} className="text-sm text-[#8b1a1a] underline underline-offset-2">
          {hasRc ? "Mettre à jour mon assurance RC pro" : "Ajouter aussi mon assurance RC pro (facultatif)"}
        </button>
      )}

      {result && !result.ok && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{result.text}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#8b1a1a] px-6 py-3.5 text-[15px] font-semibold text-[#f4ecd6] transition hover:bg-[#741515] disabled:opacity-60"
      >
        {pending ? "Envoi en cours…" : "Envoyer mes documents"}
      </button>
    </form>
  );
}
