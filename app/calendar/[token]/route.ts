import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildIcs,
  combineEventDateTime,
  type IcsEvent,
} from "@/lib/calendar/ics";

export const runtime = "nodejs";
// Calendar clients re-fetch on their own schedule; we let the platform
// stream a fresh build each time so the data matches the dashboard.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  a_venir: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};

/**
 * Public iCalendar feed. The `[token]` path segment is the only gate —
 * regenerating it in Settings invalidates the previous URL. Any
 * request with a wrong/empty token returns 404 (we don't surface
 * "exists but unauthorized" — keeps the surface minimal).
 *
 * Returns up to 200 events centered around now (90 days back, 365
 * forward) so the feed stays small even after years of history.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("calendar_token,company_name")
    .eq("id", 1)
    .maybeSingle();

  // Constant-time-ish compare to avoid leaking length info via timing.
  if (!settings?.calendar_token || !safeEqual(settings.calendar_token, token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const now = new Date();
  const from = new Date(now.getTime() - 90 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const to = new Date(now.getTime() + 365 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: events } = await supabase
    .from("events")
    .select(
      "id,title,date,start_time,end_time,location,status,guests_count,briefing,client_id,updated_at",
    )
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true })
    .limit(200);

  // Resolve client display names in one extra query so the calendar
  // entries are self-explanatory.
  const clientIds = Array.from(
    new Set(
      (events ?? [])
        .map((e) => e.client_id)
        .filter((x): x is string => !!x),
    ),
  );
  const { data: clients } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id,first_name,last_name,company_name,email")
        .in("id", clientIds)
    : { data: [] };
  const clientLabel = new Map<string, string>();
  for (const c of clients ?? []) {
    clientLabel.set(
      c.id,
      c.company_name ||
        [c.first_name, c.last_name].filter(Boolean).join(" ") ||
        c.email ||
        "—",
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "https://cosmo-club.vercel.app";

  const icsEvents: IcsEvent[] = (events ?? []).map((e) => {
    // Defaults: 18:00 → end of day if no times set. Most prestations
    // start in the evening so the fallback skews late.
    const start = combineEventDateTime(e.date, e.start_time, {
      hour: 18,
      minute: 0,
    });
    const end = combineEventDateTime(e.date, e.end_time, {
      hour: 23,
      minute: 59,
    });
    const descriptionParts: string[] = [];
    if (e.client_id && clientLabel.has(e.client_id)) {
      descriptionParts.push(`Client : ${clientLabel.get(e.client_id)}`);
    }
    if (e.guests_count) {
      descriptionParts.push(`${e.guests_count} invités`);
    }
    if (e.briefing) {
      descriptionParts.push("");
      descriptionParts.push(e.briefing);
    }
    descriptionParts.push("");
    descriptionParts.push(
      `Statut : ${STATUS_LABEL[e.status] ?? e.status}`,
    );
    descriptionParts.push(`${origin}/dashboard/events/${e.id}`);

    return {
      uid: `event-${e.id}@cosmo-club`,
      title: e.title,
      start,
      end,
      location: e.location,
      description: descriptionParts.join("\n"),
      status: e.status === "annule" ? "CANCELLED" : "CONFIRMED",
      url: `${origin}/dashboard/events/${e.id}`,
      lastModified: e.updated_at ? new Date(e.updated_at) : null,
    };
  });

  const ics = buildIcs({
    calendarName: settings.company_name || "Cosmo Club",
    events: icsEvents,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cosmo-club.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
