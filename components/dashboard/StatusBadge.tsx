import type { Database } from "@/types/database";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type QuoteStatus = Database["public"]["Enums"]["quote_status"];
type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
type EventStatus = Database["public"]["Enums"]["event_status"];

type AnyStatus = LeadStatus | QuoteStatus | InvoiceStatus | EventStatus | string;

/**
 * Status pill réutilisable. Chaque statut a 2 palettes : une light
 * (fond pastel + texte saturé) et une dark (fond translucide + texte
 * pâle). Le `dark:` prefix s'active via la classe `.dark` posée par
 * le ThemeProvider sur un ancêtre.
 */
const palette: Record<string, { cls: string; label: string }> = {
  // leads
  nouveau: {
    cls: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200",
    label: "Nouveau",
  },
  contacte: {
    cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
    label: "Contacté",
  },
  devis_envoye: {
    cls: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200",
    label: "Devis envoyé",
  },
  gagne: {
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
    label: "Gagné",
  },
  perdu: {
    cls: "border-slate-300 bg-slate-100 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
    label: "Perdu",
  },
  // quotes / invoices
  brouillon: {
    cls: "border-slate-300 bg-slate-100 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    label: "Brouillon",
  },
  envoye: {
    cls: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200",
    label: "Envoyé",
  },
  accepte: {
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
    label: "Accepté",
  },
  refuse: {
    cls: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200",
    label: "Refusé",
  },
  expire: {
    cls: "border-slate-300 bg-slate-100 text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
    label: "Expiré",
  },
  paye: {
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
    label: "Payé",
  },
  en_retard: {
    cls: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-500/15 dark:text-red-300",
    label: "En retard",
  },
  annule: {
    cls: "border-slate-300 bg-slate-100 text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
    label: "Annulé",
  },
  // events
  a_venir: {
    cls: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200",
    label: "À venir",
  },
  en_cours: {
    cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
    label: "En cours",
  },
  termine: {
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
    label: "Terminé",
  },
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const p =
    palette[status] || {
      cls: "border-slate-300 bg-slate-100 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
      label: status,
    };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${p.cls}`}
    >
      {p.label}
    </span>
  );
}
