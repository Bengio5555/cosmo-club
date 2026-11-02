import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { devisSchema } from "@/lib/content/devis";
import { honeypotVerdict } from "@/lib/devisHoneypot";
import { site } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { channelLabel, deriveChannel, hostOf } from "@/lib/attribution";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

const RESEND_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL_ENV = process.env.DEVIS_TO_EMAIL ?? site.email;
const FROM_EMAIL = process.env.DEVIS_FROM_EMAIL ?? "devis@cosmoclub.fr";

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// Plaquette jointe à l'accusé de réception. Source : scripts/plaquette/
// (régénérer avec `bash scripts/plaquette/build.sh`). Resend télécharge le
// fichier depuis l'URL publique du site, donc le PDF doit être déployé.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? site.url).replace(/\/$/, "");
const BROCHURE_URL = `${SITE_URL}/book/cosmo-club-book.pdf`;
const BROCHURE_FILENAME = "Cosmo Club Paris - Book 2026.pdf";

// Resolve the notification recipient: the value configured by the owner
// in /dashboard/settings wins, then the DEVIS_TO_EMAIL env var (build-time),
// then site.email as a last resort. Reads via the admin client so it works
// even when the lead-submission request has no user session.
async function resolveLeadNotificationEmail(): Promise<string> {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasUrl || !hasKey) return TO_EMAIL_ENV;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("lead_notification_email")
      .eq("id", 1)
      .maybeSingle();
    const fromDb = data?.lead_notification_email?.trim();
    return fromDb && fromDb.length > 0 ? fromDb : TO_EMAIL_ENV;
  } catch {
    return TO_EMAIL_ENV;
  }
}

// Map the form's eventType values to the DB enum. `mariage` / `corporate` /
// `prive` / `defile` are shared; `autre` is a safe fallback for unknowns.
function toDbEventType(
  v: string,
): Database["public"]["Enums"]["event_type"] | null {
  const allowed: Database["public"]["Enums"]["event_type"][] = [
    "mariage",
    "corporate",
    "prive",
    "defile",
    "lancement",
    "autre",
  ];
  return (allowed as string[]).includes(v) ? (v as Database["public"]["Enums"]["event_type"]) : "autre";
}

