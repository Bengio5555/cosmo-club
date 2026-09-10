"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/server";
import type { Database, TablesUpdate } from "@/types/database";
import type { EventTodoData } from "@/lib/server/eventTodoTemplate";
import { parseExtraCosts, type EventExtraCosts } from "@/lib/extraCosts";
import { isHalfStep, roundToHalf, HALF_STEP_ERROR } from "@/lib/stock";
import { notifyTeamEventCreated } from "@/lib/server/notifyEventCreated";
import {
  emptyBriefing,
  type BriefingData,
  type BriefingScheduleStep,
} from "@/lib/server/briefingPreset";

type EventStatus = Database["public"]["Enums"]["event_status"];
type EventUpdate = TablesUpdate<"events">;
type EventStaffUpdate = TablesUpdate<"event_staff">;

export type EventInput = {
  title: string;
  date: string; // YYYY-MM-DD (start)
  end_date: string | null; // YYYY-MM-DD — multi-day events; null = single day
  start_time: string | null; // HH:MM
  end_time: string | null;
  duration_hours: number | null;
  location: string | null;
  guests_count: number | null;
  briefing: string | null;
  client_id: string | null;
  quote_id: string | null;
};

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

/**
 * Create a blank event from the dashboard (not from a quote).
 * Seeded in `a_venir` status.
 */
export async function saveNewEvent(input: EventInput) {
  const supabase = await createClient();
  if (!input.title.trim() || !input.date) {
    return { ok: false as const, error: "Titre et date requis." };
  }
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: input.title.trim(),
      date: input.date,
      end_date:
        input.end_date && input.end_date > input.date ? input.end_date : null,
      start_time: clean(input.start_time),
      end_time: clean(input.end_time),
      duration_hours: input.duration_hours,
      location: clean(input.location),
      guests_count: input.guests_count,
      briefing: clean(input.briefing),
      client_id: input.client_id,
      quote_id: input.quote_id,
      status: "a_venir",
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Création échouée" };
  }
  // Notify the Équipe (best-effort, non-blocking).
  await notifyTeamEventCreated({
    id: data.id,
    title: input.title.trim(),
    date: input.date,
    end_date:
      input.end_date && input.end_date > input.date ? input.end_date : null,
    start_time: clean(input.start_time),
    end_time: clean(input.end_time),
    location: clean(input.location),
    guests_count: input.guests_count,
  });
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
  return { ok: true as const, id: data.id };
}

/**
 * Spawn an event from an accepted quote — owner confirms "the project is
 * going ahead". Copies date/location/guests/subject if available, links
 * quote_id + client_id. Redirects into the fresh event's detail page so
 * the owner can immediately assign staff / reserve stock.
 */
/* ─── Quote planning → event hours + staff briefing ──────────────── */

type QuoteStep = { time: string; label: string };
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Tolerant read of quotes.schedule (JSONB, may be null / legacy). */
function parseQuoteSchedule(raw: unknown): QuoteStep[] {
  if (!Array.isArray(raw)) return [];
  const out: QuoteStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    let time = typeof o.time === "string" ? o.time.trim() : "";
    if (/^\d:\d\d$/.test(time)) time = "0" + time;
    if (!HHMM.test(time)) time = "";
    if (!label && !time) continue;
    out.push({ time, label });
  }
  return out;
}

/**
 * Map a quote step onto one of the briefing's operational kinds, only
 * on unambiguous wording. Anything else (guest arrival, speeches, cake…)
 * stays null and is added to the brief as its own "other" step — better
 * an unclassified line than a wrong time on the wrong ops step.
 * Order matters: end-of-service and pick-up patterns are tested before
 * the generic "début" / "livraison" ones they could otherwise shadow.
 */
