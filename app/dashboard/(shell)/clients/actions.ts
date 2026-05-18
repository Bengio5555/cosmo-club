"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type ClientInput = {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  billing_address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  siret?: string | null;
  tva_intracom?: string | null;
  notes?: string | null;
};

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function normalize(input: ClientInput): ClientInput {
  return {
    first_name: clean(input.first_name),
    last_name: clean(input.last_name),
    company_name: clean(input.company_name),
    email: clean(input.email)?.toLowerCase() ?? null,
    phone: clean(input.phone),
    billing_address: clean(input.billing_address),
    postal_code: clean(input.postal_code),
    city: clean(input.city),
    country: clean(input.country),
    siret: clean(input.siret),
    tva_intracom: clean(input.tva_intracom),
    notes: clean(input.notes),
  };
}

/**
 * Create a client manually from the dashboard (hors flux lead).
 * At least one identifying field required (name OR company OR email).
 * Email uniqueness is a soft-check: we don't add a DB constraint because
 * historical leads may have ingested the same email more than once, but
 * we warn the owner before creating a dup.
 */
export async function saveNewClient(input: ClientInput) {
  const supabase = await createServerClient();
  const v = normalize(input);

  if (!v.first_name && !v.last_name && !v.company_name && !v.email) {
    return {
      ok: false as const,
      error: "Renseigne au moins un nom, une société ou un email.",
    };
  }

  if (v.email) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id,first_name,last_name,company_name,email")
      .ilike("email", v.email)
      .maybeSingle();
    if (existing) {
      return {
        ok: false as const,
        error: `Un client existe déjà avec cet email (${
          existing.company_name ||
          [existing.first_name, existing.last_name].filter(Boolean).join(" ") ||
          existing.email
        }).`,
        duplicateId: existing.id,
      };
    }
  }

  const { data: created, error } = await supabase
    .from("clients")
    .insert(v)
    .select("id")
    .single();
  if (error || !created) {
    return { ok: false as const, error: error?.message ?? "Création échouée" };
  }

  // Mirror the client as a "nouveau" lead so manually-added contacts
  // surface in /dashboard/leads alongside form submissions. Failure is
  // non-blocking — the client row is already persisted.
  const contactName =
    [v.first_name, v.last_name].filter(Boolean).join(" ") ||
    v.company_name ||
    null;
  const { error: leadErr } = await supabase.from("leads").insert({
    source: "dashboard",
    status: "nouveau",
    client_id: created.id,
    contact_name: contactName,
    contact_email: v.email,
    contact_phone: v.phone,
    company: v.company_name,
  });
  if (leadErr) {
    console.error("[saveNewClient] lead mirror failed:", leadErr.message);
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return { ok: true as const, id: created.id };
}

/**
 * Update a client's contact / billing details.
 * The client row is referenced (not copied) from leads / devis, so
 * updates propagate automatically to the dashboard views. The legal
 * snapshot on *issued* invoices stays frozen on purpose (art. 242
 * nonies A du CGI — factures émises immuables), so updating the SIRET
 * here does not retroactively alter past PDFs.
 */
export async function saveClient(id: string, input: ClientInput) {
  const supabase = await createServerClient();
  const v = normalize(input);

  const { error } = await supabase.from("clients").update(v).eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/dashboard/clients/${id}`);
  revalidatePath("/dashboard/clients");
  return { ok: true as const };
}

/**
 * Soft-archive (or unarchive) a client. The row stays in the database so
 * historical leads / devis / factures keep their reference — it's just
 * hidden from the default client list and prompted as "archivé" in the
 * fiche client. Use this when a client is no longer active but the
 * history matters (it almost always does for compta).
 */
export async function setClientArchived(id: string, archived: boolean) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);
  return { ok: true as const };
}

/**
 * Delete a client — only if nothing references it. We refuse on any
 * related leads / devis / factures to avoid orphaning historical data.
 * The UI should surface the counts so the owner knows why.
 */
export async function deleteClient(id: string) {
  const supabase = await createServerClient();

  const [{ count: leadsCount }, { count: quotesCount }, { count: invoicesCount }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("client_id", id),
      supabase.from("quotes").select("*", { count: "exact", head: true }).eq("client_id", id),
      supabase.from("invoices").select("*", { count: "exact", head: true }).eq("client_id", id),
    ]);

  if ((leadsCount ?? 0) + (quotesCount ?? 0) + (invoicesCount ?? 0) > 0) {
    return {
      ok: false as const,
      error: `Client lié à ${leadsCount ?? 0} lead(s), ${
        quotesCount ?? 0
      } devis, ${invoicesCount ?? 0} facture(s). Archive-le plutôt que de le supprimer.`,
    };
  }

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Spin up a blank draft quote pre-linked to this client and redirect
 * straight into the editor. Mirrors convertLeadToQuote's pattern but
 * without a lead — owner initiates from the fiche client.
 */
export async function createQuoteForClient(clientId: string) {
  const supabase = await createServerClient();

  const { data: client, error: cErr } = await supabase
    .from("clients")
    .select("id,first_name,last_name,company_name")
    .eq("id", clientId)
    .maybeSingle();
  if (cErr || !client) {
    return { ok: false as const, error: cErr?.message ?? "Client introuvable" };
  }

  const { data: nbr, error: nbrErr } = await supabase.rpc("next_quote_number");
  if (nbrErr || !nbr) {
    return { ok: false as const, error: nbrErr?.message ?? "Numérotation impossible" };
  }

  const display =
    client.company_name ||
    [client.first_name, client.last_name].filter(Boolean).join(" ") ||
    "client";

  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .insert({
      number: nbr,
      client_id: client.id,
      status: "brouillon",
      subject: `Devis — ${display}`,
    })
    .select("id")
    .single();
  if (qErr || !quote) {
    return { ok: false as const, error: qErr?.message ?? "Création devis échouée" };
  }

  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/devis/${quote.id}`);
}