// The form accepts a free-form date string ("14 juin 2026", "printemps 2026"…).
// Postgres DATE is strict so we only populate `event_date` when we can coerce
// to a valid ISO date — otherwise we keep the raw text inside `raw_payload`
// and leave the column null. Prevents the whole insert from failing because
// of a human-friendly date.
function toDbDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  // Already ISO-like? 2026-04-22 / 2026/04/22
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) {
    const iso = s.replace(/\//g, "-");
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return iso;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // Anything else (eg. "14 juin 2026", "printemps 2026") → skip. The original
  // text is preserved in raw_payload so the owner can read it in the admin.
  return null;
}

// Persist the lead into the `leads` table. Non-blocking: failures are logged
// and swallowed so the user still gets a successful response if the email
// went through.
async function persistLead(data: ReturnType<typeof devisSchema.parse>, opts: { suspect?: boolean } = {}) {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasUrl || !hasKey) {
    console.warn(
      "[persistLead] skipped — missing env. supabaseUrl=",
      hasUrl,
      "serviceRoleKey=",
      hasKey,
    );
    return;
  }
  try {
    const supabase = createAdminClient();

    // Upsert a client row first so the lead is linked to a real fiche
    // client. Lookup is by email (case-insensitive). Failures here are
    // non-fatal — the lead is still inserted unlinked.
    let clientId: string | null = null;
    if (data.email) {
      const emailLower = data.email.trim().toLowerCase();
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .ilike("email", emailLower)
        .maybeSingle();
      if (existing?.id) {
        clientId = existing.id;
      } else {
        const { data: createdClient, error: cErr } = await supabase
          .from("clients")
          .insert({
            first_name: data.firstName?.trim() || null,
            last_name: data.lastName?.trim() || null,
            email: emailLower,
            phone: data.phone || null,
          })
          .select("id")
          .single();
        if (cErr) {
          console.error("[persistLead] client insert error:", cErr.message);
        } else {
          clientId = createdClient?.id ?? null;
        }
      }
    }

    // Provenance: the site captured UTMs / referrer / landing page; we
    // derive a filterable channel and keep the raw fields for cross-checks
    // with Meta Ads or GA4.
    const attr = data.attribution ?? {};
    const attribution = {
      channel: deriveChannel(attr),
      utm_source: attr.utm_source ?? null,
      utm_medium: attr.utm_medium ?? null,
      utm_campaign: attr.utm_campaign ?? null,
      utm_content: attr.utm_content ?? null,
      referrer: attr.referrer ?? null,
      landing_page: attr.landing_page ?? null,
    };

    const basePayload = {
      source: "site",
      status: "nouveau" as const,
      client_id: clientId,
      contact_name: `${data.firstName} ${data.lastName}`.trim(),
      contact_email: data.email,
      contact_phone: data.phone,
      event_type: toDbEventType(data.eventType),
      event_date: toDbDate(data.date),
      guests_count:
        typeof data.guests === "number"
          ? data.guests
          : data.guests != null
          ? Number(data.guests) || null
          : null,
      message: data.message || null,
      // Champ piège rempli avec un contenu inhabituel (voir lib/devisHoneypot) :
      // la demande est gardée, notifiée, mais signalée.
      internal_notes: opts.suspect
        ? "⚠️ Champ piège anti-robots rempli avec un contenu inhabituel : robot probable. Tu as reçu la notification, mais le Book n'a pas été envoyé. À vérifier avant de répondre."
        : null,
      // Marque posée sur la canette (page canettes) : sert de société
      // par défaut, le reste du payload est conservé dans raw_payload.
      company: typeof data.canBrand === "string" && data.canBrand.trim() ? data.canBrand.trim() : null,
      raw_payload: data as unknown as Database["public"]["Tables"]["leads"]["Insert"]["raw_payload"],
    };
    const payload = { ...basePayload, ...attribution };
    let { data: inserted, error } = await supabase
      .from("leads")
      .insert(payload)
      .select("id")
      .single();
    // Safety net: if the attribution columns are not migrated yet (or ever
    // get dropped), never lose the demande — retry without them.
    if (error && /column|schema cache/i.test(error.message)) {
      console.warn("[persistLead] attribution columns missing, retrying without:", error.message);
      ({ data: inserted, error } = await supabase
        .from("leads")
        .insert(basePayload)
        .select("id")
        .single());
    }
    if (error) {
      console.error("[persistLead] insert error:", error.message, error.details, error.hint);
      return;
    }
    console.log("[persistLead] ok id=", inserted?.id, "client_id=", clientId);
    // Invalidate the dashboard so the sidebar "Demandes" pastille (which
    // lives in the cached shell layout) and the KPI both pick up the new
    // demande on the owner's next navigation — otherwise the badge lags.
    revalidatePath("/dashboard", "layout");
  } catch (err) {
    console.error("[persistLead] thrown:", err);
  }
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = devisSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Champ piège : un remplissage automatique du navigateur n'est pas un robot.
  // Une demande suspecte est gardée et notifiée (une vraie demande ne doit
  // jamais être perdue), mais le prospect ne reçoit pas le Book : le
  // formulaire ne doit pas servir de relais d'e-mails.
  const suspect = honeypotVerdict(data) === "bot";

  const subject = `${suspect ? "⚠️ Robot probable · " : ""}Nouveau devis · ${labelFor(data.eventType)} · ${data.firstName} ${data.lastName}`;

  const textBody = [
    `Nouveau devis Cosmo Club`,
    `—`,
    `Événement : ${labelFor(data.eventType)}`,
    `Offre : ${offerLabel(data.offer)}`,
    `Date : ${data.date}`,
    `Lieu : ${data.location}`,
    `Invités : ${data.guests}`,
    `Provenance : ${provenanceLine(data)}`,
    `—`,
    `Contact : ${data.firstName} ${data.lastName}`,
    `Email : ${data.email}`,
    `Téléphone : ${data.phone}`,
    `—`,
    `Message :`,
    data.message || "(aucun)",
  ].join("\n");

  const htmlBody = renderHtml(data);

  // Persist to DB alongside the email — failures in one don't affect the other.
  await persistLead(data, { suspect });

  if (!resend) {
    // Dev fallback: log to server console so the flow is testable without a key
    console.log("\n===== [DEVIS · no RESEND_API_KEY] =====\n" + textBody + "\n=======================================\n");
    return NextResponse.json({ ok: true, dev: true });
  }

  const toEmail = await resolveLeadNotificationEmail();

  // Les deux envois partent ensemble ; seul celui de l'admin conditionne
  // la réponse, l'accusé de réception au client est best-effort.
  const [adminResult] = await Promise.allSettled([
    resend.emails.send({
      from: `Cosmo Club Devis <${FROM_EMAIL}>`,
      to: [toEmail],
      replyTo: data.email,
      subject,
      text: textBody,
      html: htmlBody,
    }),
    suspect ? Promise.resolve() : sendBrochure(resend, data, toEmail),
  ]);

  if (adminResult.status === "rejected") {
    console.error("resend_error", adminResult.reason);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }
  return NextResponse.json(suspect ? { ok: true, flagged: true } : { ok: true });
}

