"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/auth/server";
import { normalizeGoogleReviewUrl } from "@/lib/reviewUrl";
import { clientBlock, REMIND_AFTER_DAYS } from "@/lib/reviewFollowup";
import { formatDateFR } from "@/lib/format";
import { site } from "@/lib/site";
import { buildReviewEmail, buildReviewReminderEmail } from "./email";

const ALLOWED = ["owner", "admin", "manager"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
/** Garde-fou anti double-clic / double onglet : un envoi par 24 h. */
const MIN_INTERVAL_MS = 24 * 3600 * 1000;

/** Lien de l'e-mail : passe par /avis/<jeton>, qui note le clic puis redirige vers Google. */
const reviewLink = (token: string) => `${site.url}/avis/${token}`;

type Result = { ok: true; sentTo: string } | { ok: false; error: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const EVENT_COLS =
  "id,date,status,client_id,review_requested_at,review_requested_by,review_reminded_at,review_received_at,review_token";

/** Vérifications communes : rôle, session, événement passé, client avec e-mail. */
async function loadEvent(eventId: string) {
  const role = await getCurrentRole();
  if (!role || !(ALLOWED as readonly string[]).includes(role)) {
    return { error: "Accès refusé." } as const;
  }
  if (!UUID_RE.test(eventId)) return { error: "Événement introuvable." } as const;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." } as const;

  const { data: ev, error: evError } = await supabase
    .from("events")
    .select(EVENT_COLS)
    .eq("id", eventId)
    .maybeSingle();
  if (evError?.message.includes("review_")) {
    return { error: "Base pas à jour : applique la migration 2026-10-28_review_followup.sql." } as const;
  }
  if (evError || !ev) return { error: "Événement introuvable." } as const;

  const today = new Date().toISOString().slice(0, 10);
  if (ev.status === "annule") return { error: "Événement annulé." } as const;
  if (ev.date >= today) return { error: "L'événement n'a pas encore eu lieu." } as const;
  if (!ev.client_id) return { error: "Aucun client rattaché à cet événement." } as const;

  return { supabase, user, ev, clientId: ev.client_id } as const;
}

/** Destinataire et lien Google, lus juste avant un envoi. */
async function loadRecipient(supabase: Supabase, clientId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY)." } as const;

  const { data: client } = await supabase
    .from("clients")
    .select("first_name,email")
    .eq("id", clientId)
    .maybeSingle();
  const to = (client?.email ?? "").trim();
  if (!EMAIL_RE.test(to)) return { error: "Le client n'a pas d'e-mail valide." } as const;

  // Les managers n'ont pas accès à settings par RLS : lecture via la clé de
  // service, après la vérification de rôle. Seul ce champ est lu.
  const { data: settings } = await createAdminClient()
    .from("settings")
    .select("google_review_url")
    .eq("id", 1)
    .maybeSingle();
  if (!normalizeGoogleReviewUrl(settings?.google_review_url)) {
    return { error: "Renseigne d'abord le lien d'avis Google dans Paramètres." } as const;
  }
  return { apiKey, to, firstName: client?.first_name ?? null } as const;
}

async function deliver(apiKey: string, to: string, mail: { subject: string; text: string; html: string }) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "devis@cosmoclub.fr";
  const { error } = await new Resend(apiKey).emails.send({
    from: `Cosmo Club Paris <${fromEmail}>`,
    to: [to],
    replyTo: site.email,
    ...mail,
  });
  if (error) throw new Error(error.message);
}

/**
 * Envoie la demande d'avis Google au client d'un événement passé.
 * Déclenché à la main depuis /dashboard/avis (un bouton par ligne).
 *
 * Refuse si le client a déjà laissé un avis ou reçu une demande depuis
 * moins de 12 mois sur un autre événement, sauf `force` (bouton
 * « Envoyer quand même », confirmé). L'événement est « réservé » par une
 * mise à jour conditionnelle avant l'envoi, pour qu'un double clic ne
 * parte pas deux fois ; si Resend échoue, on remet l'ancienne valeur.
 */
