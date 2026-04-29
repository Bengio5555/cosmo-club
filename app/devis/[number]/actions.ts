"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { CGV_TEXT, cgvVersion } from "@/lib/cgv";

// Public acceptance / refusal flow. No auth is checked — the plaquette
// URL itself is the access token. We only allow the transition from
// `envoye` so that once a decision has landed, a second visitor can't
// overwrite it.
//
// The acceptance step now captures a real signature audit trail:
// signer's name, drawn signature image, IP, timestamp, and the hash of
// the CGV version that was displayed at signing time. Required for
// legal value under Art. 1366 du Code civil + eIDAS "simple signature".

export type AcceptDevisInput = {
  quoteId: string;
  signerName: string;
  signatureDataUrl: string;
};

function trimToDataUrl(input: string): string | null {
  if (typeof input !== "string") return null;
  // Accept only image/png base64 data URLs to avoid stuffing arbitrary
  // text in the column. Cap the size at 200 KB to keep DB rows light.
  if (!/^data:image\/png;base64,/.test(input)) return null;
  if (input.length > 200_000) return null;
  return input;
}

function clientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? null;
}

export async function acceptDevis(input: AcceptDevisInput) {
  const supabase = createAdminClient();

  const signerName = (input.signerName ?? "").trim();
  if (!signerName) {
    return { ok: false as const, error: "Le nom du signataire est requis." };
  }
  const signatureData = trimToDataUrl(input.signatureDataUrl);
  if (!signatureData) {
    return { ok: false as const, error: "Signature invalide ou trop volumineuse." };
  }

  const { data: q } = await supabase
    .from("quotes")
    .select("id,status,number,client_id,subject,total_ttc")
    .eq("id", input.quoteId)
    .maybeSingle();
  if (!q) return { ok: false as const, error: "Devis introuvable" };
  if (q.status !== "envoye") {
    return { ok: false as const, error: "Devis déjà décidé." };
  }

  const ip = clientIp(await headers());
  const now = new Date().toISOString();
  const version = cgvVersion();

  const { error } = await supabase
    .from("quotes")
    .update({
      status: "accepte",
      accepted_at: now,
      signature_data: signatureData,
      signed_by_name: signerName,
      signed_ip: ip,
      cgv_version: version,
      cgv_accepted_at: now,
    })
    .eq("id", input.quoteId);
  if (error) return { ok: false as const, error: error.message };

  // Best-effort email confirmation to both parties. Failure here is
  // not fatal — the acceptance is already persisted.
  void sendAcceptanceEmails({
    quoteId: q.id,
    quoteNumber: q.number,
    quoteSubject: q.subject ?? null,
    quoteTotalTtc: Number(q.total_ttc ?? 0),
    clientId: q.client_id,
    signerName,
    signedAt: now,
    signedIp: ip,
    cgvVersion: version,
    signatureData,
  }).catch((err) => console.error("[acceptDevis] email error:", err));

  revalidatePath(`/devis/${q.number}`);
  revalidatePath(`/dashboard/devis/${input.quoteId}`);
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function refuseDevis(id: string) {
  const supabase = createAdminClient();
  const { data: q } = await supabase
    .from("quotes")
    .select("id,status,number")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { ok: false as const, error: "Devis introuvable" };
  if (q.status !== "envoye") {
    return { ok: false as const, error: "Devis déjà décidé." };
  }
  const { error } = await supabase
    .from("quotes")
    .update({ status: "refuse", refused_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/devis/${q.number}`);
  revalidatePath(`/dashboard/devis/${id}`);
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/* ─── Acceptance email ─────────────────────────────────────────── */

async function sendAcceptanceEmails(o: {
  quoteId: string;
  quoteNumber: string;
  quoteSubject: string | null;
  quoteTotalTtc: number;
  clientId: string | null;
  signerName: string;
  signedAt: string;
  signedIp: string | null;
  cgvVersion: string;
  signatureData: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "devis@cosmoclub.fr";
  if (!apiKey) {
    console.warn("[acceptDevis] RESEND_API_KEY missing — email skipped.");
    return;
  }

  const supabase = createAdminClient();
  const [{ data: client }, { data: settings }] = await Promise.all([
    o.clientId
      ? supabase
          .from("clients")
          .select("email,first_name,last_name,company_name")
          .eq("id", o.clientId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("settings")
      .select("company_name,email")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const ownerEmail =
    (settings as { email?: string | null } | null)?.email ||
    process.env.DEVIS_TO_EMAIL ||
    "contact@cosmoclub.fr";
  const companyName =
    (settings as { company_name?: string | null } | null)?.company_name ||
    "Cosmo Club Paris";
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "https://cosmo-club.vercel.app";
  const link = `${origin}/devis/${o.quoteNumber}`;

  const dateLabel = new Date(o.signedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const html = buildAcceptanceHtml({
    company: companyName,
    quoteNumber: o.quoteNumber,
    quoteSubject: o.quoteSubject,
    quoteTotalTtc: o.quoteTotalTtc,
    signerName: o.signerName,
    signedAt: dateLabel,
    signedIp: o.signedIp,
    cgvVersion: o.cgvVersion,
    link,
  });

  // Inline the PNG signature as a CID-style attachment for the
  // confirmation receipt.
  const pngBase64 = o.signatureData.replace(
    /^data:image\/png;base64,/,
    "",
  );

  const attachments = [
    {
      filename: `signature-${o.quoteNumber}.png`,
      content: pngBase64,
    },
  ];

  const recipients = [ownerEmail];
  if (client?.email) recipients.unshift(client.email);

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: recipients,
      subject: `Devis ${o.quoteNumber} signé — ${companyName}`,
      html,
      attachments,
    });
  } catch (err) {
    console.error("[acceptDevis] resend error:", err);
  }
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEUR(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}

function buildAcceptanceHtml(o: {
  company: string;
  quoteNumber: string;
  quoteSubject: string | null;
  quoteTotalTtc: number;
  signerName: string;
  signedAt: string;
  signedIp: string | null;
  cgvVersion: string;
  link: string;
}) {
  // Used to silence unused-import warnings — keeps the CGV text close
  // to the email so future tweaks land in one place.
  void CGV_TEXT;

  return `
<!doctype html><html><body style="font-family: ui-sans-serif,system-ui,sans-serif; background:#0a0a0a; color:#e9e2d0; padding:24px;">
  <div style="max-width:640px; margin:0 auto; background:#141311; border:1px solid #3a3733; border-radius:14px; padding:28px;">
    <p style="font-size:11px; letter-spacing:0.28em; text-transform:uppercase; color:#c9a961; margin:0 0 8px;">${escape(o.company)} · Devis signé</p>
    <h1 style="font-family:Georgia,serif; font-size:26px; margin:0 0 16px; color:#f5f1e8;">Devis ${escape(o.quoteNumber)}</h1>

    <p style="font-size:14px; line-height:1.6;">Le devis a été accepté et signé électroniquement.</p>

    <table style="width:100%; border-collapse:collapse; font-size:13px; line-height:1.6; margin-top:16px;">
      ${o.quoteSubject ? `<tr><td style="padding:6px 0; color:#726d63; width:130px;">Objet</td><td>${escape(o.quoteSubject)}</td></tr>` : ""}
      <tr><td style="padding:6px 0; color:#726d63;">Total TTC</td><td><strong>${formatEUR(o.quoteTotalTtc)}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Signataire</td><td>${escape(o.signerName)}</td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Horodatage</td><td>${escape(o.signedAt)}</td></tr>
      ${o.signedIp ? `<tr><td style="padding:6px 0; color:#726d63;">IP</td><td>${escape(o.signedIp)}</td></tr>` : ""}
      <tr><td style="padding:6px 0; color:#726d63;">Version CGV</td><td><code>${escape(o.cgvVersion)}</code></td></tr>
    </table>

    <p style="font-size:13px; line-height:1.6; margin-top:18px;">Le tracé de la signature est joint à ce mail (PNG). Devis et CGV consultables&nbsp;:</p>
    <p style="font-size:13px;"><a href="${o.link}" style="color:#c9a961;">${o.link}</a></p>
  </div>
</body></html>`.trim();
}
