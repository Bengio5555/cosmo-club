"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/auth/server";
import { normalizeGoogleReviewUrl } from "@/lib/reviewUrl";
import { site } from "@/lib/site";
import { buildReviewEmail } from "./email";

const ALLOWED = ["owner", "admin", "manager"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
/** Garde-fou anti double-clic / double onglet : un envoi par 24 h. */
const MIN_INTERVAL_MS = 24 * 3600 * 1000;

type Result = { ok: true; sentTo: string } | { ok: false; error: string };

/**
 * Envoie la demande d'avis Google au client d'un événement passé.
 * Déclenché à la main depuis /dashboard/avis (un bouton par ligne).
 *
 * L'événement est « réservé » par une mise à jour conditionnelle avant
 * l'envoi, pour qu'un double clic ne parte pas deux fois ; si Resend
 * échoue, on remet l'ancienne valeur.
 */
export async function sendReviewRequest(eventId: string): Promise<Result> {
  const role = await getCurrentRole();
  if (!role || !(ALLOWED as readonly string[]).includes(role)) {
    return { ok: false, error: "Accès refusé." };
  }
  if (!UUID_RE.test(eventId)) return { ok: false, error: "Événement introuvable." };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "L'envoi d'e-mails n'est pas configuré (RESEND_API_KEY)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expirée." };

  const { data: ev, error: evError } = await supabase
    .from("events")
    .select("id,date,status,client_id,review_requested_at,review_requested_by")
    .eq("id", eventId)
    .maybeSingle();
  if (evError || !ev) return { ok: false, error: "Événement introuvable." };

  const today = new Date().toISOString().slice(0, 10);
  if (ev.status === "annule") return { ok: false, error: "Événement annulé." };
  if (ev.date >= today) return { ok: false, error: "L'événement n'a pas encore eu lieu." };
  if (!ev.client_id) return { ok: false, error: "Aucun client rattaché à cet événement." };

  const { data: client } = await supabase
    .from("clients")
    .select("first_name,email")
    .eq("id", ev.client_id)
    .maybeSingle();
  const to = (client?.email ?? "").trim();
  if (!EMAIL_RE.test(to)) return { ok: false, error: "Le client n'a pas d'e-mail valide." };

  // Les managers n'ont pas accès à settings par RLS : lecture via la clé de
  // service, après la vérification de rôle ci-dessus. Seul ce champ est lu.
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("settings")
    .select("google_review_url")
    .eq("id", 1)
    .maybeSingle();
  const reviewUrl = normalizeGoogleReviewUrl(settings?.google_review_url);
  if (!reviewUrl) return { ok: false, error: "Renseigne d'abord le lien d'avis Google dans Paramètres." };

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

  const { subject, text, html } = buildReviewEmail({
    firstName: client?.first_name ?? null,
    eventDate: ev.date,
    reviewUrl,
  });
  const fromEmail = process.env.RESEND_FROM_EMAIL || "devis@cosmoclub.fr";

  try {
    const resend = new Resend(apiKey);
    const { error: sendError } = await resend.emails.send({
      from: `Cosmo Club Paris <${fromEmail}>`,
      to: [to],
      replyTo: site.email,
      subject,
      text,
      html,
    });
    if (sendError) throw new Error(sendError.message);
  } catch (err) {
    await supabase
      .from("events")
      .update({ review_requested_at: previous, review_requested_by: previousBy })
      .eq("id", eventId);
    console.error("[sendReviewRequest] failed:", err);
    return { ok: false, error: "L'e-mail n'a pas pu partir. Réessaie dans un instant." };
  }

  revalidatePath("/dashboard/avis");
  return { ok: true, sentTo: to };
}
