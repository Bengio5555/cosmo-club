"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptDevis, refuseDevis } from "./actions";

export function AcceptanceActions({ quoteId, number }: { quoteId: string; number: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function accept() {
    if (!window.confirm(`Confirmer l'acceptation du devis ${number} ?`)) return;
    startTransition(async () => {
      setErr(null);
      const res = await acceptDevis(quoteId);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.refresh();
    });
  }

  function refuse() {
    if (!window.confirm(`Refuser le devis ${number} ?`)) return;
    startTransition(async () => {
      setErr(null);
      const res = await refuseDevis(quoteId);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="plaquette__cta-actions">
      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="plaquette__btn plaquette__btn--primary"
      >
        {pending ? "…" : "✓ Accepter le devis"}
      </button>
      <button
        type="button"
        onClick={refuse}
        disabled={pending}
        className="plaquette__btn plaquette__btn--ghost"
      >
        Refuser
      </button>
      {err && <p className="plaquette__err">{err}</p>}
    </div>
  );
}
