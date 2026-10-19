"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCode, tokenFromScan, type EquipmentPhase, type EquipmentScanResult } from "@/lib/equipment/shared";

export type ScanItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  contents: string | null;
  depart_at: string | null;
  depart_by: string | null;
  retour_at: string | null;
  retour_by: string | null;
};

export type ScanOutcome =
  | {
      ok: true;
      result: EquipmentScanResult;
      equipment: { code: string; name: string; contents: string | null } | null;
      /** For « autre_evenement »: where this element is actually expected. */
      expectedOn: string | null;
      items: ScanItem[];
    }
  | { ok: false; error: string };

/** Live list for the scan screen (token-gated, service role). */
export async function loadScanItems(eventId: string, token: string): Promise<ScanItem[]> {
  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id,briefing_token")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || !event.briefing_token || event.briefing_token !== token) return [];

  const { data: rows } = await supabase
    .from("event_equipment")
    .select("equipment_id,depart_at,depart_by,retour_at,retour_by")
    .eq("event_id", eventId);
  const ids = (rows ?? []).map((r) => r.equipment_id);
  if (ids.length === 0) return [];
  const { data: eq } = await supabase
    .from("equipment")
    .select("id,code,name,category,contents")
    .in("id", ids)
    .order("category")
    .order("code");
  const byId = new Map((rows ?? []).map((r) => [r.equipment_id, r]));
  return (eq ?? []).map((e) => {
    const r = byId.get(e.id)!;
    return { ...e, depart_at: r.depart_at, depart_by: r.depart_by, retour_at: r.retour_at, retour_by: r.retour_by };
  });
}

/**
 * One scan. `raw` is what the camera read (a /q/<token> URL) or a code
 * typed by hand (CAISSE-07). Every attempt is journaled, even refused.
 */
export async function recordScan(input: {
  eventId: string;
  token: string;
  raw: string;
  phase: EquipmentPhase;
  scannedBy: string;
}): Promise<ScanOutcome> {
  const { eventId, token, phase } = input;
  if (phase !== "depart" && phase !== "retour") return { ok: false, error: "Phase inconnue." };
  const scannedBy = input.scannedBy.trim().slice(0, 40) || null;
  const raw = input.raw.trim().slice(0, 300);
  if (!raw) return { ok: false, error: "Rien à lire." };

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("id,briefing_token,status")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || !event.briefing_token || event.briefing_token !== token) {
    return { ok: false, error: "Lien invalide ou expiré." };
  }

  // Resolve the element: QR token first, then a typed code.
  const qrToken = tokenFromScan(raw);
  let equipment: { id: string; code: string; name: string; contents: string | null } | null = null;
  if (qrToken) {
    const { data } = await supabase
      .from("equipment")
      .select("id,code,name,contents")
      .eq("qr_token", qrToken)
      .maybeSingle();
    equipment = data;
  } else {
    const { data } = await supabase
      .from("equipment")
      .select("id,code,name,contents")
      .eq("code", normalizeCode(raw))
      .maybeSingle();
    equipment = data;
  }

  let result: EquipmentScanResult;
  let expectedOn: string | null = null;

  if (!equipment) {
    result = "inconnu";
  } else {
    const { data: link } = await supabase
      .from("event_equipment")
      .select("depart_at,retour_at")
      .eq("event_id", eventId)
      .eq("equipment_id", equipment.id)
      .maybeSingle();
    if (!link) {
      result = "autre_evenement";
      // Tell the handler where it belongs, if it is booked elsewhere.
      const { data: others } = await supabase
        .from("event_equipment")
        .select("event_id")
        .eq("equipment_id", equipment.id);
      const otherIds = (others ?? []).map((o) => o.event_id).filter((id) => id !== eventId);
      if (otherIds.length) {
        const { data: ev } = await supabase
          .from("events")
          .select("title,date")
          .in("id", otherIds)
          .in("status", ["a_venir", "en_cours"])
          .order("date")
          .limit(1)
          .maybeSingle();
        if (ev) {
          expectedOn = `${ev.title} · ${new Date(ev.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
        }
      }
    } else if ((phase === "depart" && link.depart_at) || (phase === "retour" && link.retour_at)) {
      result = "deja";
    } else {
      result = "ok";
      const now = new Date().toISOString();
      const patch =
        phase === "depart"
          ? { depart_at: now, depart_by: scannedBy }
          : { retour_at: now, retour_by: scannedBy };
      const { error } = await supabase
        .from("event_equipment")
        .update(patch)
        .eq("event_id", eventId)
        .eq("equipment_id", equipment.id);
      if (error) return { ok: false, error: error.message };
    }
  }

  await supabase.from("equipment_scans").insert({
    event_id: eventId,
    equipment_id: equipment?.id ?? null,
    phase,
    result,
    scanned_by: scannedBy,
    raw: equipment ? null : raw,
  });

  const items = await loadScanItems(eventId, token);
  return {
    ok: true,
    result,
    equipment: equipment ? { code: equipment.code, name: equipment.name, contents: equipment.contents } : null,
    expectedOn,
    items,
  };
}
