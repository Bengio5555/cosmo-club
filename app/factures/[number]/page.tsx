import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateFR, formatEUR } from "@/lib/format";
import "./invoice.css";

type Params = Promise<{ number: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Drafts stay private; anything beyond is accessible via the URL in the
// email. Same model as the devis plaquette.
const PUBLIC_STATUSES = ["envoye", "paye", "en_retard", "annule"] as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { number } = await params;
  const label = number.startsWith("AV-") ? "Avoir" : "Facture";
  return {
    title: `${label} ${number} — Cosmo Club Paris`,
    robots: { index: false, follow: false },
  };
}

type LegalSnapshot = {
  company_name?: string | null;
  legal_form?: string | null;
  siret?: string | null;
  tva_intracom?: string | null;
  tva_franchise?: boolean | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  iban?: string | null;
  bic?: string | null;
  penalty_rate_text?: string | null;
};

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { number } = await params;
  const sp = await searchParams;
  const providedToken = typeof sp.t === "string" ? sp.t : null;
  const supabase = createAdminClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("number", number)
    .maybeSingle();

  if (
    !invoice ||
    !PUBLIC_STATUSES.includes(invoice.status as (typeof PUBLIC_STATUSES)[number])
  ) {
    notFound();
  }

  // IDOR guard: factures émises après l'activation du token ont un
  // access_token NOT NULL. Sans le bon token dans ?t=, on 404 plutôt
  // que 403 pour ne pas confirmer l'existence du numéro.
  // Les anciennes factures (access_token IS NULL) restent accessibles
  // par numéro seul — sinon on casse les liens email déjà envoyés.
  if (invoice.access_token && invoice.access_token !== providedToken) {
    notFound();
  }

  const [{ data: items }, { data: settings }, { data: client }, { data: sourceInvoice }] =
    await Promise.all([
      supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("position", { ascending: true }),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      invoice.client_id
        ? supabase.from("clients").select("*").eq("id", invoice.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      invoice.is_credit_note && invoice.source_invoice_id
        ? supabase
            .from("invoices")
            .select("number,issue_date")
            .eq("id", invoice.source_invoice_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  // Prefer the frozen legal snapshot captured at issuance; fall back to
  // current settings only for drafts that aren't yet stamped (shouldn't
  // happen since drafts 404).
  const legal: LegalSnapshot =
    (invoice.legal_snapshot as LegalSnapshot | null) || (settings as LegalSnapshot) || {};

  const clientName =
    client?.company_name ||
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    client?.email ||
    "—";

  return (
    <div className="invoice-body">
      {/* Print-only helper banner for the owner previewing */}
      <div className="invoice-print-hint no-print">
        Utilise ⌘/Ctrl + P pour enregistrer cette facture en PDF.
      </div>

      <article className="invoice">
        {/* ─── Header ─── */}
        <header className="invoice-header">
          <div className="invoice-brand">
            <div className="invoice-brand-mark">CC</div>
            <div>
              <p className="invoice-brand-name">
                {legal.company_name ?? "Cosmo Club Paris"}
              </p>
              <p className="invoice-brand-tag">Bar à cocktails · Barista événementiel</p>
            </div>
          </div>

          <div className="invoice-title-box">
            <p className="invoice-eyebrow">
              {invoice.is_credit_note ? "Avoir" : "Facture"}
            </p>
            <h1 className="invoice-number">{invoice.number}</h1>
            <dl className="invoice-title-meta">
              <div>
                <dt>Émis{invoice.is_credit_note ? "" : "e"} le</dt>
                <dd>{formatDateFR(invoice.issue_date)}</dd>
              </div>
              {!invoice.is_credit_note && invoice.due_date && (
                <div>
                  <dt>Échéance</dt>
                  <dd>{formatDateFR(invoice.due_date)}</dd>
                </div>
              )}
              {invoice.is_credit_note && sourceInvoice && (
                <div>
                  <dt>Sur facture</dt>
                  <dd>{sourceInvoice.number}</dd>
                </div>
              )}
            </dl>
          </div>
        </header>

        {/* ─── Sender / Recipient ─── */}
        <section className="invoice-parties">
          <div className="invoice-party">
            <p className="invoice-label">Émetteur</p>
            <p className="invoice-party-name">
              {legal.company_name ?? "—"}
              {legal.legal_form ? ` · ${legal.legal_form}` : ""}
            </p>
            <p className="invoice-party-body">
              {legal.address_line1 && (
                <>
                  {legal.address_line1}
                  {legal.address_line2 ? `, ${legal.address_line2}` : ""}
                  <br />
                </>
              )}
              {(legal.postal_code || legal.city) && (
                <>
                  {[legal.postal_code, legal.city].filter(Boolean).join(" ")}
                  {legal.country ? `, ${legal.country}` : ""}
                </>
              )}
            </p>
            <p className="invoice-party-body">
              {legal.siret && <>SIRET&nbsp;: {legal.siret}<br /></>}
              {legal.tva_intracom && !legal.tva_franchise && (
                <>TVA intra.&nbsp;: {legal.tva_intracom}<br /></>
              )}
              {legal.email && <>{legal.email}<br /></>}
              {legal.phone}
            </p>
          </div>

          <div className="invoice-party">
            <p className="invoice-label">Destinataire</p>
            <p className="invoice-party-name">{clientName}</p>
            <p className="invoice-party-body">
              {client?.billing_address && (
                <>
                  {client.billing_address}
                  <br />
                </>
              )}
              {(client?.postal_code || client?.city) && (
                <>
                  {[client?.postal_code, client?.city].filter(Boolean).join(" ")}
                  {client?.country ? `, ${client.country}` : ""}
                </>
              )}
            </p>
            <p className="invoice-party-body">
              {client?.siret && <>SIRET&nbsp;: {client.siret}<br /></>}
              {client?.tva_intracom && <>TVA intra.&nbsp;: {client.tva_intracom}<br /></>}
              {client?.email}
            </p>
          </div>
        </section>

        {/* ─── Subject / event context ─── */}
        {(invoice.subject || invoice.event_date || invoice.credit_note_reason) && (
          <section className="invoice-subject">
            {invoice.subject && <p className="invoice-subject-line">{invoice.subject}</p>}
            {invoice.event_date && (
              <p className="invoice-subject-sub">
                Date de la prestation&nbsp;: {formatDateFR(invoice.event_date)}
              </p>
            )}
            {invoice.is_credit_note && invoice.credit_note_reason && (
              <p className="invoice-subject-sub">
                Motif&nbsp;: {invoice.credit_note_reason}
              </p>
            )}
            {invoice.is_credit_note && sourceInvoice && (
              <p className="invoice-subject-sub">
                Annule/rectifie la facture {sourceInvoice.number} émise le{" "}
                {formatDateFR(sourceInvoice.issue_date)}.
              </p>
            )}
          </section>
        )}

        {/* ─── Lines ─── */}
        <section className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="col-designation">Désignation</th>
                <th className="col-qty">Qté</th>
                <th className="col-unit">Unité</th>
                <th className="col-price">PU HT</th>
                <th className="col-total">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((it) => (
                <tr key={it.id}>
                  <td>
                    <p className="line-title">{it.title}</p>
                    {it.description && <p className="line-desc">{it.description}</p>}
                  </td>
                  <td className="num">{it.qty}</td>
                  <td className="num">{it.unit ?? ""}</td>
                  <td className="num">{formatEUR(it.unit_price_ht ?? 0)}</td>
                  <td className="num strong">
                    {formatEUR(it.line_total_ht ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ─── Totals ─── */}
        <section className="invoice-totals">
          <div>
            {invoice.is_credit_note ? (
              <>
                <p className="invoice-label">Traitement de l&apos;avoir</p>
                <p className="invoice-paynotes">
                  Montant à déduire du solde dû sur la facture d&apos;origine,
                  ou remboursé par virement sur le compte du client le cas
                  échéant.
                </p>
                {legal.tva_franchise && (
                  <p className="invoice-paynotes small">
                    TVA non applicable, art. 293 B du CGI.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="invoice-label">Conditions de paiement</p>
                <p className="invoice-paynotes">
                  {invoice.terms?.trim() || (
                    <>
                      Paiement par virement{" "}
                      {legal.iban ? (
                        <>
                          — IBAN {legal.iban}
                          {legal.bic ? `, BIC ${legal.bic}` : ""}
                        </>
                      ) : (
                        "ou chèque à l'ordre de l'émetteur"
                      )}
                      .
                    </>
                  )}
                </p>
                {legal.penalty_rate_text && (
                  <p className="invoice-paynotes small">
                    {legal.penalty_rate_text}
                  </p>
                )}
                <p className="invoice-paynotes small">
                  Indemnité forfaitaire de recouvrement&nbsp;: 40&nbsp;€ (art. L441-10 C. com.).
                </p>
                {legal.tva_franchise && (
                  <p className="invoice-paynotes small">
                    TVA non applicable, art. 293 B du CGI.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="invoice-totals-box">
            <div className="row">
              <span>Total HT</span>
              <span>{formatEUR(invoice.total_ht)}</span>
            </div>
            <div className="row">
              <span>
                {legal.tva_franchise ? "TVA" : `TVA ${invoice.tva_rate}%`}
              </span>
              <span>
                {legal.tva_franchise
                  ? "Non applicable"
                  : formatEUR(invoice.total_tva)}
              </span>
            </div>
            <div className="row grand">
              <span>Total TTC</span>
              <span>{formatEUR(invoice.total_ttc)}</span>
            </div>
            {!invoice.is_credit_note && invoice.status === "paye" && (
              <p className="invoice-paid">
                ✓ Facture acquittée le {formatDateFR(invoice.paid_at)}
              </p>
            )}
            {invoice.status === "annule" && (
              <p className="invoice-cancelled">
                {invoice.is_credit_note ? "Avoir annulé" : "Facture annulée"}
              </p>
            )}
            {invoice.is_credit_note && (
              <p className="invoice-paynotes small" style={{ marginTop: 12 }}>
                Document rectificatif — article 289, I-2° du CGI. Montant à
                déduire du solde dû.
              </p>
            )}
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="invoice-footer">
          <p>
            {legal.company_name ?? "Cosmo Club Paris"}
            {legal.siret ? ` · SIRET ${legal.siret}` : ""}
            {legal.tva_intracom && !legal.tva_franchise
              ? ` · TVA ${legal.tva_intracom}`
              : ""}
          </p>
          <p>
            {invoice.is_credit_note ? "Avoir" : "Facture"} {invoice.number} —
            conservé{invoice.is_credit_note ? "" : "e"} 10 ans conformément à
            l&apos;article L123-22 du Code de commerce.
          </p>
        </footer>
      </article>
    </div>
  );
}
