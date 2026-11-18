import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Database } from "@/types/database";
import { cgvVersion } from "@/lib/cgv";
import { SignedQuotePdf, type SignedQuoteData } from "@/lib/pdf/SignedQuotePdf";
import { getCompanyLogoDataUrl } from "@/lib/pdf/logo";

type Db = SupabaseClient<Database>;

/**
 * Charge tout ce qu'il faut pour le PDF d'un devis : devis, lignes,
 * client, coordonnées Cosmo Club, logo. Partagé par :
 *  - l'envoi du devis (PDF non signé en pièce jointe),
 *  - le bouton « Télécharger en PDF » de la plaquette,
 *  - l'acceptation (PDF signé joint aux emails de confirmation).
 *
 * `signature` null → version non signée (cadre « Bon pour accord » vide
 * et lien vers la plaquette pour signer en ligne).
 */
export async function loadQuotePdfData(
  db: Db,
  quoteId: string,
  opts: { signature: SignedQuoteData["signature"]; acceptUrl?: string | null },
): Promise<SignedQuoteData | null> {
  const { data: quote } = await db
    .from("quotes")
    .select(
      "number,subject,issue_date,event_date,event_end_date,event_location,guests_count,tva_rate,commission_rate,discount_global_pct,total_ht,total_tva,total_ttc,valid_until,client_id",
    )
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) return null;

  const [{ data: items }, { data: client }, { data: settings }] = await Promise.all([
    db
      .from("quote_items")
      .select("section,title,description,qty,unit,unit_price_ht,line_total_ht,discount_ht,position")
      .eq("quote_id", quoteId)
      .order("position", { ascending: true }),
    quote.client_id
      ? db
          .from("clients")
          .select("email,first_name,last_name,company_name,phone")
          .eq("id", quote.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("settings")
      .select("company_name,email,phone,address_line1,address_line2,postal_code,city,siret")
      .eq("id", 1)
      .maybeSingle(),
  ]);
  if (!items) return null;

  // Commission : les prix affichés au client sont « grossis » au rendu,
  // comme sur la plaquette en ligne.
  const rate = Number(quote.commission_rate ?? 0);
  const factor = rate > 0 ? 100 / (100 - rate) : 1;

  return {
    quote: {
      number: quote.number,
      subject: quote.subject,
      issue_date: quote.issue_date,
      event_date: quote.event_date,
      event_end_date: quote.event_end_date ?? null,
      event_location: quote.event_location,
      guests_count: quote.guests_count,
      tva_rate: Number(quote.tva_rate ?? 20),
      commission_rate: rate,
      discount_global_pct: Number(quote.discount_global_pct ?? 0),
      total_ht: Number(quote.total_ht ?? 0),
      total_tva: Number(quote.total_tva ?? 0),
      total_ttc: Number(quote.total_ttc ?? 0),
      valid_until: quote.valid_until ?? null,
    },
    items: items.map((it) => ({
      section: it.section,
      title: it.title,
      description: it.description,
      qty: Number(it.qty ?? 0),
      unit: it.unit,
      unit_price_ht: Number(it.unit_price_ht ?? 0) * factor,
      line_total_ht: Number(it.line_total_ht ?? 0) * factor,
      discount_ht: Number(it.discount_ht ?? 0) * factor,
    })),
    client: client
      ? {
          company_name: client.company_name,
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email,
          phone: client.phone ?? null,
        }
      : null,
    company: {
      name: settings?.company_name || "Cosmo Club Paris",
      address_line1: settings?.address_line1 ?? null,
      address_line2: settings?.address_line2 ?? null,
      postal_code: settings?.postal_code ?? null,
      city: settings?.city ?? null,
      siret: settings?.siret ?? null,
      email: settings?.email ?? null,
      phone: settings?.phone ?? null,
      logoDataUrl: await getCompanyLogoDataUrl(),
    },
    signature: opts.signature,
    cgvVersion: opts.signature?.cgvVersion ?? cgvVersion(),
    acceptUrl: opts.acceptUrl ?? null,
  };
}

export async function renderQuotePdf(data: SignedQuoteData): Promise<Buffer> {
  return renderToBuffer(<SignedQuotePdf data={data} />);
}

export function quotePdfFilename(number: string, signed: boolean): string {
  return signed ? `devis-${number}-signe.pdf` : `devis-${number}.pdf`;
}

/** Lien public de la plaquette, avec le jeton d'accès quand il existe. */
export function quotePublicUrl(number: string, accessToken: string | null | undefined): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cosmoclub.fr";
  return accessToken ? `${origin}/devis/${number}?t=${accessToken}` : `${origin}/devis/${number}`;
}
