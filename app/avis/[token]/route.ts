import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeGoogleReviewUrl } from "@/lib/reviewUrl";
import { isHumanClick, REVIEW_TOKEN_RE } from "@/lib/reviewFollowup";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Lien « Laisser un avis » des e-mails de demande et de relance. Note le
 * premier clic d'une personne sur l'événement, puis redirige vers la fiche
 * Google configurée dans Paramètres : jamais vers une adresse reçue dans
 * la requête. Un jeton inconnu redirige quand même, sans rien noter.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("settings")
    .select("google_review_url")
    .eq("id", 1)
    .maybeSingle();
  const target = normalizeGoogleReviewUrl(settings?.google_review_url) ?? site.url;

  if (REVIEW_TOKEN_RE.test(token)) {
    const { data: ev } = await admin
      .from("events")
      .select("id,review_requested_at,review_reminded_at,review_clicked_at")
      .eq("review_token", token)
      .maybeSingle();
    const lastSent = ev?.review_reminded_at ?? ev?.review_requested_at ?? null;
    if (ev && !ev.review_clicked_at && lastSent && isHumanClick(req.headers.get("user-agent"), lastSent, Date.now())) {
      await admin
        .from("events")
        .update({ review_clicked_at: new Date().toISOString() })
        .eq("id", ev.id)
        .is("review_clicked_at", null);
    }
  }

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
