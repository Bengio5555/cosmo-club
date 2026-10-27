import { NextRequest, NextResponse } from "next/server";
import { runGeoVisibility } from "@/lib/server/geoVisibility";

export const runtime = "nodejs";
// 24 questions avec recherche web, 6 en parallèle : 1 à 3 minutes.
export const maxDuration = 300;

/**
 * Vercel Cron : chaque lundi à 06:00 UTC (voir vercel.json). Même garde
 * que reddit-refresh : sans CRON_SECRET l'endpoint (payant, écriture en
 * base) refuse de tourner plutôt que d'être déclenchable par n'importe qui.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await runGeoVisibility();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
