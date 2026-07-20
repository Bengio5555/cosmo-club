import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { fetchInvoicePdfData } from "@/lib/pdf/invoiceData";
import { InvoicePdf } from "@/lib/pdf/InvoicePdf";

export const runtime = "nodejs";
// Rendering N invoices to PDF is CPU-bound; give the function room
// beyond the default duration when exporting a busy period.
export const maxDuration = 120;

/** Hard cap: keeps the function within time/memory budgets. */
const MAX_INVOICES = 100;

/**
 * ZIP of invoice PDFs, honouring the same from/to/kind filters as the
 * CSV export (issue_date range + factures/avoirs). Rendered
 * sequentially to bound memory; every PDF is identical to the
 * single-download route since both go through fetchInvoicePdfData.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const kind = sp.get("kind");

  let q = supabase
    .from("invoices")
    .select("id,number")
    .neq("status", "brouillon")
    .order("issue_date", { ascending: true })
    .limit(MAX_INVOICES + 1);
  if (from) q = q.gte("issue_date", from);
  if (to) q = q.lte("issue_date", to);
  if (kind === "factures") q = q.eq("is_credit_note", false);
  if (kind === "avoirs") q = q.eq("is_credit_note", true);

  const { data: invoices, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!invoices || invoices.length === 0) {
    return NextResponse.json(
      { error: "Aucune facture émise sur ce filtre." },
      { status: 404 },
    );
  }
  const truncated = invoices.length > MAX_INVOICES;
  const list = invoices.slice(0, MAX_INVOICES);

  const zip = new JSZip();
  for (const inv of list) {
    const result = await fetchInvoicePdfData(supabase, inv.id);
    if (!result) continue;
    const buffer = await renderToBuffer(<InvoicePdf data={result.data} />);
    zip.file(result.filename, buffer);
  }
  if (truncated) {
    zip.file(
      "ATTENTION_export_tronque.txt",
      `Plus de ${MAX_INVOICES} factures correspondent au filtre — seules les ${MAX_INVOICES} premières (par date d'émission) sont incluses. Resserre la période (Du / Au) et relance l'export pour obtenir la suite.`,
    );
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const range = [from, to].filter(Boolean).join("_");
  const filename = `factures${range ? `_${range}` : ""}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