// Accusé de réception envoyé au prospect dès sa demande, avec la plaquette
// en pièce jointe. Les réponses du client arrivent chez l'admin (replyTo).
// Si Resend refuse la pièce jointe (PDF introuvable, par exemple avant le
// déploiement), on renvoie le même mail sans PJ : le lien suffit.
async function sendBrochure(
  client: Resend,
  d: ReturnType<typeof devisSchema.parse>,
  replyTo: string,
) {
  const base = {
    from: `Cosmo Club Paris <${FROM_EMAIL}>`,
    to: [d.email],
    replyTo,
    subject: "Votre demande Cosmo Club · notre Book",
    text: renderBrochureText(d),
    html: renderBrochureHtml(d),
  };
  try {
    const res = await client.emails.send({
      ...base,
      attachments: [{ filename: BROCHURE_FILENAME, path: BROCHURE_URL }],
    });
    if (!res.error) return;
    console.error("[sendBrochure] with attachment:", res.error);
  } catch (err) {
    console.error("[sendBrochure] with attachment threw:", err);
  }
  try {
    const res = await client.emails.send(base);
    if (res.error) console.error("[sendBrochure] without attachment:", res.error);
  } catch (err) {
    console.error("[sendBrochure] without attachment threw:", err);
  }
}

// "Instagram (pub) · campagne mariage · via instagram.com" — for the
// notification email, so the owner sees the channel without opening the
// dashboard.
function provenanceLine(d: ReturnType<typeof devisSchema.parse>) {
  const a = d.attribution ?? {};
  const parts = [channelLabel(deriveChannel(a))];
  if (a.utm_campaign) parts.push(`campagne ${a.utm_campaign}`);
  const host = hostOf(a.referrer);
  if (host) parts.push(`via ${host}`);
  if (a.landing_page) parts.push(`arrivée ${a.landing_page}`);
  return parts.join(" · ");
}

function labelFor(t: string) {
  const map: Record<string, string> = {
    mariage: "Mariage",
    corporate: "Corporate",
    prive: "Soirée privée",
    defile: "Défilé",
    autre: "Autre",
  };
  return map[t] ?? t;
}

function offerLabel(o: string) {
  const map: Record<string, string> = {
    bar: "Bar à cocktails",
    barista: "Barista",
    canettes: "Mocktail in a can",
    both: "Bar + barista",
    undecided: "À conseiller",
  };
  return map[o] ?? o;
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Le mail part vers l'adresse saisie dans un formulaire public : le prénom
// est le seul texte libre recopié, on le borne pour qu'un robot ne puisse pas
// s'en servir pour relayer un message ou un lien depuis notre domaine.
function brochureName(d: ReturnType<typeof devisSchema.parse>): string | null {
  const name = d.firstName.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name || /https?:|www\.|@|\.[a-z]{2,}\b/i.test(name)) return null;
  return name;
}

function brochureRecap(d: ReturnType<typeof devisSchema.parse>): [string, string][] {
  const rows: [string, string][] = [
    ["Événement", labelFor(d.eventType)],
    ["Offre", offerLabel(d.offer)],
    ["Date", d.date],
    ["Lieu", d.location],
  ];
  if (d.guests != null) rows.push(["Invités", String(d.guests)]);
  return rows;
}

function renderBrochureText(d: ReturnType<typeof devisSchema.parse>) {
  return [
    brochureName(d) ? `Bonjour ${brochureName(d)},` : "Bonjour,",
    ``,
    `Merci pour votre demande, elle est bien arrivée ! Nous revenons vers vous sous 48 h pour en parler.`,
    ``,
    `En attendant, vous trouverez notre Book en pièce jointe : nos bars, nos cartes, nos personnalisations…`,
    `Il est aussi disponible ici : ${BROCHURE_URL}`,
    ``,
    `Votre demande :`,
    ...brochureRecap(d).map(([k, v]) => `${k} : ${v}`),
    ``,
    `Une précision à ajouter ? Répondez simplement à cet e-mail.`,
    ``,
    `À très vite,`,
    `La Cosmo Team`,
    `${site.phoneDisplay} · ${site.url.replace(/^https?:\/\/(www\.)?/, "")} · ${site.instagramHandle}`,
  ].join("\n");
}

