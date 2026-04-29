import { NextResponse } from "next/server";
import { Resend } from "resend";
import { devisSchema } from "@/lib/content/devis";
import { site } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

const RESEND_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.DEVIS_TO_EMAIL ?? site.email;
const FROM_EMAIL = process.env.DEVIS_FROM_EMAIL ?? "devis@cosmoclub.fr";

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

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
async function persistLead(data: ReturnType<typeof devisSchema.parse>) {
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

    const payload = {
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
      raw_payload: data as unknown as Database["public"]["Tables"]["leads"]["Insert"]["raw_payload"],
    };
    const { data: inserted, error } = await supabase
      .from("leads")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      console.error("[persistLead] insert error:", error.message, error.details, error.hint);
      return;
    }
    console.log("[persistLead] ok id=", inserted?.id, "client_id=", clientId);
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

  // Persist to DB alongside the email — failures in one don't affect the other.
  await persistLead(data);

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
