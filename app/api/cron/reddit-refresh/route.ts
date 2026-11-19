import { NextRequest, NextResponse } from "next/server";
import { refreshRedditFeed } from "@/app/dashboard/(shell)/reddit/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { runStaffCompliance } from "@/lib/server/staffCompliance";

export const runtime = "nodejs";
// Reddit sweep + Claude drafting peut prendre 60-90 s sur un sweep
// large, donc on déborde le défaut Vercel (10 s sur le plan Hobby).
// 300 s = max plan Hobby. Si on migre vers Pro on peut monter.
export const maxDuration = 300;

/**
 * Vercel Cron endpoint : déclenché chaque lundi à 09:00 UTC (voir
 * vercel.json). Auth via le header `Authorization: Bearer <CRON_SECRET>`
 * que Vercel injecte automatiquement. En dev, sans secret configuré,
 * on accepte aussi les appels manuels.
 */
export async function GET(req: NextRequest) {
  // Fail closed: without CRON_SECRET configured, this paid + admin-write
  // endpoint would be world-triggerable, so we refuse rather than run.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await refreshRedditFeed({ cron: true });

  // Le plan Vercel gratuit limite à 2 crons : la conformité URSSAF des
  // indépendants (SIRET + demandes/relances) profite de ce passage du
  // lundi. Indépendante de Reddit : une erreur ici ne casse rien d'autre.
  let compliance: unknown = null;
  try {
    compliance = await runStaffCompliance(createAdminClient());
  } catch (err) {
    console.error("[cron] staff compliance failed:", err);
    compliance = { error: String(err) };
  }
  return NextResponse.json({ ...result, compliance });
}
