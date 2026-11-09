import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { getOrganization, listTransactions, isQontoConfigured, QontoError } from "./qonto";
import { clientTokens, pickAutoMatch, rankCandidates, type OpenInvoice } from "./match";

type Admin = SupabaseClient<Database>;
type TxInsert = Database["public"]["Tables"]["bank_transactions"]["Insert"];

/** Profondeur de la première synchro (puis incrémental sur updated_at). */
const INITIAL_DAYS = 120;
/** En deçà, on considère la banque à jour et on ne rappelle pas Qonto. */
export const STALE_AFTER_MS = 15 * 60 * 1000;

export type SyncResult =
  | { ok: true; accounts: number; upserted: number; autoMatched: number; skipped?: false }
  | { ok: true; skipped: true; reason: "not_configured" | "fresh" | "locked" }
  | { ok: false; error: string };

export type OwnerClientName = {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
};

export function clientDisplayName(c: OwnerClientName | null | undefined): string | null {
  if (!c) return null;
  const person = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return c.company_name || person || null;
}

/** La banque est-elle à rafraîchir ? (aucun compte, ou dernière synchro trop vieille) */
export async function bankIsStale(admin: Admin): Promise<boolean> {
  const { data } = await admin
    .from("bank_accounts")
    .select("synced_at")
    .order("synced_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!data?.synced_at) return true;
  return Date.now() - new Date(data.synced_at).getTime() > STALE_AFTER_MS;
}

// Verrou mémoire : deux requêtes simultanées (page + arrière-plan) ne
// déclenchent qu'une synchro par instance serveur.
let inFlight: Promise<SyncResult> | null = null;

/**
 * Synchronise comptes + transactions depuis Qonto, puis tente le
 * rapprochement automatique des virements entrants non traités.
 * `force` ignore la fraîcheur (bouton « Synchroniser »).
 */
export async function syncBank(opts: { force?: boolean } = {}): Promise<SyncResult> {
  if (!isQontoConfigured()) return { ok: true, skipped: true, reason: "not_configured" };
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      return await doSync(opts);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

async function doSync(opts: { force?: boolean }): Promise<SyncResult> {
  const admin = createAdminClient();
  if (!opts.force && !(await bankIsStale(admin))) {
    return { ok: true, skipped: true, reason: "fresh" };
  }

  let org;
  try {
    org = await getOrganization();
  } catch (e) {
    const msg = e instanceof QontoError ? e.message : "Qonto injoignable.";
    // On garde la trace de l'erreur sur les comptes déjà connus, sinon
    // on laisse la page l'afficher directement.
    await admin.from("bank_accounts").update({ last_error: msg }).neq("id", "");
    return { ok: false, error: msg };
  }

  const now = new Date().toISOString();
  let upserted = 0;

  for (const acc of org.bank_accounts) {
    if (acc.status && acc.status !== "active") continue;

    const { data: known } = await admin
      .from("bank_accounts")
      .select("id,synced_at")
      .eq("id", acc.id)
      .maybeSingle();

    await admin.from("bank_accounts").upsert({
      id: acc.id,
      name: acc.name,
      iban_last4: acc.iban ? acc.iban.replace(/\s+/g, "").slice(-4) : null,
      currency: acc.currency,
      balance: acc.balance,
      authorized_balance: acc.authorized_balance,
      is_main: acc.main,
      status: acc.status,
      last_error: null,
    });

    // Première fois : INITIAL_DAYS de profondeur sur settled_at. Ensuite :
    // tout ce qui a bougé depuis la dernière synchro (avec 2 h de marge).
    let txs;
    try {
      if (known?.synced_at) {
        const from = new Date(new Date(known.synced_at).getTime() - 2 * 3600_000).toISOString();
        txs = await listTransactions({ bankAccountId: acc.id, updatedFrom: from });
      } else {
        const from = new Date(Date.now() - INITIAL_DAYS * 86_400_000).toISOString();
        txs = await listTransactions({ bankAccountId: acc.id, settledFrom: from });
      }
    } catch (e) {
      const msg = e instanceof QontoError ? e.message : "Lecture des transactions impossible.";
      await admin.from("bank_accounts").update({ last_error: msg }).eq("id", acc.id);
      return { ok: false, error: msg };
    }

    if (txs.length) {
      const rows: TxInsert[] = txs
        .filter((t) => t.side === "credit" || t.side === "debit")
        .map((t) => ({
          qonto_id: t.transaction_id ?? t.id,
          bank_account_id: acc.id,
          side: t.side,
          amount: Math.abs(Number(t.amount)),
          currency: t.currency ?? acc.currency,
          operation_type: t.operation_type ?? null,
          label: t.label ?? null,
          reference: t.reference ?? null,
          note: t.note ?? null,
          status: t.status,
          emitted_at: t.emitted_at ?? null,
          settled_at: t.settled_at ?? null,
          has_attachment: (t.attachment_ids?.length ?? 0) > 0,
        }));
      // Les colonnes de rapprochement ne sont pas dans `rows`, l'upsert ne
      // les touche donc pas : un lien déjà fait survit à la resynchro.
      const { error } = await admin
        .from("bank_transactions")
        .upsert(rows, { onConflict: "qonto_id", ignoreDuplicates: false });
      if (error) return { ok: false, error: error.message };
      upserted += rows.length;
    }

    await admin.from("bank_accounts").update({ synced_at: now }).eq("id", acc.id);
  }

  const autoMatched = await autoReconcile(admin);
  return { ok: true, accounts: org.bank_accounts.length, upserted, autoMatched };
}

/* ─── Rapprochement ───────────────────────────────────────────────── */

/** Factures ouvertes (envoyées / en retard, hors avoirs) avec reste dû et client. */
export async function loadOpenInvoices(admin: Admin): Promise<OpenInvoice[]> {
  const { data: invoices } = await admin
    .from("invoices")
    .select("id,number,total_ttc,issue_date,due_date,client_id,status,is_credit_note")
    .in("status", ["envoye", "en_retard"])
    .eq("is_credit_note", false)
    .order("issue_date", { ascending: false })
    .limit(500);
  if (!invoices?.length) return [];

  const ids = invoices.map((i) => i.id);
  const clientIds = Array.from(new Set(invoices.map((i) => i.client_id).filter((x): x is string => !!x)));
  const [{ data: payments }, { data: clients }] = await Promise.all([
    admin.from("invoice_payments").select("invoice_id,amount").in("invoice_id", ids),
    clientIds.length
      ? admin.from("clients").select("id,first_name,last_name,company_name").in("id", clientIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null; company_name: string | null }[] }),
  ]);
  const paidBy = new Map<string, number>();
  for (const p of payments ?? []) paidBy.set(p.invoice_id, (paidBy.get(p.invoice_id) ?? 0) + Number(p.amount));
  const clientMap = new Map((clients ?? []).map((c) => [c.id, c]));

  return invoices.map((i) => {
    const c = i.client_id ? clientMap.get(i.client_id) : null;
    const name = clientDisplayName(c);
    const tokens = Array.from(
      new Set([...clientTokens(c?.company_name), ...clientTokens([c?.first_name, c?.last_name].filter(Boolean).join(" "))]),
    );
    return {
      id: i.id,
      number: i.number,
      total_ttc: Number(i.total_ttc),
      remaining: Math.round((Number(i.total_ttc) - (paidBy.get(i.id) ?? 0)) * 100) / 100,
      issue_date: i.issue_date,
      due_date: i.due_date,
      client_name: name,
      client_tokens: tokens,
    };
  });
}