function inferKind(label: string): BriefingScheduleStep["kind"] | null {
  const l = label.toLowerCase();
  // Ice first (a "livraison glaçons" is ice, not glassware). Then
  // teardown before pick-up: "Rangement & reprise matériel" is the team
  // packing up, not the glassware vendor collecting on J+1. Team arrival
  // before setup: "Arrivée du personnel & mise en place" is the arrival.
  // Setup before delivery: "Livraison, montage & installation du bar" is
  // the bar going up, while a bare "Livraison Acaris" is the delivery.
  if (/gla[cç]on/.test(l)) return "delivery_ice";
  if (/d[ée]montage|rangement|remballage/.test(l)) return "teardown";
  if (/reprise|retour (du )?mat|r[ée]cup[ée]ration/.test(l)) return "delivery_out";
  if (/arriv[ée]e (de l'|du |des |de la )?([ée]quipe|staff|barm|personnel)/.test(l)) return "team_arrival";
  if (/installation|montage|mise en place|set ?up/.test(l)) return "setup";
  if (/livraison|r[ée]ception (du )?mat/.test(l)) return "delivery_in";
  if (/repas|d[iî]ner staff|pause staff/.test(l)) return "meal";
  if (/fin (du |de |des )?(service|cocktail|bar|soir)|fermeture (du )?bar/.test(l)) return "service_end";
  if (/d[ée]but (du |de |des )?(service|cocktail|bar)|ouverture (du )?bar|lancement/.test(l)) return "service_start";
  return null;
}

/**
 * Seed the staff briefing from the quote's run-of-show.
 *
 * The 10 preset steps are kept whole — they carry the logistics the
 * team relies on (Acaris order number, ice delivery, loading…). A quote
 * step that clearly matches one of them lends it its time (and keeps
 * its own wording in the comment for traceability); every other quote
 * step is appended as an extra timed line. Nothing from either side is
 * dropped; the operator can still reorder or edit in the briefing.
 */
function briefingFromQuoteSchedule(steps: QuoteStep[]): BriefingData {
  const brief = emptyBriefing();
  const used = new Set<number>();
  steps.forEach((step, i) => {
    const kind = inferKind(step.label);
    if (!kind || !step.time) return;
    const target = brief.schedule.find((p) => p.kind === kind && !p.time);
    if (!target) return;
    target.time = step.time;
    if (step.label && step.label.toLowerCase() !== target.label.toLowerCase()) {
      target.comment = [target.comment.trim(), `Devis : ${step.label}`]
        .filter(Boolean)
        .join(" · ");
    }
    used.add(i);
  });
  steps.forEach((step, i) => {
    if (used.has(i)) return;
    brief.schedule.push({
      time: step.time,
      label: step.label || "Étape",
      kind: "other",
      assignees: [],
      comment: "",
    });
  });
  return brief;
}

/** Team presence window derived from a quote planning — see the comment
 *  in createEventFromQuote for why it anchors on people, not logistics. */
function hoursFromSchedule(steps: QuoteStep[]): {
  start_time: string | null;
  end_time: string | null;
} {
  const kinds = steps.map((st) => inferKind(st.label));
  const timeOf = (k: BriefingScheduleStep["kind"]) =>
    steps.find((st, i) => st.time && kinds[i] === k)?.time ?? null;
  const timed = steps.filter((st) => st.time);
  return {
    start_time:
      timeOf("team_arrival") ??
      timeOf("setup") ??
      timeOf("service_start") ??
      timed[0]?.time ??
      null,
    end_time:
      timeOf("teardown") ??
      timeOf("service_end") ??
      (timed.length > 1 ? timed[timed.length - 1].time : null),
  };
}

/**
 * Attach (or detach) a quote to an existing event, after the fact.
 *
 * Events are often created before the client signs; once linked, the
 * margin reads the quote's price and commission automatically. Linking
 * also fills in whatever the event is still missing from the quote —
 * client, venue, guests, end date, hours, staff planning — but never
 * overwrites a value the operator already typed. Quotes awaiting
 * signature (envoye) are allowed, that's the whole use case; a quote can
 * back only one event.
 */
export async function linkEventToQuote(eventId: string, quoteId: string | null) {
  const role = await getCurrentRole();
  if (role !== "owner" && role !== "admin" && role !== "manager") {
    return { ok: false as const, error: "Accès refusé." };
  }
  const supabase = await createClient();

  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("id,quote_id,client_id,location,guests_count,end_date,start_time,end_time,briefing_data")
    .eq("id", eventId)
    .maybeSingle();
  if (eErr || !event) {
    return { ok: false as const, error: eErr?.message ?? "Événement introuvable." };
  }
  const previousQuoteId = event.quote_id;

  if (!quoteId) {
    const { error } = await supabase.from("events").update({ quote_id: null }).eq("id", eventId);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard/events");
    if (previousQuoteId) revalidatePath(`/dashboard/devis/${previousQuoteId}`);
    revalidatePath("/dashboard/devis");
    revalidatePath("/dashboard");
    return { ok: true as const, filled: [] as string[] };
  }

  const { data: quote } = await supabase
    .from("quotes")
    .select("id,number,status,client_id,event_location,guests_count,event_end_date,schedule")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) return { ok: false as const, error: "Devis introuvable." };
  if (quote.status !== "envoye" && quote.status !== "accepte") {
    return {
      ok: false as const,
      error: "Seul un devis envoyé ou signé peut être rattaché à un événement.",
    };
  }

  // One event per quote: refuse if another event already claims it.
  const { data: taken } = await supabase
    .from("events")
    .select("id,title")
    .eq("quote_id", quoteId)
    .neq("id", eventId)
    .maybeSingle();
  if (taken) {
    return {
      ok: false as const,
      error: `Ce devis est déjà rattaché à l'événement « ${taken.title} ».`,
    };
  }

  // Fill only what the event is missing.
  const patch: EventUpdate = { quote_id: quote.id };
  const filled: string[] = [];
  if (!event.client_id && quote.client_id) {
    patch.client_id = quote.client_id;
    filled.push("client");
  }
  if (!event.location?.trim() && quote.event_location) {
    patch.location = quote.event_location;
    filled.push("lieu");
  }
  if (event.guests_count == null && quote.guests_count != null) {
    patch.guests_count = quote.guests_count;
    filled.push("invités");
  }
  if (!event.end_date && quote.event_end_date) {
    patch.end_date = quote.event_end_date;
    filled.push("date de fin");
  }
  const steps = parseQuoteSchedule((quote as { schedule?: unknown }).schedule);
  if (steps.length > 0) {
    const hours = hoursFromSchedule(steps);
    if (!event.start_time && hours.start_time) {
      patch.start_time = hours.start_time;
      filled.push("heure de début");
    }
    if (!event.end_time && hours.end_time) {
      patch.end_time = hours.end_time;
      filled.push("heure de fin");
    }
    if (!event.briefing_data) {
      patch.briefing_data = briefingFromQuoteSchedule(steps) as unknown as EventUpdate["briefing_data"];
      filled.push("planning du brief");
    }
  }

  const { error } = await supabase.from("events").update(patch).eq("id", eventId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/devis/${quoteId}`);
  if (previousQuoteId && previousQuoteId !== quoteId) revalidatePath(`/dashboard/devis/${previousQuoteId}`);
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");
  return { ok: true as const, filled };
}

export async function createEventFromQuote(quoteId: string) {
  const supabase = await createClient();

  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select(
      "id,number,subject,event_date,event_end_date,event_location,event_type,guests_count,client_id,status,schedule",
    )
    .eq("id", quoteId)
    .maybeSingle();
  if (qErr || !quote) {
    return { ok: false as const, error: qErr?.message ?? "Devis introuvable" };
  }
  if (quote.status !== "accepte") {
    return {
      ok: false as const,
      error: "Crée l'événement une fois le devis accepté.",
    };
  }

  // Don't duplicate if there's already one linked to this quote.
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (existing?.id) {
    redirect(`/dashboard/events/${existing.id}`);
  }

  // The quote has no dedicated start/end fields: its hours live in the
  // run-of-show. Anchor them on the team's presence, not on the vendor
  // logistics that bracket it — a planning that starts with "11:00
  // Livraison Acaris" and ends with "10:00 J+1 Reprise Acaris" must not
  // yield a 23-hour event. Start = team arrival (else setup, else service
  // start); end = teardown (else end of service). Fall back to the
  // first/last timed step in authored order (not sorted, so an
  // 18:00 → 02:00 night keeps 02:00; the calendar feed rolls it to J+1).
  const steps = parseQuoteSchedule((quote as { schedule?: unknown }).schedule);
  const { start_time, end_time } = hoursFromSchedule(steps);
  const briefing_data =
    steps.length > 0
      ? (briefingFromQuoteSchedule(steps) as unknown as
          Database["public"]["Tables"]["events"]["Insert"]["briefing_data"])
      : undefined;

  const { data: created, error: eErr } = await supabase
    .from("events")
    .insert({
      title: quote.subject || `Événement — devis ${quote.number}`,
      date: quote.event_date ?? new Date().toISOString().slice(0, 10),
      end_date: quote.event_end_date,
      start_time,
      end_time,
      location: quote.event_location,
      guests_count: quote.guests_count,
      client_id: quote.client_id,
      quote_id: quote.id,
      status: "a_venir",
      briefing_data,
    })
    .select("id")
    .single();
  if (eErr || !created) {
    return { ok: false as const, error: eErr?.message ?? "Création échouée" };
  }

  // Notify the Équipe before the redirect (redirect() throws to bail out
  // of the action, so nothing after it would run).
  await notifyTeamEventCreated({
    id: created.id,
    title: quote.subject || `Événement — devis ${quote.number}`,
    date: quote.event_date ?? new Date().toISOString().slice(0, 10),
    end_date: quote.event_end_date,
    start_time,
    end_time,
    location: quote.event_location,
    guests_count: quote.guests_count,
  });

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/devis/${quoteId}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${created.id}`);
}

export async function saveEvent(id: string, input: Partial<EventInput>) {
  const supabase = await createClient();
  const patch: EventUpdate = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.date !== undefined) patch.date = input.date;
  if (input.end_date !== undefined) {
    // Only keep an end date strictly after the start; otherwise clear it
    // (single-day). Guards against a backwards range slipping through.
    patch.end_date =
      input.end_date && input.date && input.end_date > input.date
        ? input.end_date
        : null;
  }
  if (input.start_time !== undefined) patch.start_time = clean(input.start_time);
  if (input.end_time !== undefined) patch.end_time = clean(input.end_time);
  if (input.duration_hours !== undefined)
    patch.duration_hours = input.duration_hours;
  if (input.location !== undefined) patch.location = clean(input.location);
  if (input.guests_count !== undefined) patch.guests_count = input.guests_count;
  if (input.briefing !== undefined) patch.briefing = clean(input.briefing);

  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath("/dashboard/events");
  return { ok: true as const };
}