function renderBrochureHtml(d: ReturnType<typeof devisSchema.parse>) {
  const rows = brochureRecap(d)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:5px 0; color:#726d63; width:110px;">${escape(k)}</td><td style="padding:5px 0;">${escape(v)}</td></tr>`,
    )
    .join("");
  return `
<!doctype html>
<html lang="fr">
  <body style="font-family: Inter, system-ui, sans-serif; background:#f5efe0; margin:0; padding:32px; color:#2a1f14;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 8px;">
          <p style="font-size:10px; letter-spacing:0.28em; text-transform:uppercase; color:#8b1a1a; margin:0 0 12px;">Cosmo Club Paris</p>
          <h1 style="font-family:Georgia,serif; font-size:28px; line-height:1.2; margin:0 0 18px; color:#2a1f14;">${brochureName(d) ? `Merci, ${escape(brochureName(d)!)}&nbsp;!` : "Merci&nbsp;!"}</h1>
          <p style="margin:0 0 12px; line-height:1.6;">Votre demande est bien arrivée. Nous revenons vers vous sous 48&nbsp;h pour en parler.</p>
          <p style="margin:0 0 12px; line-height:1.6;">En attendant, vous trouverez notre Book en pièce jointe&nbsp;: nos bars, nos cartes, nos personnalisations…</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 8px;">
          <a href="${BROCHURE_URL}" style="display:inline-block; padding:14px 28px; background:#8b1a1a; color:#f5efe0; text-decoration:none; border-radius:999px; font-size:12px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase;">
            Voir le Book
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe0; border-left:3px solid #8b1a1a; border-radius:6px;">
            <tr>
              <td style="padding:14px 18px;">
                <p style="font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:#8b1a1a; margin:0 0 8px;">Votre demande</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px; line-height:1.5; color:#2a1f14;">${rows}</table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 28px; line-height:1.6;">
          <p style="margin:0 0 16px;">Une précision à ajouter&nbsp;? Répondez simplement à cet e-mail.</p>
          <p style="margin:0;">À très vite,<br/><strong>La Cosmo Team</strong></p>
          <p style="margin:6px 0 0; font-size:13px; color:#3a2a1e;">
            <a href="tel:${site.phone.replace(/\s/g, "")}" style="color:#8b1a1a; text-decoration:none;">${escape(site.phoneDisplay)}</a>
            · <a href="${site.url}" style="color:#8b1a1a; text-decoration:none;">cosmoclub.fr</a>
            · <a href="${site.instagram}" style="color:#8b1a1a; text-decoration:none;">${escape(site.instagramHandle)}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px; background:#f5efe0; font-size:11px; color:#3a2a1e; opacity:0.7;">
          Cet e-mail vous a été envoyé suite à votre demande sur cosmoclub.fr.
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

function renderHtml(d: ReturnType<typeof devisSchema.parse>) {
  return `
<!doctype html><html><body style="font-family: ui-sans-serif,system-ui,sans-serif; background:#0a0a0a; color:#e9e2d0; padding:24px;">
  <div style="max-width:640px; margin:0 auto; background:#141311; border:1px solid #3a3733; border-radius:14px; padding:28px;">
    <p style="font-size:11px; letter-spacing:0.28em; text-transform:uppercase; color:#c9a961; margin:0 0 8px;">Cosmo Club · Nouveau devis</p>
    <h1 style="font-family:Georgia,serif; font-size:28px; margin:0 0 20px; color:#f5f1e8;">${escape(d.firstName)} ${escape(d.lastName)}</h1>

    <table style="width:100%; border-collapse:collapse; font-size:14px; line-height:1.6;">
      <tr><td style="padding:6px 0; color:#726d63;">Événement</td><td>${escape(labelFor(d.eventType))}</td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Offre</td><td>${escape(offerLabel(d.offer))}</td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Date</td><td>${escape(d.date)}</td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Lieu</td><td>${escape(d.location)}</td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Invités</td><td>${d.guests}</td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Email</td><td><a href="mailto:${escape(d.email)}" style="color:#c9a961;">${escape(d.email)}</a></td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Téléphone</td><td>${escape(d.phone)}</td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Provenance</td><td>${escape(provenanceLine(d))}</td></tr>
    </table>

    ${
      d.message
        ? `<div style="margin-top:20px; padding-top:20px; border-top:1px solid #3a3733;">
            <p style="font-size:11px; letter-spacing:0.28em; text-transform:uppercase; color:#c9a961; margin:0 0 10px;">Message</p>
            <p style="white-space:pre-wrap; font-size:15px; line-height:1.6;">${escape(d.message)}</p>
          </div>`
        : ""
    }
  </div>
</body></html>`.trim();
}
