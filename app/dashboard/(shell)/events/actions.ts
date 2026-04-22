"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type EventStatus = Database["public"]["Enums"]["event_status"];

export type EventInput = {
  title: string;
  date: string; // YYYY-MM-DD
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
export async function createEventFromQuote(quoteId: string) {
  const supabase = await createClient();

  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select(
      "id,number,subject,event_date,event_location,event_type,guests_count,client_id,status",
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

  const { data: created, error: eErr } = await supabase
    .from("events")
    .insert({
      title: quote.subject || `Événement — devis ${quote.number}`,
      date: quote.event_date ?? new Date().toISOString().slice(0, 10),
      location: quote.event_location,
      guests_count: quote.guests_count,
      client_id: quote.client_id,
      quote_id: quote.id,
      status: "a_venir",
    })
    .select("id")
    .single();
  if (eErr || !created) {
    return { ok: false as const, error: eErr?.message ?? "Création échouée" };
  }

  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/devis/${quoteId}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${created.id}`);
}

export async function saveEvent(id: string, input: Partial<EventInput>) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.date !== undefined) patch.date = input.date;
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
 *  - writes stock_movements(out) rows from event_stock reservations,
 *    decrements products.stock_qty accordingly;
 *  - flips status to `termine`;
 *  - leaves event_stock.qty_reserved untouched so the owner can still see
 *    what was planned vs what was physically consumed (staff.hours_done
 *    is captured in the Staff section separately).
 *
 * Idempotent guard: refuses if the event is already terminé/annulé so we
 * don't double-decrement stock on a re-click.
 */
export async function closeEvent(id: string) {
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
    if (!r.qty_reserved || r.qty_reserved <= 0) continue;
    const prevQty = stockById.get(r.product_id) ?? 0;
    const nextQty = Math.max(0, prevQty - Number(r.qty_reserved));
    const { error: mvErr } = await supabase.from("stock_movements").insert({
      product_id: r.product_id,
      qty: Number(r.qty_reserved),
      direction: "out",
      event_id: id,
      reason: "Clôture événement",
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
  const update: Record<string, unknown> = {};
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

/* ─── Stock reservation ───────────────────────────────────────────── */

export async function reserveProduct(
  eventId: string,
  productId: string,
  qty: number,
) {
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false as const, error: "Quantité invalide." };
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
  return { ok: true as const };
}
