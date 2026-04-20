import { NextResponse } from "next/server";
import { Resend } from "resend";
import { devisSchema } from "@/lib/content/devis";
import { site } from "@/lib/site";

export const runtime = "nodejs";

const RESEND_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.DEVIS_TO_EMAIL ?? site.email;
const FROM_EMAIL = process.env.DEVIS_FROM_EMAIL ?? "devis@cosmoclub.fr";

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

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

  // Honeypot — silent drop
  if (data.website) {
    return NextResponse.json({ ok: true, dropped: true });
  }

  const subject = `Nouveau devis · ${labelFor(data.eventType)} · ${data.firstName} ${data.lastName}`;

  const textBody = [
    `Nouveau devis Cosmo Club`,
    `—`,
    `Événement : ${labelFor(data.eventType)}`,
    `Offre : ${offerLabel(data.offer)}`,
    `Date : ${data.date}`,
    `Lieu : ${data.location}`,
    `Invités : ${data.guests}`,
    `—`,
    `Contact : ${data.firstName} ${data.lastName}`,
    `Email : ${data.email}`,
    `Téléphone : ${data.phone}`,
    `—`,
    `Message :`,
    data.message || "(aucun)",
  ].join("\n");

  const htmlBody = renderHtml(data);

  if (!resend) {
    // Dev fallback: log to server console so the flow is testable without a key
    console.log("\n===== [DEVIS · no RESEND_API_KEY] =====\n" + textBody + "\n=======================================\n");
    return NextResponse.json({ ok: true, dev: true });
  }

  try {
    await resend.emails.send({
      from: `Cosmo Club Devis <${FROM_EMAIL}>`,
      to: [TO_EMAIL],
      replyTo: data.email,
      subject,
      text: textBody,
      html: htmlBody,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("resend_error", err);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }
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
    both: "Les deux",
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