/**
 * Narrow state machine:
 *   a_venir → en_cours | annule
 *   en_cours → termine | annule
 *   termine / annule terminal (no reverse)
 *
 * `termine` is also reachable via closeEvent() which does stock writes.
 * Use that instead of setEventStatus('termine') when closing a live event.
 */
export async function setEventStatus(id: string, next: EventStatus) {
  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return { ok: false as const, error: "Événement introuvable" };
  const allowed: Record<EventStatus, EventStatus[]> = {
    a_venir: ["en_cours", "annule"],
    en_cours: ["termine", "annule"],
    termine: [],
    annule: [],
  };
  if (!allowed[ev.status].includes(next)) {
    return {
      ok: false as const,
      error: `Transition interdite : ${ev.status} → ${next}`,
    };
  }
  const { error } = await supabase.from("events").update({ status: next }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath("/dashboard/events");
  return { ok: true as const };
}

/**
 * Close a running event:
 *  - reads `event_stock` reservations as the planned outflow;
 *  - subtracts the optional per-product `qty_returned` to compute the
 *    actual physical consumption (consumed = max(0, reserved - returned));
 *  - writes one `stock_movements(out)` row per product (skipping zero
 *    consumption) and decrements `products.stock_qty` by the same;
 *  - flips status to `termine`;
 *  - leaves event_stock.qty_reserved untouched so the owner can still see
 *    what was planned vs what was physically consumed.
 *
 * Idempotent guard: refuses if the event is already terminé/annulé so we
 * don't double-decrement stock on a re-click.
 */
export async function closeEvent(
  id: string,
  returns?: Array<{ product_id: string; qty_returned: number }>,
) {
  const supabase = await createClient();

  const { data: ev, error: eErr } = await supabase
    .from("events")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (eErr || !ev) {
    return { ok: false as const, error: eErr?.message ?? "Événement introuvable" };
  }
  if (ev.status === "termine" || ev.status === "annule") {
    return {
      ok: false as const,
      error: `Événement déjà ${ev.status}, rien à clôturer.`,
    };
  }

  // Build the per-product returned map (caller passes whatever was filled
  // in the closure popup; products absent → 0 returned).
  const returnedByProduct = new Map<string, number>();
  for (const r of returns ?? []) {
    if (!Number.isFinite(r.qty_returned) || r.qty_returned < 0) continue;
    // Snap to halves: the popup commits from React state, so `step`
    // never validates it. Rounding beats rejecting here — a closure
    // shouldn't fail over a stray decimal.
    returnedByProduct.set(r.product_id, roundToHalf(Number(r.qty_returned)));
  }

  // Fetch reservations + current product stocks.
  const { data: reservations, error: rErr } = await supabase
    .from("event_stock")
    .select("product_id,qty_reserved")
    .eq("event_id", id);
  if (rErr) return { ok: false as const, error: rErr.message };

  const productIds = (reservations ?? []).map((r) => r.product_id);
  const { data: products } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select("id,stock_qty")
          .in("id", productIds)
      : { data: [] };
  const stockById = new Map((products ?? []).map((p) => [p.id, Number(p.stock_qty)]));

  // Insert movements + update stock. Separate roundtrips but we're in a
  // server action already — acceptable for the <50 products case.
  for (const r of reservations ?? []) {
    const reserved = Number(r.qty_reserved ?? 0);
    if (reserved <= 0) continue;
    const returned = Math.min(returnedByProduct.get(r.product_id) ?? 0, reserved);
    const consumed = Math.max(0, reserved - returned);
    if (consumed === 0) continue;
    const prevQty = stockById.get(r.product_id) ?? 0;
    const nextQty = Math.max(0, prevQty - consumed);
    const reason =
      returned > 0
        ? `Clôture événement (retour: ${returned})`
        : "Clôture événement";
    const { error: mvErr } = await supabase.from("stock_movements").insert({
      product_id: r.product_id,
      qty: consumed,
      direction: "out",
      event_id: id,
      reason,
    });
    if (mvErr) return { ok: false as const, error: mvErr.message };
    const { error: upErr } = await supabase
      .from("products")
      .update({ stock_qty: nextQty })
      .eq("id", r.product_id);
    if (upErr) return { ok: false as const, error: upErr.message };
  }

  const { error: statusErr } = await supabase
    .from("events")
    .update({ status: "termine" })
    .eq("id", id);
  if (statusErr) return { ok: false as const, error: statusErr.message };

  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/stock");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Sweep `a_venir` events whose scheduled start time has passed and flip
 * them to `en_cours`. Idempotent: if status already moved on, the
 * subsequent updates touch zero rows. Cheap enough to run before the
 * events list / detail server-renders, so the dashboard reflects the
 * "started" state without needing a real cron job.
 *
 * Two-pass on purpose:
 *   1. all events whose date is strictly past today
 *   2. events scheduled today whose start_time has elapsed
 * Events missing a start_time are left alone — auto-start needs a
 * scheduled clock.
 */
export async function autoStartDueEvents() {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const hhmmss = now.toTimeString().slice(0, 8);

  await supabase
    .from("events")
    .update({ status: "en_cours" })
    .eq("status", "a_venir")
    .lt("date", today);

  await supabase
    .from("events")
    .update({ status: "en_cours" })
    .eq("status", "a_venir")
    .eq("date", today)
    .not("start_time", "is", null)
    .lte("start_time", hhmmss);
}

/**
 * Persist the per-event additional charges (verrerie, glaçons,
 * suppléments) that weigh on the margin. Stored as a single JSONB blob
 * in events.extra_costs. Staff are allowed: the lines double as on-site
 * logistics ("Guillaume — 1 sac de 23 kg"), so the team fills them in
 * too. They still never see the Rentabilité block itself.
 */
export async function saveEventExtraCosts(
  id: string,
  costs: EventExtraCosts,
) {
  const role = await getCurrentRole();
  if (!role || !["owner", "admin", "manager", "staff"].includes(role)) {
    return { ok: false as const, error: "Accès non autorisé." };
  }
  const supabase = await createClient();
  // Sanitise through the shared parser so we never persist junk.
  const safe = parseExtraCosts(costs);
  // `extra_costs` isn't in the generated types yet (added by migration,
  // types not regenerated) — cast the patch through unknown.
  const patch = { extra_costs: safe } as unknown as EventUpdate;
  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${id}`);
  return { ok: true as const };
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!ev) return { ok: false as const, error: "Événement introuvable" };
  if (ev.status !== "a_venir" && ev.status !== "annule") {
    return {
      ok: false as const,
      error:
        "Seuls les événements à venir ou annulés peuvent être supprimés. Utilise plutôt « Annuler ».",
    };
  }
  // Cascade children first so the owner doesn't need to clean up by hand.
  await supabase.from("event_staff").delete().eq("event_id", id);
  await supabase.from("event_stock").delete().eq("event_id", id);
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/* ─── Staff assignment ────────────────────────────────────────────── */

export async function assignStaff(
  eventId: string,
  staffId: string,
  hoursPlanned: number,
  rateOverride: number | null,
  notes: string | null,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("event_staff").upsert(
    {
      event_id: eventId,
      staff_id: staffId,
      hours_planned: hoursPlanned,
      rate_override: rateOverride,
      notes: clean(notes),
    },
    { onConflict: "event_id,staff_id" },
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

export async function updateStaffAssignment(
  eventId: string,
  staffId: string,
  patch: {
    hours_planned?: number;
    hours_done?: number | null;
    rate_override?: number | null;
    notes?: string | null;
  },
) {
  const supabase = await createClient();
  const update: EventStaffUpdate = {};
  if (patch.hours_planned !== undefined) update.hours_planned = patch.hours_planned;
  if (patch.hours_done !== undefined) update.hours_done = patch.hours_done;
  if (patch.rate_override !== undefined) update.rate_override = patch.rate_override;
  if (patch.notes !== undefined) update.notes = clean(patch.notes);

  const { error } = await supabase
    .from("event_staff")
    .update(update)
    .eq("event_id", eventId)
    .eq("staff_id", staffId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

export async function removeStaffAssignment(eventId: string, staffId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_staff")
    .delete()
    .eq("event_id", eventId)
    .eq("staff_id", staffId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

/**
 * Record (or update) a payment made to an assigned staff member.
 * A payment is considered "réglé" when paid_at is set — that's the
 * single source of truth for the settled/unsettled status, so we
 * never let the three fields drift out of sync. Amount + method are
 * stored alongside for the operator's cash-flow tracking; they have
 * no bearing on the event-margin computation (which uses the
 * hours×rate estimate, not the actually-paid amount).
 */
export async function recordStaffPayment(
  eventId: string,
  staffId: string,
  payment: {
    paid_amount: number;
    paid_at: string; // YYYY-MM-DD
    payment_method: "especes" | "virement";
  },
) {
  const supabase = await createClient();

  const amount = Number(payment.paid_amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false as const, error: "Montant invalide." };
  }
  if (!payment.paid_at) {
    return { ok: false as const, error: "Date de règlement manquante." };
  }
  if (payment.payment_method !== "especes" && payment.payment_method !== "virement") {
    return { ok: false as const, error: "Type de règlement invalide." };
  }

  const { error } = await supabase
    .from("event_staff")
    .update({
      paid_amount: Math.round(amount * 100) / 100,
      paid_at: payment.paid_at,
      payment_method: payment.payment_method,
    })
    .eq("event_id", eventId)
    .eq("staff_id", staffId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

/**
 * Clear a recorded payment — flips the member back to "non réglé" by
 * nulling all three payment fields together (keeps the status
 * invariant intact).
 */
export async function clearStaffPayment(eventId: string, staffId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_staff")
    .update({ paid_amount: null, paid_at: null, payment_method: null })
    .eq("event_id", eventId)
    .eq("staff_id", staffId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

/* ─── Event validation checklist (TO-DO drawer) ───────────────────── */

/**
 * Persist the whole TO-DO checklist blob for an event. The client owns
 * the structure (sections → groups → items) and sends the full payload
 * on every mutation (toggle / add / remove / rename) — simplest robust
 * approach for a JSONB-backed checklist, mirrors the briefing editor.
 * We don't revalidate the page: the drawer manages its own optimistic
 * state, and a refetch would just re-seed the same data.
 */
export async function saveEventTodo(eventId: string, data: EventTodoData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ todo_data: data })
    .eq("id", eventId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/* ─── Stock reservation ───────────────────────────────────────────── */

export async function reserveProduct(
  eventId: string,
  productId: string,
  qty: number,
) {
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false as const, error: "Quantité invalide." };
  }
  if (!isHalfStep(qty)) {
    return { ok: false as const, error: HALF_STEP_ERROR };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("event_stock").upsert(
    {
      event_id: eventId,
      product_id: productId,
      qty_reserved: qty,
    },
    { onConflict: "event_id,product_id" },
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

export async function updateReservation(
  eventId: string,
  productId: string,
  qty: number,
) {
  if (!Number.isFinite(qty) || qty < 0) {
    return { ok: false as const, error: "Quantité invalide." };
  }
  if (!isHalfStep(qty)) {
    return { ok: false as const, error: HALF_STEP_ERROR };
  }
  const supabase = await createClient();
  if (qty === 0) {
    const { error } = await supabase
      .from("event_stock")
      .delete()
      .eq("event_id", eventId)
      .eq("product_id", productId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase
      .from("event_stock")
      .update({ qty_reserved: qty })
      .eq("event_id", eventId)
      .eq("product_id", productId);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

export async function removeReservation(eventId: string, productId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_stock")
    .delete()
    .eq("event_id", eventId)
    .eq("product_id", productId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  // Reservations drive the "réservé / dispo" figures on the stock page
  // and every other event's shopping list — refresh both.
  revalidatePath("/dashboard/stock");
  return { ok: true as const };
}

/**
 * Drop every reservation of an event in one go — clearing a mis-computed
 * stock list line by line was the only option before.
 *
 * Refused once the event is closed: its reservations are the record of
 * what was actually taken out of stock at closure, so wiping them would
 * erase the justification of the OUT movements.
 */
export async function clearReservations(eventId: string) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { ok: false as const, error: "Événement introuvable." };
  if (event.status === "termine") {
    return {
      ok: false as const,
      error:
        "Événement clôturé : les réservations justifient les sorties de stock et ne peuvent plus être vidées.",
    };
  }

  const { data: deleted, error } = await supabase
    .from("event_stock")
    .delete()
    .eq("event_id", eventId)
    .select("product_id");
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/stock");
  return { ok: true as const, removed: (deleted ?? []).length };
}

/* ─── Cocktail menu ─────────────────────────────────────────────── */

export async function addCocktailToMenu(
  eventId: string,
  cocktailId: string,
  qtyPlanned: number,
) {
  if (!Number.isFinite(qtyPlanned) || qtyPlanned < 0) {
    return { ok: false as const, error: "Quantité invalide." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("event_cocktails").upsert(
    {
      event_id: eventId,
      cocktail_id: cocktailId,
      qty_planned: Math.round(qtyPlanned),
    },
    { onConflict: "event_id,cocktail_id" },
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

export async function updateCocktailQty(
  eventId: string,
  cocktailId: string,
  qtyPlanned: number,
) {
  if (!Number.isFinite(qtyPlanned) || qtyPlanned < 0) {
    return { ok: false as const, error: "Quantité invalide." };
  }
  const supabase = await createClient();
  if (qtyPlanned === 0) {
    const { error } = await supabase
      .from("event_cocktails")
      .delete()
      .eq("event_id", eventId)
      .eq("cocktail_id", cocktailId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase
      .from("event_cocktails")
      .update({ qty_planned: Math.round(qtyPlanned) })
      .eq("event_id", eventId)
      .eq("cocktail_id", cocktailId);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

export async function removeCocktailFromMenu(
  eventId: string,
  cocktailId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_cocktails")
    .delete()
    .eq("event_id", eventId)
    .eq("cocktail_id", cocktailId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const };
}

/**
 * Replace event_stock entirely with packs computed from the cocktail menu.
 * For each ingredient: Σ (qty_planned × qty_per_cocktail), converted to
 * product packs via content_per_unit with ceiling-rounding. Products
 * without content_per_unit fall back to a direct ceiling on the raw qty.
 *
 * The reservation strategy is "replace all": anything the owner manually
 * added before gets overwritten — that was option A in the workflow
 * we validated together. A warning is surfaced in the UI before the
 * destructive confirm.
 */
export async function replaceStockFromMenu(eventId: string) {
  const supabase = await createClient();

  const { data: menu, error: mErr } = await supabase
    .from("event_cocktails")
    .select("cocktail_id,qty_planned")
    .eq("event_id", eventId);
  if (mErr) return { ok: false as const, error: mErr.message };
  if (!menu || menu.length === 0) {
    return { ok: false as const, error: "Menu vide — ajoute des cocktails d'abord." };
  }

  const cocktailIds = menu.map((m) => m.cocktail_id);
  const { data: ingredients, error: iErr } = await supabase
    .from("cocktail_ingredients")
    .select("cocktail_id,product_id,qty")
    .in("cocktail_id", cocktailIds);
  if (iErr) return { ok: false as const, error: iErr.message };

  const productIds = Array.from(
    new Set((ingredients ?? []).map((i) => i.product_id)),
  );
  const { data: products } = productIds.length
    ? await supabase
        .from("products")
        .select("id,content_per_unit,content_unit,unit")
        .in("id", productIds)
    : { data: [] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  // Aggregate: product_id → total content-unit need
  const totalNeed = new Map<string, number>();
  const qtyByCocktail = new Map(menu.map((m) => [m.cocktail_id, m.qty_planned]));
  for (const ing of ingredients ?? []) {
    const planned = qtyByCocktail.get(ing.cocktail_id) ?? 0;
    if (!planned) continue;
    totalNeed.set(
      ing.product_id,
      (totalNeed.get(ing.product_id) ?? 0) + Number(ing.qty) * planned,
    );
  }

  // Explode to packs (ceil)
  const reservations: { event_id: string; product_id: string; qty_reserved: number }[] = [];
  for (const [productId, need] of totalNeed.entries()) {
    const p = productById.get(productId);
    const perUnit = p?.content_per_unit ? Number(p.content_per_unit) : null;
    const packs =
      perUnit && perUnit > 0 ? Math.ceil(need / perUnit) : Math.ceil(need);
    if (packs > 0) {
      reservations.push({
        event_id: eventId,
        product_id: productId,
        qty_reserved: packs,
      });
    }
  }

  // Wipe then insert (option A in workflow)
  const { error: delErr } = await supabase
    .from("event_stock")
    .delete()
    .eq("event_id", eventId);
  if (delErr) return { ok: false as const, error: delErr.message };

  if (reservations.length > 0) {
    const { error: insErr } = await supabase
      .from("event_stock")
      .insert(reservations);
    if (insErr) return { ok: false as const, error: insErr.message };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true as const, linesWritten: reservations.length };
}
