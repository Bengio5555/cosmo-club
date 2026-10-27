/**
 * Suivi des demandes d'avis Google. Pur (pas d'I/O) : utilisé par la page
 * /dashboard/avis, ses actions serveur et le bloc « À faire ».
 *
 * Processus, identique pour les mariages et les entreprises :
 *  - une demande après l'événement ;
 *  - une seule relance, 7 jours après la demande, si l'avis n'est pas reçu ;
 *  - une demande au plus par client sur 12 mois (les entreprises
 *    reviennent souvent), aucune s'il a déjà laissé un avis.
 */

export const REMIND_AFTER_DAYS = 7;
export const CLIENT_COOLDOWN_DAYS = 365;
const DAY_MS = 86400000;
/** Jeton du lien de suivi : 32 caractères hexadécimaux (voir la migration). */
export const REVIEW_TOKEN_RE = /^[0-9a-f]{32}$/;

export type ReviewEventLite = {
  id: string;
  client_id: string | null;
  review_requested_at: string | null;
  review_reminded_at: string | null;
  review_received_at: string | null;
};

export type ReviewStage =
  | { stage: "received"; at: string }
  | { stage: "reminded"; at: string; requestedAt: string }
  | { stage: "to_remind"; requestedAt: string }
  | { stage: "waiting"; requestedAt: string; remindFrom: string }
  /** Le client a déjà reçu une demande récente (autre événement) ou laissé un avis. */
  | { stage: "client_done"; reason: "reviewed" | "recent"; at: string }
  | { stage: "to_request" };

const ms = (iso: string) => new Date(iso).getTime();

/** Date à partir de laquelle la relance est possible. */
export function remindFrom(requestedAt: string): string {
  return new Date(ms(requestedAt) + REMIND_AFTER_DAYS * DAY_MS).toISOString();
}

/**
 * Pourquoi ne pas redemander à ce client : avis déjà laissé (quel que soit
 * l'événement), ou demande envoyée il y a moins de 12 mois sur un autre
 * événement. `clientEvents` : tous les événements du client.
 */
export function clientBlock(
  eventId: string,
  clientEvents: ReviewEventLite[],
  now: number,
): { reason: "reviewed" | "recent"; at: string } | null {
  const others = clientEvents.filter((e) => e.id !== eventId);
  const received = others
    .map((e) => e.review_received_at)
    .filter((x): x is string => !!x)
    .sort()
    .pop();
  if (received) return { reason: "reviewed", at: received };
  const cutoff = now - CLIENT_COOLDOWN_DAYS * DAY_MS;
  const recent = others
    .flatMap((e) => [e.review_requested_at, e.review_reminded_at])
    .filter((x): x is string => !!x && ms(x) >= cutoff)
    .sort()
    .pop();
  return recent ? { reason: "recent", at: recent } : null;
}

export function reviewStage(ev: ReviewEventLite, clientEvents: ReviewEventLite[], now: number): ReviewStage {
  if (ev.review_received_at) return { stage: "received", at: ev.review_received_at };
  if (ev.review_requested_at) {
    if (ev.review_reminded_at) {
      return { stage: "reminded", at: ev.review_reminded_at, requestedAt: ev.review_requested_at };
    }
    const from = remindFrom(ev.review_requested_at);
    return ms(from) <= now
      ? { stage: "to_remind", requestedAt: ev.review_requested_at }
      : { stage: "waiting", requestedAt: ev.review_requested_at, remindFrom: from };
  }
  const block = ev.client_id ? clientBlock(ev.id, clientEvents, now) : null;
  return block ? { stage: "client_done", ...block } : { stage: "to_request" };
}

/**
 * Un clic sur le lien de suivi compte-t-il ? Les antivirus des messageries
 * d'entreprise ouvrent les liens dès la réception : on ignore les robots
 * déclarés et les clics dans les 2 minutes qui suivent un envoi.
 */
export function isHumanClick(userAgent: string | null, lastSentAt: string | null, now: number): boolean {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua || /bot|crawl|spider|scan|preview|safelinks|proofpoint|mimecast|barracuda|curl|wget|python|headless/.test(ua)) {
    return false;
  }
  if (lastSentAt && now - ms(lastSentAt) < 2 * 60 * 1000) return false;
  return true;
}
