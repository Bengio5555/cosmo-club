"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptDevis, refuseDevis } from "./actions";

export function AcceptanceActions({
  quoteId,
  number,
}: {
  quoteId: string;
  number: string;
}) {
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
    if (
      !window.confirm(
        `Refuser le devis ${number} ? Nous restons à votre disposition pour ajuster.`,
      )
    )
      return;
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
    <div className="sig-cta-buttons">
      <button
        type="button"
        onClick={accept}
        disabled={pending}
        className="sig-cta-button"
      >
        {pending ? "…" : "Accepter & signer"}
      </button>
      <button
        type="button"
        onClick={refuse}
        disabled={pending}
        className="sig-cta-button secondary"
      >
        Refuser le devis
      </button>
      {err && <p className="sig-cta-err">{err}</p>}
    </div>
  );
}
