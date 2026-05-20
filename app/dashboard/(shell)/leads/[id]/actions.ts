"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type EventType = Database["public"]["Enums"]["event_type"];

export async function updateLead(
  id: string,
  patch: {
    status?: LeadStatus;
    internal_notes?: string | null;
    event_type?: EventType | null;
    event_date?: string | null;
    guests_count?: number | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) {
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/dashboard/leads/${id}`);
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Convert a lead into a draft devis:
 * - upsert a client row (by email when available)
 * - create a quote row linked to the lead + client
 * - mark the lead as `contacte` (devis being drafted)
 *
 * The lead is bumped to `devis_envoye` only when sendDevis() actually
 * fires the email, and to `gagne` / `perdu` when the quote is
 * accepted / refused. See app/dashboard/(shell)/devis/[id]/actions.ts.
 *
 * Redirects to the new quote edit page.
 */
export async function convertLeadToQuote(leadId: string) {
  const supabase = await createClient();

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id,contact_name,contact_email,contact_phone,company,event_type,event_date,guests_count,message,client_id")
    .eq("id", leadId)
    .single();
  if (leadErr || !lead) {
    return { ok: false as const, error: leadErr?.message ?? "Lead introuvable" };
  }

  // 1. Resolve / create the client.
  let clientId: string | null = lead.client_id;
  if (!clientId && lead.contact_email) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .ilike("email", lead.contact_email)
      .maybeSingle();
    if (existing?.id) {
      clientId = existing.id;
    } else {
      const [firstName, ...rest] = (lead.contact_name ?? "").trim().split(/\s+/);
      const { data: created, error: cErr } = await supabase
        .from("clients")
        .insert({
          first_name: firstName || null,
          last_name: rest.join(" ") || null,
          company_name: lead.company,
          email: lead.contact_email,
          phone: lead.contact_phone,
        })
        .select("id")
        .single();
      if (cErr || !created) {
        return { ok: false as const, error: cErr?.message ?? "Création client échouée" };
      }
      clientId = created.id;
    }
  }

  // 2. Mint a unique quote number via the DB helper (continuous per-year
  //    sequence — same pattern as invoices).
  const { data: nbr, error: nbrErr } = await supabase.rpc("next_quote_number");
  if (nbrErr || !nbr) {
    return { ok: false as const, error: nbrErr?.message ?? "Numérotation impossible" };
  }

  // 3. Create the quote in draft.
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .insert({
      number: nbr,
      client_id: clientId,
      lead_id: lead.id,
      status: "brouillon",
      event_type: lead.event_type,
      event_date: lead.event_date,
      guests_count: lead.guests_count,
      subject: lead.company ? `Devis — ${lead.company}` : lead.event_type ? `Devis — ${lead.event_type}` : "Nouveau devis",
      intro: lead.message,
    })
    .select("id,number")
    .single();
  if (qErr || !quote) {
    return { ok: false as const, error: qErr?.message ?? "Création devis échouée" };
  }

  // 4. Move the lead into the "contacté" pipeline stage + link to the
  //    client. The bump to "devis_envoye" happens later in sendDevis().
  await supabase
    .from("leads")
    .update({ status: "contacte", client_id: clientId })
    .eq("id", lead.id);

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");

  redirect(`/dashboard/devis/${quote.id}`);
}
