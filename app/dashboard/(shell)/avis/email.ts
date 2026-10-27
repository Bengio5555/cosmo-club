/**
 * E-mail de demande d'avis Google. Pur (pas d'I/O) pour rester testable.
 *
 * On ne reprend pas le titre interne de l'événement (souvent un libellé
 * d'équipe) : seulement la date, formulée côté client. Le ton est neutre
 * et l'e-mail part à tous les clients, sans filtrer les plus contents :
 * Google interdit de solliciter sélectivement les avis positifs.
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
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

export function buildReviewEmail({ firstName, eventDate, reviewUrl }: ReviewEmailInput) {
  const name = (firstName ?? "").trim();
  const greeting = name ? `Bonjour ${name},` : "Bonjour,";
  const dateLong = formatEventDateLong(eventDate);
  const eventPhrase = dateLong ? `votre événement du ${dateLong}` : "votre événement";

  const subject = "Merci pour votre événement — un mot sur Google ?";

  const text = [
    greeting,
    "",
    `Merci encore de nous avoir confié ${eventPhrase}.`,
    "",
    "Votre avis Google nous aiderait beaucoup : c'est comme ça que de futurs clients nous trouvent. Si vous avez une minute, dites en quelques mots le type d'événement et ce qui vous a marqué.",
    "",
    `Laisser un avis : ${reviewUrl}`,
    "",
    "À très vite,",
    "L'équipe Cosmo Club Paris",
  ].join("\n");

  const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#111827;">
        <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8b1a1a;font-weight:700;margin:0 0 16px;">Cosmo Club Paris</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">${escapeHtml(greeting)}</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Merci encore de nous avoir confié ${escapeHtml(eventPhrase)}.</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">Votre avis Google nous aiderait beaucoup&nbsp;: c'est comme ça que de futurs clients nous trouvent. Si vous avez une minute, dites en quelques mots le type d'événement et ce qui vous a marqué.</p>
        <p style="margin:0 0 24px;">
          <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#8b1a1a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px;">Laisser un avis</a>
        </p>
        <p style="font-size:15px;line-height:1.6;margin:0;">À très vite,<br>L'équipe Cosmo Club Paris</p>
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
