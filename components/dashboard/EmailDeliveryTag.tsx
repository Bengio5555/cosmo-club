import { Mail } from "lucide-react";
import {
  deliveryState,
  deliveryTooltip,
  type DeliveryTone,
  type QuoteEmail,
} from "@/lib/quoteEmail";

const toneCls: Record<DeliveryTone, string> = {
  neutral:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
  warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  problem:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300",
};

/**
 * Pastille « e-mail du devis » : Parti / Remis / Ouvert / Retardé /
 * Non remis / Signalé spam / Échec d'envoi. Le détail (destinataire,
 * dates, motif) s'affiche au survol.
 */
export function EmailDeliveryTag({ email }: { email: QuoteEmail }) {
  const s = deliveryState(email);
  const tooltip = deliveryTooltip(email);
  return (
    <span
      title={tooltip}
      className={`inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneCls[s.tone]}`}
    >
      <Mail className="h-2.5 w-2.5" aria-hidden />
      <span className="sr-only">E-mail : </span>
      {s.label}
    </span>
  );
}
