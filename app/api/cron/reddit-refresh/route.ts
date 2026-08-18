import { NextRequest, NextResponse } from "next/server";
import { refreshRedditFeed } from "@/app/dashboard/(shell)/reddit/actions";

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
  return NextResponse.json(result);
}
