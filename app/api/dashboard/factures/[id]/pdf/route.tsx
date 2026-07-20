import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { fetchInvoicePdfData } from "@/lib/pdf/invoiceData";
import { InvoicePdf } from "@/lib/pdf/InvoicePdf";

// Force Node runtime — @react-pdf/renderer ships CJS + native pdfkit
// internals that don't run on the Edge runtime.
export const runtime = "nodejs";

/**
 * Server-generated PDF of one invoice, downloaded from the dashboard
 * list. Session-authenticated; RLS then decides whether this role can
 * read invoices (owner/admin/compta), others get a 404.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await fetchInvoicePdfData(supabase, id);
  if (!result) {
    return NextResponse.json({ error: "invoice not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<InvoicePdf data={result.data} />);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
