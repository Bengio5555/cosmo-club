import { createAdminClient } from "@/lib/supabase/admin";
import { loadQuotePdfData, quotePdfFilename, quotePublicUrl, renderQuotePdf } from "@/lib/server/quotePdf";

// Bouton « Télécharger en PDF » de la plaquette publique.
// Mêmes garde-fous que la page /devis/[number] : statuts publics
// uniquement et jeton d'accès obligatoire quand le devis en a un
// (404 sinon, pour ne pas confirmer l'existence du numéro).
// Devis accepté avec signature enregistrée → PDF signé ; sinon PDF
// non signé avec le cadre « Bon pour accord » et le lien pour signer.

export const dynamic = "force-dynamic";

const PUBLIC_STATUSES = ["envoye", "accepte", "refuse", "expire"];

export async function GET(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const token = new URL(req.url).searchParams.get("t");
  const db = createAdminClient();

  const { data: quote } = await db
    .from("quotes")
    .select("id,number,status,access_token,signature_data,signed_by_name,accepted_at,signed_ip,cgv_version")
    .eq("number", number)
    .maybeSingle();
  if (!quote || !PUBLIC_STATUSES.includes(quote.status)) return new Response("Not found", { status: 404 });
  if (quote.access_token && quote.access_token !== token) return new Response("Not found", { status: 404 });

  const signed = quote.status === "accepte" && !!quote.signature_data && !!quote.accepted_at;
  const data = await loadQuotePdfData(db, quote.id, {
    signature: signed
      ? {
          name: quote.signed_by_name || "Client",
          signedAt: quote.accepted_at!,
          ip: quote.signed_ip,
          cgvVersion: quote.cgv_version || "",
          pngDataUrl: quote.signature_data!,
        }
      : null,
    acceptUrl: quote.status === "envoye" ? quotePublicUrl(quote.number, quote.access_token) : null,
  });
  if (!data) return new Response("Not found", { status: 404 });

  const pdf = await renderQuotePdf(data);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quotePdfFilename(quote.number, signed)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