export async function sendReviewRequest(eventId: string, force = false): Promise<Result> {
  const ctx = await loadEvent(eventId);
  if (ctx.error) return { ok: false, error: ctx.error };
  const { supabase, user, ev, clientId } = ctx;
  if (ev.review_received_at) return { ok: false, error: "L'avis est déjà marqué comme reçu." };

  if (!force) {
    const { data: history } = await supabase
      .from("events")
      .select("id,client_id,review_requested_at,review_reminded_at,review_received_at")
      .eq("client_id", clientId);
    const block = clientBlock(ev.id, history ?? [], Date.now());
    if (block) {
      return {
        ok: false,
        error:
          block.reason === "reviewed"
            ? "Ce client a déjà laissé un avis."
            : `Ce client a déjà reçu une demande le ${formatDateFR(block.at)}.`,
      };
    }
  }

  const rcpt = await loadRecipient(supabase, clientId);
  if (rcpt.error) return { ok: false, error: rcpt.error };

  // Réservation atomique : ne passe que si rien n'a été envoyé depuis 24 h.
  const previous = ev.review_requested_at;
  const previousBy = ev.review_requested_by;
  const now = new Date();
  const cutoff = new Date(now.getTime() - MIN_INTERVAL_MS).toISOString();
  let claim = supabase
    .from("events")
    .update({ review_requested_at: now.toISOString(), review_requested_by: user.id })
    .eq("id", eventId);
  claim = previous
    ? claim.eq("review_requested_at", previous).lt("review_requested_at", cutoff)
    : claim.is("review_requested_at", null);
  const { data: claimed, error: claimError } = await claim.select("id");
  if (claimError) return { ok: false, error: claimError.message };
  if (!claimed || claimed.length === 0) {
    return { ok: false, error: "Une demande est déjà partie il y a moins de 24 h." };
  }

  try {
    await deliver(
      rcpt.apiKey,
      rcpt.to,
      buildReviewEmail({ firstName: rcpt.firstName, eventDate: ev.date, reviewUrl: reviewLink(ev.review_token) }),
    );
  } catch (err) {
    await supabase
      .from("events")
      .update({ review_requested_at: previous, review_requested_by: previousBy })
      .eq("id", eventId);
    console.error("[sendReviewRequest] failed:", err);
    return { ok: false, error: "L'e-mail n'a pas pu partir. Réessaie dans un instant." };
  }

  revalidatePath("/dashboard/avis");
  return { ok: true, sentTo: rcpt.to };
}

/**
 * Relance unique, au moins 7 jours après la demande, tant que l'avis
 * n'est pas marqué comme reçu. Même réservation atomique que la demande.
 */
export async function sendReviewReminder(eventId: string): Promise<Result> {
  const ctx = await loadEvent(eventId);
  if (ctx.error) return { ok: false, error: ctx.error };
  const { supabase, user, ev, clientId } = ctx;
  if (!ev.review_requested_at) return { ok: false, error: "Aucune demande n'a encore été envoyée." };
  if (ev.review_received_at) return { ok: false, error: "L'avis est déjà marqué comme reçu." };
  if (ev.review_reminded_at) return { ok: false, error: "La relance est déjà partie." };

  const rcpt = await loadRecipient(supabase, clientId);
  if (rcpt.error) return { ok: false, error: rcpt.error };

  const cutoff = new Date(Date.now() - REMIND_AFTER_DAYS * 86400000).toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("events")
    .update({ review_reminded_at: new Date().toISOString(), review_reminded_by: user.id })
    .eq("id", eventId)
    .is("review_reminded_at", null)
    .is("review_received_at", null)
    .lte("review_requested_at", cutoff)
    .select("id");
  if (claimError) return { ok: false, error: claimError.message };
  if (!claimed || claimed.length === 0) {
    return { ok: false, error: `La relance est possible ${REMIND_AFTER_DAYS} jours après la demande.` };
  }

  try {
    await deliver(
      rcpt.apiKey,
      rcpt.to,
      buildReviewReminderEmail({ firstName: rcpt.firstName, reviewUrl: reviewLink(ev.review_token) }),
    );
  } catch (err) {
    await supabase
      .from("events")
      .update({ review_reminded_at: null, review_reminded_by: null })
      .eq("id", eventId);
    console.error("[sendReviewReminder] failed:", err);
    return { ok: false, error: "L'e-mail n'a pas pu partir. Réessaie dans un instant." };
  }

  revalidatePath("/dashboard/avis");
  return { ok: true, sentTo: rcpt.to };
}

/**
 * « Avis reçu », coché à la main quand l'avis apparaît sur Google (Google
 * ne dit pas qui l'a laissé). `received = false` annule une erreur.
 */
export async function markReviewReceived(
  eventId: string,
  received: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadEvent(eventId);
  if (ctx.error) return { ok: false, error: ctx.error };
  const { supabase, user } = ctx;

  const { error } = await supabase
    .from("events")
    .update(
      received
        ? { review_received_at: new Date().toISOString(), review_received_by: user.id }
        : { review_received_at: null, review_received_by: null },
    )
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/avis");
  revalidatePath("/dashboard/visibilite");
  return { ok: true };
}
