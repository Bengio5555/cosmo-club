import type { Database } from "@/types/database";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type QuoteStatus = Database["public"]["Enums"]["quote_status"];
type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
type EventStatus = Database["public"]["Enums"]["event_status"];

type AnyStatus = LeadStatus | QuoteStatus | InvoiceStatus | EventStatus | string;

const palette: Record<string, { cls: string; label: string }> = {
  // leads
  nouveau:        { cls: "border-sky-500/40 bg-sky-500/10 text-sky-200",         label: "Nouveau" },
  contacte:       { cls: "border-amber-500/40 bg-amber-500/10 text-amber-200",   label: "Contacté" },
  devis_envoye:   { cls: "border-violet-500/40 bg-violet-500/10 text-violet-200", label: "Devis envoyé" },
  gagne:          { cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200", label: "Gagné" },
  perdu:          { cls: "border-neutral-700 bg-neutral-800 text-neutral-400",   label: "Perdu" },
  // quotes / invoices
  brouillon:      { cls: "border-neutral-700 bg-neutral-800 text-neutral-300",   label: "Brouillon" },
  envoye:         { cls: "border-violet-500/40 bg-violet-500/10 text-violet-200", label: "Envoyé" },
  accepte:        { cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200", label: "Accepté" },
  refuse:         { cls: "border-rose-500/40 bg-rose-500/10 text-rose-200",      label: "Refusé" },
  expire:         { cls: "border-neutral-700 bg-neutral-800 text-neutral-400",   label: "Expiré" },
  paye:           { cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200", label: "Payé" },
  en_retard:      { cls: "border-red-500/50 bg-red-500/15 text-red-300",         label: "En retard" },
  annule:         { cls: "border-neutral-700 bg-neutral-800 text-neutral-400",   label: "Annulé" },
  // events
  a_venir:        { cls: "border-sky-500/40 bg-sky-500/10 text-sky-200",         label: "À venir" },
  en_cours:       { cls: "border-amber-500/40 bg-amber-500/10 text-amber-200",   label: "En cours" },
  termine:        { cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200", label: "Terminé" },
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const p = palette[status] || { cls: "border-neutral-700 bg-neutral-800 text-neutral-400", label: status };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${p.cls}`}
    >
      {p.label}
    </span>
  );
}
