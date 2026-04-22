import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * CSV compta export (factures + avoirs émis, paiements détaillés).
 *
 * Format : semicolon-delimited, UTF-8 BOM, ISO dates — digestible par Excel FR
 * et par les imports Quadratus / Sage / Pennylane / Tiime.
 *
 * Query params :
 *   - from  (YYYY-MM-DD, optional) — issue_date ≥ from
 *   - to    (YYYY-MM-DD, optional) — issue_date ≤ to
 *   - kind  ("all" | "factures" | "avoirs") — default "all"
 *
 * Gated by the Supabase session (same auth as /dashboard).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const kind = (url.searchParams.get("kind") || "all") as
    | "all"
    | "factures"
    | "avoirs";

  let q = supabase
    .from("invoices")
    .select(
      "id,number,is_credit_note,source_invoice_id,issue_date,due_date,event_date,paid_at,sent_at,status,subject,total_ht,total_tva,total_ttc,tva_rate,client_id",
    )
    .neq("status", "brouillon")
    .order("issue_date", { ascending: true })
    .order("number", { ascending: true });

  if (from) q = q.gte("issue_date", from);
  if (to) q = q.lte("issue_date", to);
  if (kind === "factures") q = q.eq("is_credit_note", false);
  if (kind === "avoirs") q = q.eq("is_credit_note", true);

  const { data: invoices, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const clientIds = Array.from(
    new Set(
      (invoices ?? [])
        .map((i) => i.client_id)
        .filter((x): x is string => !!x),
    ),
  );
  const { data: clientsList } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id,first_name,last_name,company_name,email,siret,tva_intracom")
        .in("id", clientIds)
    : { data: [] };
  const clientsMap = new Map(
    (clientsList ?? []).map((c) => [c.id, c] as const),
  );

  const invoiceIds = (invoices ?? []).map((i) => i.id);
  const { data: payments } = invoiceIds.length
    ? await supabase
        .from("invoice_payments")
        .select("invoice_id,amount,paid_on,method,reference")
        .in("invoice_id", invoiceIds)
    : { data: [] };
  const paymentsByInvoice = new Map<string, typeof payments>();
  for (const p of payments ?? []) {
    const arr = paymentsByInvoice.get(p.invoice_id) ?? [];
    arr.push(p);
    paymentsByInvoice.set(p.invoice_id, arr);
  }

  const headers = [
    "type",
    "numero",
    "date_emission",
    "date_echeance",
    "date_prestation",
    "statut",
    "client",
    "client_siret",
    "client_tva",
    "sujet",
    "total_ht",
    "tva_taux",
    "total_tva",
    "total_ttc",
    "paye_total",
    "reste_a_encaisser",
    "source_facture",
    "paiements_detail",
  ];

  const rows: string[] = [];
  rows.push(headers.join(";"));

  for (const inv of invoices ?? []) {
    const client = inv.client_id ? clientsMap.get(inv.client_id) : null;
    const clientName =
      client?.company_name ||
      [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
      client?.email ||
      "";
    const pays = paymentsByInvoice.get(inv.id) ?? [];
    const paidTotal = pays.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const ttc = Number(inv.total_ttc ?? 0);
    const remaining = inv.is_credit_note
      ? 0
      : Math.round((ttc - paidTotal) * 100) / 100;
    const sourceNumber = inv.source_invoice_id
      ? (invoices ?? []).find((x) => x.id === inv.source_invoice_id)?.number ?? ""
      : "";
    const detail = pays
      .map(
        (p) =>
          `${p.paid_on}|${Number(p.amount).toFixed(2)}|${(p.method ?? "").replace(/[|;\n]/g, " ")}|${(p.reference ?? "").replace(/[|;\n]/g, " ")}`,
      )
      .join(" / ");

    rows.push(
      [
        inv.is_credit_note ? "AVOIR" : "FACTURE",
        inv.number,
        inv.issue_date,
        inv.due_date ?? "",
        inv.event_date ?? "",
        inv.status,
        clientName,
        client?.siret ?? "",
        client?.tva_intracom ?? "",
        inv.subject ?? "",
        Number(inv.total_ht ?? 0).toFixed(2),
        Number(inv.tva_rate ?? 0).toFixed(2),
        Number(inv.total_tva ?? 0).toFixed(2),
        ttc.toFixed(2),
        paidTotal.toFixed(2),
        remaining.toFixed(2),
        sourceNumber,
        detail,
      ]
        .map(csvCell)
        .join(";"),
    );
  }

  // UTF-8 BOM so Excel FR detects encoding + reads accents correctly.
  const body = "\uFEFF" + rows.join("\n");

  const range = [from, to].filter(Boolean).join("_") || "tous";
  const filename = `cosmo-club_${kind}_${range}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
