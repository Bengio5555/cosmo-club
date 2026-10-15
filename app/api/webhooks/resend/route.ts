import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Resend, type WebhookEventPayload } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUOTE_EMAIL_TAG } from "@/lib/quoteEmail";
import { notifyQuoteEmailProblem } from "@/lib/server/notifyQuoteEmailProblem";

export const runtime = "nodejs";

// Resend email events are a few KB; anything far bigger is not one.
const MAX_BODY_BYTES = 64 * 1024;
// A quote email row is written right after Resend accepts the send; an
// event for an unknown devis email younger than this is retried by Resend
// (non-2xx) instead of being dropped.
const RETRY_WINDOW_MS = 10 * 60 * 1000;

type Column =
  | "sent_at"
  | "delivered_at"
  | "delayed_at"
  | "opened_at"
  | "bounced_at"
  | "complained_at"
  | "failed_at";

/**
 * Webhook Resend → suivi de remise des e-mails de devis (quote_emails).
 *
 * Public (hors du matcher du proxy, qui ne couvre que /dashboard), mais
 * rien n'est lu ni écrit sans signature svix valide (RESEND_WEBHOOK_SECRET).
 * svix rejette aussi les horodatages de plus de 5 minutes (anti-rejeu) ;
 * un rejeu dans la fenêtre est sans effet, chaque colonne n'étant posée
 * qu'une fois.
 */
export async function POST(request: Request) {
  // Fail closed: without the secret no event can be authenticated.
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  const payload = await request.text();
  if (payload.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let event: WebhookEventPayload;
  try {
    // verify() never calls the API; the key is only required by the
    // constructor.
    const resend = new Resend(process.env.RESEND_API_KEY || "re_verify_only");
    event = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    });
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const update = columnFor(event);
  if (!update) return NextResponse.json({ ignored: event.type });
  const data = event.data as { email_id?: unknown; tags?: unknown };
  const emailId = typeof data.email_id === "string" ? data.email_id : null;
  if (!emailId) return NextResponse.json({ ignored: "no email id" });

  const at = validIso(event.created_at) ?? new Date().toISOString();
  const admin = createAdminClient();

  const { data: row, error: findErr } = await admin
    .from("quote_emails")
    .select("id,quote_id,recipient")
    .eq("resend_email_id", emailId)
    .maybeSingle();
  if (findErr) {
    console.error("[resend-webhook] lookup failed:", findErr.message);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
  if (!row) {
    // Not a quote email (invoice, notification…) → acknowledge and drop.
    // A fresh quote email whose row isn't written yet → ask for a retry.
    const isQuote = hasQuoteTag(data.tags);
    const fresh = Date.now() - new Date(at).getTime() < RETRY_WINDOW_MS;
    if (isQuote && fresh) {
      return NextResponse.json({ retry: true }, { status: 409 });
    }
    return NextResponse.json({ ignored: "unknown email" });
  }

  // First event of each kind wins: .is(null) makes retries/replays no-ops.
  const { data: changed, error: upErr } = await admin
    .from("quote_emails")
    .update({
      [update.column]: at,
      ...(update.detail ? { problem_detail: update.detail.slice(0, 500) } : {}),
    })
    .eq("id", row.id)
    .is(update.column, null)
    .select("id");
  if (upErr) {
    console.error("[resend-webhook] update failed:", upErr.message);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  if (changed && changed.length > 0) {
    revalidatePath("/dashboard/devis");
    revalidatePath(`/dashboard/devis/${row.quote_id}`);
    if (update.problem) {
      await notifyQuoteEmailProblem({
        quoteId: row.quote_id,
        recipient: row.recipient,
        kind: update.problem,
        detail: update.detail,
      });
    }
  }
  return NextResponse.json({ ok: true });
}

function columnFor(event: WebhookEventPayload): {
  column: Column;
  detail?: string;
  problem?: "bounced" | "complained" | "failed";
} | null {
  switch (event.type) {
    case "email.sent":
      return { column: "sent_at" };
    case "email.delivered":
      return { column: "delivered_at" };
    case "email.delivery_delayed":
      return { column: "delayed_at" };
    case "email.opened":
      return { column: "opened_at" };
    case "email.bounced":
      return {
        column: "bounced_at",
        detail: event.data.bounce?.message || "Adresse refusée",
        problem: "bounced",
      };
    case "email.suppressed":
      return {
        column: "bounced_at",
        detail:
          "Adresse bloquée par Resend suite à un rebond ou une plainte précédente" +
          (event.data.suppressed?.message ? ` (${event.data.suppressed.message})` : ""),
        problem: "bounced",
      };
    case "email.complained":
      return { column: "complained_at", problem: "complained" };
    case "email.failed":
      return {
        column: "failed_at",
        detail: event.data.failed?.reason || "Échec d'envoi",
        problem: "failed",
      };
    default:
      return null;
  }
}

/** Resend sends tags as an object; older payloads used [{name,value}]. */
function hasQuoteTag(tags: unknown): boolean {
  const { name, value } = QUOTE_EMAIL_TAG;
  if (Array.isArray(tags)) {
    return tags.some(
      (t) => t && typeof t === "object" && t.name === name && t.value === value,
    );
  }
  return (
    !!tags &&
    typeof tags === "object" &&
    (tags as Record<string, unknown>)[name] === value
  );
}

function validIso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