/**
 * Enregistre l'encaissement d'une transaction sur une facture et lie les
 * deux. Passe la facture en « payée » si le reste dû tombe à zéro.
 * Utilisé par l'automatique (userId null) et par le bouton manuel.
 */
export async function linkTransactionToInvoice(
  admin: Admin,
  txId: string,
  invoiceId: string,
  mode: "auto" | "manuel",
  userId: string | null,
): Promise<{ ok: true; invoiceNumber: string; nowPaid: boolean } | { ok: false; error: string }> {
  const { data: tx } = await admin
    .from("bank_transactions")
    .select("id,qonto_id,side,amount,label,reference,settled_at,emitted_at,match_status")
    .eq("id", txId)
    .maybeSingle();
  if (!tx) return { ok: false, error: "Mouvement introuvable." };
  if (tx.side !== "credit") return { ok: false, error: "Seul un mouvement entrant peut solder une facture." };
  if (tx.match_status === "rapproche") return { ok: false, error: "Ce mouvement est déjà rapproché." };

  const { data: inv } = await admin
    .from("invoices")
    .select("id,number,status,total_ttc,is_credit_note")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Facture introuvable." };
  if (inv.is_credit_note) return { ok: false, error: "Un avoir ne s'encaisse pas." };
  if (!["envoye", "en_retard", "paye"].includes(inv.status)) {
    return { ok: false, error: `Facture ${inv.status} : rapprochement impossible.` };
  }

  const paidOn = (tx.settled_at ?? tx.emitted_at ?? new Date().toISOString()).slice(0, 10);
  const who = [tx.label, tx.reference].filter(Boolean).join(" · ");
  const { data: payment, error: payErr } = await admin
    .from("invoice_payments")
    .insert({
      invoice_id: inv.id,
      amount: Number(tx.amount),
      paid_on: paidOn,
      method: "virement",
      reference: who ? who.slice(0, 200) : null,
      notes: mode === "auto" ? "Rapproché automatiquement depuis Qonto" : "Rapproché depuis Qonto",
      created_by: userId,
    })
    .select("id")
    .single();
  if (payErr || !payment) return { ok: false, error: payErr?.message ?? "Encaissement non enregistré." };

  const { error: linkErr } = await admin
    .from("bank_transactions")
    .update({
      invoice_payment_id: payment.id,
      match_status: "rapproche",
      match_mode: mode,
      matched_at: new Date().toISOString(),
      matched_by: userId,
    })
    .eq("id", tx.id)
    .eq("match_status", tx.match_status);
  if (linkErr) {
    await admin.from("invoice_payments").delete().eq("id", payment.id);
    return { ok: false, error: linkErr.message };
  }

  // Reste dû après cet encaissement
  const { data: all } = await admin.from("invoice_payments").select("amount").eq("invoice_id", inv.id);
  const paid = (all ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.round((Number(inv.total_ttc) - paid) * 100) / 100;
  let nowPaid = false;
  if (remaining <= 0.009 && inv.status !== "paye") {
    const { error } = await admin
      .from("invoices")
      .update({ status: "paye", paid_at: new Date().toISOString() })
      .eq("id", inv.id);
    nowPaid = !error;
  }
  return { ok: true, invoiceNumber: inv.number, nowPaid };
}

/** Virements entrants non traités × factures ouvertes → liens sûrs seulement. */
async function autoReconcile(admin: Admin): Promise<number> {
  const { data: txs } = await admin
    .from("bank_transactions")
    .select("id,amount,label,reference,note,settled_at,emitted_at")
    .eq("side", "credit")
    .eq("match_status", "a_traiter")
    .eq("status", "completed")
    .order("settled_at", { ascending: true })
    .limit(300);
  if (!txs?.length) return 0;

  let invoices = await loadOpenInvoices(admin);
  if (!invoices.length) return 0;

  let count = 0;
  for (const tx of txs) {
    const pick = pickAutoMatch(rankCandidates({ ...tx, amount: Number(tx.amount) }, invoices));
    if (!pick) continue;
    const res = await linkTransactionToInvoice(admin, tx.id, pick.invoice.id, "auto", null);
    if (res.ok) {
      count += 1;
      // Mise à jour locale du reste dû pour les virements suivants
      invoices = invoices.map((i) =>
        i.id === pick.invoice.id ? { ...i, remaining: Math.round((i.remaining - Number(tx.amount)) * 100) / 100 } : i,
      );
    }
  }
  return count;
}
