"use client";

import { useState } from "react";
import { AcceptanceModal } from "./AcceptanceModal";
import { RefusalModal } from "./RefusalModal";
import { type QuoteLocale } from "@/lib/i18n/quote-plaquette";

export function AcceptanceActions({
  quoteId,
  number,
  defaultName,
  locale = "fr",
  accessToken = null,
}: {
  quoteId: string;
  number: string;
  defaultName?: string;
  locale?: QuoteLocale;
  accessToken?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [refusing, setRefusing] = useState(false);

  const isEn = locale === "en";

  return (
    <div className="sig-cta-buttons">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sig-cta-button"
      >
        {isEn ? "Accept & sign" : "Accepter & signer"}
      </button>
      <button
        type="button"
        onClick={() => setRefusing(true)}
        className="sig-cta-button secondary"
      >
        {isEn ? "Decline" : "Refuser le devis"}
      </button>

      {refusing && (
        <RefusalModal
          quoteId={quoteId}
          number={number}
          locale={locale}
          accessToken={accessToken}
          onClose={() => setRefusing(false)}
        />
      )}

      {open && (
        <AcceptanceModal
          quoteId={quoteId}
          number={number}
          defaultName={defaultName}
          locale={locale}
          accessToken={accessToken}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
