"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { renderToBuffer } from "@react-pdf/renderer";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { cgvVersion } from "@/lib/cgv";
import { SignedQuotePdf, type SignedQuoteData } from "@/lib/pdf/SignedQuotePdf";

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
    .select("id,status,number,client_id,subject,total_ttc,lead_id")
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

  // Mirror on the lead: signed devis = lead won.
  if (q.lead_id) {
    await supabase.from("leads").update({ status: "gagne" }).eq("id", q.lead_id);
    revalidatePath("/dashboard/leads");
    revalidatePath(`/dashboard/leads/${q.lead_id}`);
  }

  // Block on the email step. Earlier we ran it fire-and-forget but
  // Vercel kills the serverless invocation as soon as the server
  // action responds, so the Resend request was being dropped mid-air.
  // Awaiting it adds a couple of seconds to the user-perceived latency
  // but is the only reliable path on Vercel without setting up a
  // queue. Errors inside still don't fail the action — the acceptance
  // is already persisted, the email is best-effort.
  try {
    await sendAcceptanceEmails({
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
    });
  } catch (err) {
    console.error("[acceptDevis] email step failed:", err);
  }

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
    .select("id,status,number,lead_id")
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

  // Mirror on the lead: refused devis = lead lost.
  if (q.lead_id) {
    await supabase.from("leads").update({ status: "perdu" }).eq("id", q.lead_id);
    revalidatePath("/dashboard/leads");
    revalidatePath(`/dashboard/leads/${q.lead_id}`);
  }

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
  // Two env names exist in this project for historical reasons:
  // - DEVIS_FROM_EMAIL is what the contact form (/api/devis) reads
  // - RESEND_FROM_EMAIL is what the dashboard sendDevis flow reads
  // We accept either so the user only needs to set one. If neither is
  // present we fall back to Resend's onboarding sender, which works
  // without a verified domain — useful while the cosmoclub.fr DNS
  // can't be moved off Wix.
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    process.env.DEVIS_FROM_EMAIL ||
    "onboarding@resend.dev";
  if (!apiKey) {
    console.warn("[acceptDevis] RESEND_API_KEY missing — email skipped.");
    return;
  }
  console.log(
    "[acceptDevis] sending emails via",
    fromEmail,
    "for quote",
    o.quoteNumber,
  );

  // Pull everything react-pdf needs in one shot. Failure on any of
  // these is fatal for the PDF (we still send a plain HTML email).
  const supabase = createAdminClient();
  const [
    { data: quote },
    { data: items },
    { data: client },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "number,subject,issue_date,event_date,event_location,guests_count,tva_rate,commission_rate,deposit_rate,total_ht,total_tva,total_ttc,client_id",
      )
      .eq("id", o.quoteId)
      .maybeSingle(),
    supabase
      .from("quote_items")
      .select(
        "section,title,description,qty,unit,unit_price_ht,line_total_ht,discount_ht,position",
      )
      .eq("quote_id", o.quoteId)
      .order("position", { ascending: true }),
    o.clientId
      ? supabase
          .from("clients")
          .select("email,first_name,last_name,company_name,phone")
          .eq("id", o.clientId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("settings")
      .select(
        "company_name,email,phone,address_line1,address_line2,postal_code,city,siret",
      )
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
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.cosmoclub.fr";
  const link = `${origin}/devis/${o.quoteNumber}`;

  const dateLabel = new Date(o.signedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  // ─── Build the signed PDF (best-effort) ──────────────────────
  let pdfBase64: string | null = null;
  if (quote && items) {
    try {
      const pdfData: SignedQuoteData = {
        quote: {
          number: quote.number,
          subject: quote.subject,
          issue_date: quote.issue_date,
          event_date: quote.event_date,
          event_location: quote.event_location,
          guests_count: quote.guests_count,
          tva_rate: Number(quote.tva_rate ?? 20),
          commission_rate: Number(quote.commission_rate ?? 0),
          total_ht: Number(quote.total_ht ?? 0),
          total_tva: Number(quote.total_tva ?? 0),
          total_ttc: Number(quote.total_ttc ?? 0),
        },
        items: (items ?? []).map((it) => {
          // Apply the gross-up at PDF render time so the signed
          // document matches what the client saw on the public page.
          const rate = Number(quote.commission_rate ?? 0);
          const factor = rate > 0 ? 100 / (100 - rate) : 1;
          const discount = Number(
            (it as { discount_ht?: number | null }).discount_ht ?? 0,
          );
          return {
            section: it.section,
            title: it.title,
            description: it.description,
            qty: Number(it.qty ?? 0),
            unit: it.unit,
            unit_price_ht: Number(it.unit_price_ht ?? 0) * factor,
            line_total_ht: Number(it.line_total_ht ?? 0) * factor,
            discount_ht: discount * factor,
          };
        }),
        client: client
          ? {
              company_name: client.company_name,
              first_name: client.first_name,
              last_name: client.last_name,
              email: client.email,
              phone: (client as { phone?: string | null }).phone ?? null,
            }
          : null,
        company: {
          name: companyName,
          address_line1:
            (settings as { address_line1?: string | null } | null)
              ?.address_line1 ?? null,
          address_line2:
            (settings as { address_line2?: string | null } | null)
              ?.address_line2 ?? null,
          postal_code:
            (settings as { postal_code?: string | null } | null)
              ?.postal_code ?? null,
          city:
            (settings as { city?: string | null } | null)?.city ?? null,
          siret:
            (settings as { siret?: string | null } | null)?.siret ?? null,
          email:
            (settings as { email?: string | null } | null)?.email ?? null,
          phone:
            (settings as { phone?: string | null } | null)?.phone ?? null,
        },
        signature: {
          name: o.signerName,
          signedAt: o.signedAt,
          ip: o.signedIp,
          cgvVersion: o.cgvVersion,
          pngDataUrl: o.signatureData,
        },
      };
      const buffer = await renderToBuffer(<SignedQuotePdf data={pdfData} />);
      pdfBase64 = buffer.toString("base64");
    } catch (err) {
      console.error("[acceptDevis] PDF generation failed:", err);
    }
  }

  const baseAttachments = pdfBase64
    ? [
        {
          filename: `devis-${o.quoteNumber}-signe.pdf`,
          content: pdfBase64,
        },
      ]
    : [];

  // ─── Two distinct emails: one to the client, one to Cosmo ──
  const resend = new Resend(apiKey);

  // Per-quote acompte rate (fraction 0..1 → integer percent).
  const depositPct = Math.round(
    Math.min(1, Math.max(0, Number(quote?.deposit_rate ?? 0.3))) * 100,
  );

  // 1. Client confirmation
  if (client?.email) {
    try {
      const res = await resend.emails.send({
        from: `${companyName} <${fromEmail}>`,
        to: [client.email],
        subject: `Confirmation — devis ${o.quoteNumber} signé`,
        html: buildClientHtml({
          company: companyName,
          quoteNumber: o.quoteNumber,
          quoteSubject: o.quoteSubject,
          quoteTotalTtc: o.quoteTotalTtc,
          signerName: o.signerName,
          signedAt: dateLabel,
          link,
          firstName: client.first_name ?? null,
          hasPdf: !!pdfBase64,
          depositPct,
        }),
        attachments: baseAttachments,
      });
      if ((res as { error?: unknown }).error) {
        console.error(
          "[acceptDevis] client email error from Resend:",
          (res as { error: unknown }).error,
        );
      } else {
        console.log("[acceptDevis] client email sent to", client.email);
      }
    } catch (err) {
      console.error("[acceptDevis] client email threw:", err);
    }
  } else {
    console.warn(
      "[acceptDevis] no client email on file — only owner will be notified.",
    );
  }

  // 2. Owner notification (Cosmo)
  try {
    const res = await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [ownerEmail],
      replyTo: client?.email ?? undefined,
      subject: `Devis ${o.quoteNumber} signé — ${o.signerName}`,
      html: buildOwnerHtml({
        company: companyName,
        quoteNumber: o.quoteNumber,
        quoteSubject: o.quoteSubject,
        quoteTotalTtc: o.quoteTotalTtc,
        signerName: o.signerName,
        signedAt: dateLabel,
        signedIp: o.signedIp,
        cgvVersion: o.cgvVersion,
        link,
        clientEmail: client?.email ?? null,
        clientPhone:
          (client as { phone?: string | null } | null)?.phone ?? null,
        depositPct,
      }),
      attachments: baseAttachments,
    });
    if ((res as { error?: unknown }).error) {
      console.error(
        "[acceptDevis] owner email error from Resend:",
        (res as { error: unknown }).error,
      );
    } else {
      console.log("[acceptDevis] owner email sent to", ownerEmail);
    }
  } catch (err) {
    console.error("[acceptDevis] owner email threw:", err);
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

function buildClientHtml(o: {
  company: string;
  quoteNumber: string;
  quoteSubject: string | null;
  quoteTotalTtc: number;
  signerName: string;
  signedAt: string;
  link: string;
  firstName: string | null;
  hasPdf: boolean;
  depositPct: number;
}) {
  const greeting = o.firstName ? `Bonjour ${escape(o.firstName)},` : "Bonjour,";
  return `
<!doctype html><html><body style="font-family: ui-sans-serif,system-ui,sans-serif; background:#0a0a0a; color:#e9e2d0; padding:24px;">
  <div style="max-width:640px; margin:0 auto; background:#141311; border:1px solid #3a3733; border-radius:14px; padding:28px;">
    <p style="font-size:11px; letter-spacing:0.28em; text-transform:uppercase; color:#c9a961; margin:0 0 8px;">${escape(o.company)} · Confirmation</p>
    <h1 style="font-family:Georgia,serif; font-size:26px; margin:0 0 16px; color:#f5f1e8;">Devis ${escape(o.quoteNumber)} signé</h1>

    <p style="font-size:14px; line-height:1.6;">${greeting}</p>
    <p style="font-size:14px; line-height:1.6;">
      Nous accusons réception de votre signature électronique sur le devis
      <strong>${escape(o.quoteNumber)}</strong>${o.quoteSubject ? ` — ${escape(o.quoteSubject)}` : ""}.
      ${o.hasPdf ? "Vous trouverez en pièce jointe le PDF du devis signé, accompagné des CGV en page&nbsp;2." : "Une copie écrite vous parviendra sous peu."}
    </p>

    <table style="width:100%; border-collapse:collapse; font-size:13px; line-height:1.6; margin-top:16px;">
      <tr><td style="padding:6px 0; color:#726d63; width:130px;">Total TTC</td><td><strong>${formatEUR(o.quoteTotalTtc)}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Signataire</td><td>${escape(o.signerName)}</td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Horodatage</td><td>${escape(o.signedAt)}</td></tr>
    </table>

    <p style="font-size:13px; line-height:1.6; margin-top:18px;">
      Prochaine étape&nbsp;: notre équipe revient vers vous pour le règlement
      de l&apos;acompte (${o.depositPct}&nbsp;%) et le calage final.
    </p>
    <p style="font-size:13px;">Plaquette consultable en ligne&nbsp;: <a href="${o.link}" style="color:#c9a961;">${o.link}</a></p>

    <p style="font-size:12px; line-height:1.6; color:#726d63; margin-top:24px;">
      Conditions générales de vente disponibles à tout moment sur notre site,
      onglet « CGV ». Conformément à l&apos;article 1366 du Code civil, votre
      signature électronique a la même force probante qu&apos;une signature manuscrite.
    </p>
  </div>
</body></html>`.trim();
}

function buildOwnerHtml(o: {
  company: string;
  quoteNumber: string;
  quoteSubject: string | null;
  quoteTotalTtc: number;
  signerName: string;
  signedAt: string;
  signedIp: string | null;
  cgvVersion: string;
  link: string;
  clientEmail: string | null;
  clientPhone: string | null;
  depositPct: number;
}) {
  return `
<!doctype html><html><body style="font-family: ui-sans-serif,system-ui,sans-serif; background:#0a0a0a; color:#e9e2d0; padding:24px;">
  <div style="max-width:640px; margin:0 auto; background:#141311; border:1px solid #3a3733; border-radius:14px; padding:28px;">
    <p style="font-size:11px; letter-spacing:0.28em; text-transform:uppercase; color:#c9a961; margin:0 0 8px;">Devis signé · à traiter</p>
    <h1 style="font-family:Georgia,serif; font-size:26px; margin:0 0 16px; color:#f5f1e8;">${escape(o.quoteNumber)}</h1>

    <p style="font-size:14px; line-height:1.6;">
      <strong>${escape(o.signerName)}</strong> vient de signer le devis
      ${o.quoteSubject ? `<em>${escape(o.quoteSubject)}</em>` : ""} pour
      <strong>${formatEUR(o.quoteTotalTtc)}</strong> TTC.
    </p>
    <p style="font-size:14px; line-height:1.6;">
      Action&nbsp;: déclencher la demande d&apos;acompte (${o.depositPct}&nbsp;%) et caler
      la prestation.
    </p>

    <table style="width:100%; border-collapse:collapse; font-size:13px; line-height:1.6; margin-top:16px;">
      <tr><td style="padding:6px 0; color:#726d63; width:130px;">Signataire</td><td>${escape(o.signerName)}</td></tr>
      ${o.clientEmail ? `<tr><td style="padding:6px 0; color:#726d63;">Email</td><td><a href="mailto:${escape(o.clientEmail)}" style="color:#c9a961;">${escape(o.clientEmail)}</a></td></tr>` : ""}
      ${o.clientPhone ? `<tr><td style="padding:6px 0; color:#726d63;">Téléphone</td><td>${escape(o.clientPhone)}</td></tr>` : ""}
      <tr><td style="padding:6px 0; color:#726d63;">Total TTC</td><td><strong>${formatEUR(o.quoteTotalTtc)}</strong></td></tr>
      <tr><td style="padding:6px 0; color:#726d63;">Horodatage</td><td>${escape(o.signedAt)}</td></tr>
      ${o.signedIp ? `<tr><td style="padding:6px 0; color:#726d63;">IP</td><td>${escape(o.signedIp)}</td></tr>` : ""}
      <tr><td style="padding:6px 0; color:#726d63;">Version CGV</td><td><code>${escape(o.cgvVersion)}</code></td></tr>
    </table>

    <p style="font-size:13px; line-height:1.6; margin-top:18px;">
      PDF signé en pièce jointe (devis + CGV reproduites). Plaquette publique&nbsp;:
      <a href="${o.link}" style="color:#c9a961;">${o.link}</a>
    </p>
  </div>
</body></html>`.trim();
}
