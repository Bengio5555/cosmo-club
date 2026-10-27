/**
 * E-mail de demande d'avis Google. Pur (pas d'I/O) pour rester testable.
 *
 * On ne reprend pas le titre interne de l'événement (souvent un libellé
 * d'équipe) : seulement la date, formulée côté client. Ton chaleureux,
 * signé La Cosmo Team comme le Book ; la demande reste légère et part à
 * tous les clients, sans filtrer les plus contents : Google interdit de
 * solliciter sélectivement les avis positifs.
 */
export type ReviewEmailInput = {
  firstName: string | null;
  eventDate: string; // YYYY-MM-DD
  reviewUrl: string;
};

export function formatEventDateLong(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
}

export function buildReviewEmail({ firstName, eventDate, reviewUrl }: ReviewEmailInput) {
  const name = (firstName ?? "").trim();
  const greeting = name ? `Bonjour ${name},` : "Bonjour,";
  const dateLong = formatEventDateLong(eventDate);
  const eventPhrase = dateLong ? `votre événement du ${dateLong}` : "votre événement";

  // Pas « soirée » : séminaires, ateliers et déjeuners ont lieu de jour.
  const subject = "Merci pour ce beau moment";
  const thanks = `Merci encore de nous avoir accueillis pour ${eventPhrase}. On espère que vos invités en gardent un aussi bon souvenir que nous.`;
  const ask = "Si vous avez un instant, quelques mots sur Google nous feraient très plaisir.";

  const text = [
    greeting,
    "",
    thanks,
    "",
    ask,
    "",
    `Laisser un avis : ${reviewUrl}`,
    "",
    "À très vite,",
    "La Cosmo Team",
  ].join("\n");

  const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#111827;">
        <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8b1a1a;font-weight:700;margin:0 0 16px;">Cosmo Club Paris</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">${escapeHtml(greeting)}</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">${escapeHtml(thanks)}</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">${escapeHtml(ask)}</p>
        <p style="margin:0 0 24px;">
          <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#8b1a1a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px;">Laisser un avis</a>
        </p>
        <p style="font-size:15px;line-height:1.6;margin:0;">À très vite,<br><strong>La Cosmo Team</strong></p>
      </div>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
