import type { Database } from "@/types/database";

/**
 * Suivi de remise de l'e-mail d'un devis (table quote_emails, alimentée
 * par sendDevis puis par le webhook Resend). Fonctions pures, utilisables
 * côté serveur comme côté client.
 */
export type QuoteEmail = Pick<
  Database["public"]["Tables"]["quote_emails"]["Row"],
  | "quote_id"
  | "recipient"
  | "error"
  | "created_at"
  | "sent_at"
  | "delivered_at"
  | "delayed_at"
  | "opened_at"
  | "bounced_at"
  | "complained_at"
  | "failed_at"
  | "problem_detail"
>;

/** Colonnes à sélectionner pour construire un QuoteEmail. */
export const QUOTE_EMAIL_COLUMNS =
  "quote_id,recipient,error,created_at,sent_at,delivered_at,delayed_at,opened_at,bounced_at,complained_at,failed_at,problem_detail";

export type DeliveryTone = "neutral" | "ok" | "warn" | "problem";

export type DeliveryState = {
  label: string;
  tone: DeliveryTone;
  /** True quand l'e-mail n'est pas arrivé (ou a été signalé) : à traiter. */
  problem: boolean;
  /** Phrase courte expliquant l'état, pour l'infobulle et la fiche. */
  hint: string;
};

/**
 * État affiché, du plus grave au plus favorable. Les événements Resend
 * peuvent arriver dans le désordre : on lit les horodatages, pas l'ordre
 * de réception.
 */
export function deliveryState(e: QuoteEmail): DeliveryState {
  if (e.complained_at) {
    return {
      label: "Signalé spam",
      tone: "problem",
      problem: true,
      hint: "Le client a marqué l'e-mail comme indésirable.",
    };
  }
  if (e.bounced_at) {
    return {
      label: "Non remis",
      tone: "problem",
      problem: true,
      hint: "La messagerie du client a refusé l'e-mail (adresse invalide ou boîte pleine).",
    };
  }
  if (e.failed_at || e.error) {
    return {
      label: "Échec d'envoi",
      tone: "problem",
      problem: true,
      hint: "L'e-mail n'est pas parti.",
    };
  }
  if (e.opened_at) {
    return {
      label: "Ouvert",
      tone: "ok",
      problem: false,
      hint: "Ouverture indicative : certaines messageries la masquent ou la simulent.",
    };
  }
  if (e.delivered_at) {
    return {
      label: "Remis",
      tone: "ok",
      problem: false,
      hint: "Arrivé dans la messagerie du client.",
    };
  }
  if (e.delayed_at) {
    return {
      label: "Retardé",
      tone: "warn",
      problem: false,
      hint: "La messagerie du client ne répond pas encore, l'envoi est retenté automatiquement.",
    };
  }
  // « Parti » plutôt que « Envoyé » : la pastille suit le statut ENVOYÉ.
  return {
    label: "Parti",
    tone: "neutral",
    problem: false,
    hint: e.sent_at
      ? "Parti, en attente de l'accusé de remise."
      : "Envoi demandé, en attente de confirmation.",
  };
}

const parisFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

export function formatDeliveryDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : parisFmt.format(d);
}

/** Étapes connues, dans l'ordre chronologique de l'envoi. */
export function deliveryTimeline(e: QuoteEmail): { label: string; at: string }[] {
  const steps: { label: string; at: string | null }[] = [
    // Sans accusé de Resend, l'heure de la demande tient lieu d'envoi,
    // sauf si l'envoi a échoué.
    { label: "Envoyé", at: e.sent_at ?? (e.failed_at || e.error ? null : e.created_at) },
    { label: "Retardé", at: e.delivered_at ? null : e.delayed_at },
    { label: "Remis", at: e.delivered_at },
    { label: "Ouvert", at: e.opened_at },
    { label: "Non remis", at: e.bounced_at },
    { label: "Échec", at: e.failed_at },
    { label: "Signalé spam", at: e.complained_at },
  ];
  return steps.filter((s): s is { label: string; at: string } => !!s.at);
}

/** Texte multi-ligne pour l'attribut title (survol). */
export function deliveryTooltip(e: QuoteEmail): string {
  const lines = deliveryTimeline(e).map(
    (s) => `${s.label} : ${formatDeliveryDate(s.at)}`,
  );
  if (e.recipient) lines.unshift(`À ${e.recipient}`);
  const detail = e.problem_detail || e.error;
  if (detail) lines.push(`Motif : ${detail}`);
  lines.push(deliveryState(e).hint);
  return lines.join("\n");
}

/** Dernier e-mail envoyé par devis (le plus récent gagne). */
export function latestEmailByQuote(rows: QuoteEmail[]): Map<string, QuoteEmail> {
  const out = new Map<string, QuoteEmail>();
  for (const r of rows) {
    const cur = out.get(r.quote_id);
    if (!cur || r.created_at > cur.created_at) out.set(r.quote_id, r);
  }
  return out;
}

/**
 * Tag Resend posé sur l'e-mail du devis : le webhook s'en sert pour
 * reconnaître un e-mail de devis dont la ligne n'est pas encore écrite.
 */
export const QUOTE_EMAIL_TAG = { name: "category", value: "devis" } as const;
