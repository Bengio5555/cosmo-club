"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refuseDevis } from "./actions";
import { AcceptanceModal } from "./AcceptanceModal";

export function AcceptanceActions({
  quoteId,
  number,
  defaultName,
}: {
  quoteId: string;
  number: string;
  defaultName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
        onClick={() => setOpen(true)}
        disabled={pending}
        className="sig-cta-button"
      >
        Accepter & signer
      </button>
      <button
        type="button"
        onClick={refuse}
        disabled={pending}
        className="sig-cta-button secondary"
      >
        {pending ? "…" : "Refuser le devis"}
      </button>
      {err && <p className="sig-cta-err">{err}</p>}

      {open && (
        <AcceptanceModal
          quoteId={quoteId}
          number={number}
          defaultName={defaultName}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
