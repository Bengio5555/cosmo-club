import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const TITLES = {
  bounced: "L'e-mail du devis n'est pas arrivé",
  complained: "Le client a signalé l'e-mail du devis comme spam",
  failed: "L'e-mail du devis n'est pas parti",
} as const;

const ADVICE = {
  bounced:
    "Vérifie l'adresse sur la fiche client, repasse le devis en brouillon puis renvoie-le.",
  complained:
    "Inutile de renvoyer l'e-mail : contacte le client directement (téléphone, autre adresse).",
  failed: "Repasse le devis en brouillon puis renvoie-le.",
} as const;

/**
 * Alerte l'équipe quand l'e-mail d'un devis rebondit, est signalé comme
 * spam ou échoue. Appelée par le webhook Resend une seule fois par
 * problème (colonne posée pour la première fois). Best-effort : une
 * erreur est journalisée, jamais remontée au webhook.
 *
 * Une alerte qui rebondit elle-même ne boucle pas : son id Resend n'est
 * pas dans quote_emails et elle ne porte pas le tag devis.
 */
export async function notifyQuoteEmailProblem(o: {
  quoteId: string;
  recipient: string | null;
  kind: keyof typeof TITLES;
  detail?: string;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const admin = createAdminClient();
    const [{ data: quote }, { data: settings }] = await Promise.all([
      admin.from("quotes").select("number,subject").eq("id", o.quoteId).maybeSingle(),
      admin.from("settings").select("email").eq("id", 1).maybeSingle(),
    ]);
    if (!quote) return;

    const to =
      settings?.email || process.env.DEVIS_TO_EMAIL || "contact@cosmoclub.fr";
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      process.env.DEVIS_FROM_EMAIL ||
      "devis@cosmoclub.fr";
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.cosmoclub.fr";
    const link = `${origin}/dashboard/devis/${o.quoteId}`;

    const rows: Array<[string, string | null | undefined]> = [
      ["Devis", quote.number],
      ["Objet", quote.subject],
      ["Destinataire", o.recipient],
      ["Motif", o.detail],
    ];
    const detailHtml = rows
      .filter(([, v]) => v)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;vertical-align:top;">${k}</td><td style="padding:4px 0;color:#111827;font-size:13px;">${escapeHtml(String(v))}</td></tr>`,
      )
      .join("");

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;">
        <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8b1a1a;font-weight:700;margin:0 0 4px;">Cosmo Club Paris</p>
        <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">${TITLES[o.kind]}</h1>
        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
          <table style="border-collapse:collapse;">${detailHtml}</table>
        </div>
        <p style="font-size:14px;color:#374151;margin:16px 0 0;">${ADVICE[o.kind]}</p>
        <p style="margin:20px 0 0;">
          <a href="${link}" style="display:inline-block;background:#8b1a1a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">Ouvrir le devis</a>
        </p>
        <p style="font-size:11px;color:#9ca3af;margin:24px 0 0;">Alerte automatique — suivi des e-mails de devis.</p>
      </div>`;

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `Cosmo Club Paris <${fromEmail}>`,
      to: [to],
      subject: `${TITLES[o.kind]} — ${quote.number}`,
      html,
    });
    if (error) console.error("[notifyQuoteEmailProblem] resend refused:", error);
  } catch (err) {
    console.error("[notifyQuoteEmailProblem] failed:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
