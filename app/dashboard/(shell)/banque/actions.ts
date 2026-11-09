"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/auth/server";
import { syncBank } from "@/lib/bank/sync";
import { linkTransactionToInvoice } from "@/lib/bank/sync";

const ALLOWED = ["owner", "admin", "compta"] as const;

async function guard() {
  const role = await getCurrentRole();
  if (!role || !(ALLOWED as readonly string[]).includes(role)) {
    return { ok: false as const, error: "Accès refusé." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { ok: true as const, userId: user?.id ?? null };
}

function refresh() {
  revalidatePath("/dashboard/banque");
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard");
}

export async function syncBankNow() {
  const g = await guard();
  if (!g.ok) return g;
  const res = await syncBank({ force: true });
  refresh();
  if (!res.ok) return { ok: false as const, error: res.error };
  if ("skipped" in res && res.skipped) {
    return { ok: true as const, message: res.reason === "not_configured" ? "Qonto n'est pas configuré." : "Déjà à jour." };
  }
  return {
    ok: true as const,
    message:
      res.autoMatched > 0
        ? `Synchronisé. ${res.autoMatched} virement${res.autoMatched > 1 ? "s" : ""} rapproché${res.autoMatched > 1 ? "s" : ""} automatiquement.`
        : "Synchronisé.",
  };
}

export async function matchTransaction(txId: string, invoiceId: string) {
  const g = await guard();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const res = await linkTransactionToInvoice(admin, txId, invoiceId, "manuel", g.userId);
  refresh();
  if (!res.ok) return res;
  return {
    ok: true as const,
    message: res.nowPaid
      ? `Encaissement enregistré, facture ${res.invoiceNumber} soldée.`
      : `Encaissement enregistré sur la facture ${res.invoiceNumber}.`,
  };
}

export async function ignoreTransaction(txId: string, ignore: boolean) {
  const g = await guard();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const { data: tx } = await admin
    .from("bank_transactions")
    .select("id,match_status")
    .eq("id", txId)
    .maybeSingle();
  if (!tx) return { ok: false as const, error: "Mouvement introuvable." };
  if (tx.match_status === "rapproche") return { ok: false as const, error: "Ce mouvement est rapproché : détache-le d'abord." };
  const { error } = await admin
    .from("bank_transactions")
    .update({
      match_status: ignore ? "ignore" : "a_traiter",
      matched_at: ignore ? new Date().toISOString() : null,
      matched_by: ignore ? g.userId : null,
      match_mode: null,
    })
    .eq("id", txId);
  if (error) return { ok: false as const, error: error.message };
  refresh();
  return { ok: true as const, message: ignore ? "Mouvement ignoré." : "Mouvement remis à traiter." };
}

/**
 * Détache un virement de sa facture : supprime l'encaissement créé et,
 * si la facture avait été soldée par ce lien, la repasse en « envoyée ».
 */
export async function unmatchTransaction(txId: string) {
  const g = await guard();
  if (!g.ok) return g;
  const admin = createAdminClient();
  const { data: tx } = await admin
    .from("bank_transactions")
    .select("id,invoice_payment_id,match_status")
    .eq("id", txId)
    .maybeSingle();
  if (!tx || tx.match_status !== "rapproche") return { ok: false as const, error: "Ce mouvement n'est pas rapproché." };

  let invoiceId: string | null = null;
  if (tx.invoice_payment_id) {
    const { data: pay } = await admin
      .from("invoice_payments")
      .select("id,invoice_id")
      .eq("id", tx.invoice_payment_id)
      .maybeSingle();
    invoiceId = pay?.invoice_id ?? null;
    await admin.from("invoice_payments").delete().eq("id", tx.invoice_payment_id);
  }
  const { error } = await admin
    .from("bank_transactions")
    .update({ invoice_payment_id: null, match_status: "a_traiter", match_mode: null, matched_at: null, matched_by: null })
    .eq("id", txId);
  if (error) return { ok: false as const, error: error.message };

  if (invoiceId) {
    const [{ data: inv }, { data: pays }] = await Promise.all([
      admin.from("invoices").select("id,status,total_ttc,due_date").eq("id", invoiceId).maybeSingle(),
      admin.from("invoice_payments").select("amount").eq("invoice_id", invoiceId),
    ]);
    if (inv?.status === "paye") {
      const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
      if (Number(inv.total_ttc) - paid > 0.009) {
        const late = inv.due_date ? inv.due_date < new Date().toISOString().slice(0, 10) : false;
        await admin
          .from("invoices")
          .update({ status: late ? "en_retard" : "envoye", paid_at: null })
          .eq("id", invoiceId);
      }
    }
    revalidatePath(`/dashboard/factures/${invoiceId}`);
  }
  refresh();
  return { ok: true as const, message: "Mouvement détaché, encaissement supprimé." };
}
