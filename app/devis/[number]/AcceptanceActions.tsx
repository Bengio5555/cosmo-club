"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refuseDevis } from "./actions";
import { AcceptanceModal } from "./AcceptanceModal";
import { type QuoteLocale } from "@/lib/i18n/quote-plaquette";

export function AcceptanceActions({
  quoteId,
  number,
  defaultName,
  locale = "fr",
}: {
  quoteId: string;
  number: string;
  defaultName?: string;
  locale?: QuoteLocale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const isEn = locale === "en";

  function refuse() {
    const prompt = isEn
      ? `Decline quote ${number}? We remain available to adjust the proposal.`
      : `Refuser le devis ${number} ? Nous restons à votre disposition pour ajuster.`;
    if (!window.confirm(prompt)) return;
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
        {isEn ? "Accept & sign" : "Accepter & signer"}
      </button>
      <button
        type="button"
        onClick={refuse}
        disabled={pending}
        className="sig-cta-button secondary"
      >
        {pending ? "…" : isEn ? "Decline" : "Refuser le devis"}
      </button>
      {err && <p className="sig-cta-err">{err}</p>}

      {open && (
        <AcceptanceModal
          quoteId={quoteId}
          number={number}
          defaultName={defaultName}
          locale={locale}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
