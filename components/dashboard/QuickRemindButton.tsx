"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Loader2 } from "lucide-react";
import { sendInvoiceReminder } from "@/app/dashboard/(shell)/factures/[id]/actions";

/**
 * Fire-and-forget reminder button for inline use in lists (dashboard home,
 * factures list). Shows a brief inline flash on success/failure rather
 * than opening the full editor. Disables during pending to prevent
 * double-click spam.
 */
export function QuickRemindButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<"ok" | "err" | null>(null);

  function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    if (!window.confirm("Envoyer une relance par email ?")) return;
    startTransition(async () => {
      const res = await sendInvoiceReminder(invoiceId);
      if (!res.ok) {
        setFlash("err");
      } else {
        setFlash("ok");
        router.refresh();
      }
      setTimeout(() => setFlash(null), 2500);
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      title="Envoyer une relance"
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${
        flash === "ok"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : flash === "err"
          ? "border-red-500/40 bg-red-500/10 text-red-200"
          : "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
      }`}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <BellRing className="h-3 w-3" />
      )}
      {flash === "ok" ? "Envoyé" : flash === "err" ? "Erreur" : "Relancer"}
    </button>
  );
}
