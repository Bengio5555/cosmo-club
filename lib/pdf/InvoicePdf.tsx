import * as React from "react";
import {
  Document as _Document,
  Page as _Page,
  Text as _Text,
  View as _View,
  Image as _Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatEURPdfSafe } from "@/lib/format";

// React 19 / @react-pdf v4 typing clash — same trick as SignedQuotePdf.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Document = _Document as unknown as React.FC<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Page = _Page as unknown as React.FC<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Text = _Text as unknown as React.FC<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const View = _View as unknown as React.FC<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Image = _Image as unknown as React.FC<any>;

export type InvoicePdfData = {
  invoice: {
    number: string;
    is_credit_note: boolean;
    status: string;
    issue_date: string;
    due_date: string | null;
    event_date: string | null;
    event_end_date: string | null;
    subject: string | null;
    terms: string | null;
    tva_rate: number;
    discount_global_pct: number;
    total_ht: number;
    total_tva: number;
    total_ttc: number;
    paid_at: string | null;
    credit_note_reason: string | null;
  };
  items: Array<{
    title: string;
    description: string | null;
    qty: number;
    unit: string | null;
    unit_price_ht: number;
    discount_ht: number;
    line_total_ht: number;
  }>;
  client: {
    name: string;
    billing_address: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    siret: string | null;
    tva_intracom: string | null;
    email: string | null;
  } | null;
  legal: {
    company_name: string | null;
    legal_form: string | null;
    siret: string | null;
    tva_intracom: string | null;
    tva_franchise: boolean;
    address_line1: string | null;
    address_line2: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    iban: string | null;
    bic: string | null;
    penalty_rate_text: string | null;
  };
  sourceInvoice: { number: string; issue_date: string } | null;
  logoDataUrl: string | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtDateFR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const c = {
  ink: "#1a1614",
  muted: "#5a5147",
  line: "#dcd6c9",
  grenat: "#8b1a1a",
  bg: "#fffaf2",
};
const DISPLAY_BOLD = "Times-Bold";
const BODY = "Helvetica";
const BODY_BOLD = "Helvetica-Bold";

const s = StyleSheet.create({
  page: {
    fontFamily: BODY,
    fontSize: 9.5,
    color: c.ink,
    padding: 40,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.ink,
  },
  brandLogo: { height: 34, objectFit: "contain", alignSelf: "flex-start" },
  brandName: { fontFamily: DISPLAY_BOLD, fontSize: 18, letterSpacing: 0.5 },
  brandTag: { fontSize: 8, color: c.muted, marginTop: 4 },
  titleBox: { alignItems: "flex-end" },
  eyebrow: {
    fontSize: 8,
    color: c.grenat,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontFamily: BODY_BOLD,
  },
  number: { fontFamily: DISPLAY_BOLD, fontSize: 16, marginTop: 2 },
  titleMeta: { fontSize: 8.5, color: c.muted, marginTop: 4, textAlign: "right" },

  parties: { flexDirection: "row", gap: 18, marginBottom: 16 },
  party: {
    flex: 1,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 4,
    padding: 10,
  },
  label: {
    fontSize: 7.5,
    color: c.grenat,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontFamily: BODY_BOLD,
    marginBottom: 4,
  },
  partyName: { fontFamily: BODY_BOLD, fontSize: 10.5, marginBottom: 3 },
  partyBody: { fontSize: 8.5, color: c.muted },

  subject: { marginBottom: 14 },
  subjectLine: { fontFamily: BODY_BOLD, fontSize: 11 },
  subjectSub: { fontSize: 8.5, color: c.muted, marginTop: 2 },

  table: { marginBottom: 16 },
  thead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: c.ink,
    paddingBottom: 4,
    marginBottom: 2,
  },
  th: {
    fontSize: 7.5,
    fontFamily: BODY_BOLD,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: c.muted,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: c.line,
    paddingVertical: 5,
  },
  colDesignation: { flex: 1, paddingRight: 8 },
  colQty: { width: 40, textAlign: "right" },
  colUnit: { width: 52, textAlign: "right" },
  colPrice: { width: 68, textAlign: "right" },
  colTotal: { width: 74, textAlign: "right" },
  lineTitle: { fontFamily: BODY_BOLD, fontSize: 9.5 },
  lineDesc: { fontSize: 8, color: c.muted, marginTop: 1.5 },
  lineDiscount: { fontSize: 8, color: c.grenat, marginTop: 1.5 },
  strike: {
    fontSize: 8,
    color: c.muted,
    textDecoration: "line-through",
  },
  strong: { fontFamily: BODY_BOLD },

  bottom: { flexDirection: "row", gap: 18, marginTop: 4 },
  payBlock: { flex: 1, paddingRight: 6 },
  payNotes: { fontSize: 8.5, color: c.muted, marginBottom: 4 },
  paySmall: { fontSize: 7.5, color: c.muted, marginBottom: 3 },

  totalsBox: {
    width: 210,
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 4,
    padding: 10,
  },
  totRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 9,
  },
  totDiscount: { color: c.grenat },
  totGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: c.ink,
    paddingTop: 5,
    marginTop: 2,
    fontFamily: BODY_BOLD,
    fontSize: 11,
  },
  paid: {
    marginTop: 8,
    fontSize: 8.5,
    color: "#1a7a3d",
    fontFamily: BODY_BOLD,
  },
  cancelled: {
    marginTop: 8,
    fontSize: 8.5,
    color: c.grenat,
    fontFamily: BODY_BOLD,
  },

  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 26,
    borderTopWidth: 0.5,
    borderTopColor: c.line,
    paddingTop: 6,
    fontSize: 7,
    color: c.muted,
    textAlign: "center",
  },
});

/**
 * Server-rendered PDF of an invoice / credit note. Mirrors the public
 * HTML page (app/factures/[number]) line for line so the downloaded
 * document is fiscally identical to what the client received: frozen
 * legal snapshot, per-line + global discounts, TVA franchise handling,
 * acquittée / annulée stamps and the legal footer.
 */
export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const { invoice, items, client, legal, sourceInvoice, logoDataUrl } = data;
  const docLabel = invoice.is_credit_note ? "Avoir" : "Facture";
  const discountPct = Number(invoice.discount_global_pct ?? 0);
  const preDiscountHt =
    discountPct > 0
      ? round2(Number(invoice.total_ht) / (1 - discountPct / 100))
      : null;

  return (
    <Document
      title={`${docLabel} ${invoice.number}`}
      author={legal.company_name ?? "Cosmo Club Paris"}
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            {logoDataUrl ? (
              <Image src={logoDataUrl} style={s.brandLogo} />
            ) : (
              <Text style={s.brandName}>
                {legal.company_name ?? "Cosmo Club Paris"}
              </Text>
            )}
            <Text style={s.brandTag}>Cocktails · Barista · Événementiel</Text>
          </View>
          <View style={s.titleBox}>
            <Text style={s.eyebrow}>{docLabel}</Text>
            <Text style={s.number}>{invoice.number}</Text>
            <Text style={s.titleMeta}>
              Émis{invoice.is_credit_note ? "" : "e"} le{" "}
              {fmtDateFR(invoice.issue_date)}
            </Text>
            {!invoice.is_credit_note && invoice.due_date && (
              <Text style={s.titleMeta}>
                Échéance : {fmtDateFR(invoice.due_date)}
              </Text>
            )}
            {invoice.is_credit_note && sourceInvoice && (
              <Text style={s.titleMeta}>
                Sur facture {sourceInvoice.number}
              </Text>
            )}
          </View>
        </View>

        {/* Parties */}
        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>Émetteur</Text>
            <Text style={s.partyName}>
              {legal.company_name ?? "—"}
              {legal.legal_form ? ` · ${legal.legal_form}` : ""}
            </Text>
            <Text style={s.partyBody}>
              {[
                [legal.address_line1, legal.address_line2]
                  .filter(Boolean)
                  .join(", "),
                [
                  [legal.postal_code, legal.city].filter(Boolean).join(" "),
                  legal.country,
                ]
                  .filter(Boolean)
                  .join(", "),
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
            <Text style={s.partyBody}>
              {[
                legal.siret ? `SIRET : ${legal.siret}` : null,
                legal.tva_intracom && !legal.tva_franchise
                  ? `TVA intra. : ${legal.tva_intracom}`
                  : null,
                legal.email,
                legal.phone,
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          </View>
          <View style={s.party}>
            <Text style={s.label}>Destinataire</Text>
            <Text style={s.partyName}>{client?.name ?? "—"}</Text>
            <Text style={s.partyBody}>
              {[
                client?.billing_address,
                [
                  [client?.postal_code, client?.city].filter(Boolean).join(" "),
                  client?.country,
                ]
                  .filter(Boolean)
                  .join(", "),
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
            <Text style={s.partyBody}>
              {[
                client?.siret ? `SIRET : ${client.siret}` : null,
                client?.tva_intracom
                  ? `TVA intra. : ${client.tva_intracom}`
                  : null,
                client?.email,
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
          </View>
        </View>

        {/* Subject / context */}
        {(invoice.subject ||
          invoice.event_date ||
          invoice.credit_note_reason) && (
          <View style={s.subject}>
            {invoice.subject && (
              <Text style={s.subjectLine}>{invoice.subject}</Text>
            )}
            {invoice.event_date && (
              <Text style={s.subjectSub}>
                {invoice.event_end_date &&
                invoice.event_end_date.slice(0, 10) !==
                  invoice.event_date.slice(0, 10)
                  ? `Dates de la prestation : du ${fmtDateFR(invoice.event_date)} au ${fmtDateFR(invoice.event_end_date)}`
                  : `Date de la prestation : ${fmtDateFR(invoice.event_date)}`}
              </Text>
            )}
            {invoice.is_credit_note && invoice.credit_note_reason && (
              <Text style={s.subjectSub}>
                Motif : {invoice.credit_note_reason}
              </Text>
            )}
            {invoice.is_credit_note && sourceInvoice && (
              <Text style={s.subjectSub}>
                Annule/rectifie la facture {sourceInvoice.number} émise le{" "}
                {fmtDateFR(sourceInvoice.issue_date)}.
              </Text>
            )}
          </View>
        )}

        {/* Lines */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.colDesignation]}>Désignation</Text>
            <Text style={[s.th, s.colQty]}>Qté</Text>
            <Text style={[s.th, s.colUnit]}>Unité</Text>
            <Text style={[s.th, s.colPrice]}>PU HT</Text>
            <Text style={[s.th, s.colTotal]}>Total HT</Text>
          </View>
          {items.map((it, i) => {
            const discount = Number(it.discount_ht ?? 0);
            const gross = round2(
              Number(it.qty ?? 0) * Number(it.unit_price_ht ?? 0),
            );
            return (
              <View key={i} style={s.tr} wrap={false}>
                <View style={s.colDesignation}>
                  <Text style={s.lineTitle}>{it.title}</Text>
                  {it.description ? (
                    <Text style={s.lineDesc}>{it.description}</Text>
                  ) : null}
                  {discount > 0 ? (
                    <Text style={s.lineDiscount}>
                      Remise commerciale : −{formatEURPdfSafe(discount)}
                    </Text>
                  ) : null}
                </View>
                <Text style={s.colQty}>{it.qty}</Text>
                <Text style={s.colUnit}>{it.unit ?? ""}</Text>
                <Text style={s.colPrice}>
                  {formatEURPdfSafe(it.unit_price_ht ?? 0)}
                </Text>
                <View style={s.colTotal}>
                  {discount > 0 ? (
                    <>
                      <Text style={s.strike}>{formatEURPdfSafe(gross)}</Text>
                      <Text style={s.strong}>
                        {formatEURPdfSafe(it.line_total_ht ?? 0)}
                      </Text>
                    </>
                  ) : (
                    <Text style={s.strong}>
                      {formatEURPdfSafe(it.line_total_ht ?? 0)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Payment terms + totals */}
        <View style={s.bottom} wrap={false}>
          <View style={s.payBlock}>
            {invoice.is_credit_note ? (
              <>
                <Text style={s.label}>Traitement de l&apos;avoir</Text>
                <Text style={s.payNotes}>
                  Montant à déduire du solde dû sur la facture d&apos;origine,
                  ou remboursé par virement sur le compte du client le cas
                  échéant.
                </Text>
                <Text style={s.paySmall}>
                  Document rectificatif — article 289, I-2° du CGI.
                </Text>
              </>
            ) : (
              <>
                <Text style={s.label}>Conditions de paiement</Text>
                <Text style={s.payNotes}>
                  {invoice.terms?.trim() ||
                    (legal.iban
                      ? `Paiement par virement — IBAN ${legal.iban}${legal.bic ? `, BIC ${legal.bic}` : ""}.`
                      : "Paiement par virement ou chèque à l'ordre de l'émetteur.")}
                </Text>
                {legal.penalty_rate_text ? (
                  <Text style={s.paySmall}>{legal.penalty_rate_text}</Text>
                ) : null}
                <Text style={s.paySmall}>
                  Indemnité forfaitaire de recouvrement : 40 € (art. L441-10
                  C. com.).
                </Text>
              </>
            )}
            {legal.tva_franchise ? (
              <Text style={s.paySmall}>
                TVA non applicable, art. 293 B du CGI.
              </Text>
            ) : null}
          </View>

          <View style={s.totalsBox}>
            {preDiscountHt != null && (
              <>
                <View style={s.totRow}>
                  <Text>Sous-total HT</Text>
                  <Text>{formatEURPdfSafe(preDiscountHt)}</Text>
                </View>
                <View style={[s.totRow, s.totDiscount]}>
                  <Text>Remise commerciale (−{discountPct}%)</Text>
                  <Text>
                    − {formatEURPdfSafe(round2(preDiscountHt - Number(invoice.total_ht)))}
                  </Text>
                </View>
              </>
            )}
            <View style={s.totRow}>
              <Text>Total HT</Text>
              <Text>{formatEURPdfSafe(invoice.total_ht)}</Text>
            </View>
            <View style={s.totRow}>
              <Text>
                {legal.tva_franchise ? "TVA" : `TVA ${invoice.tva_rate}%`}
              </Text>
              <Text>
                {legal.tva_franchise
                  ? "Non applicable"
                  : formatEURPdfSafe(invoice.total_tva)}
              </Text>
            </View>
            <View style={s.totGrand}>
              <Text>Total TTC</Text>
              <Text>{formatEURPdfSafe(invoice.total_ttc)}</Text>
            </View>
            {!invoice.is_credit_note && invoice.status === "paye" && (
              <Text style={s.paid}>
                ✓ Facture acquittée le {fmtDateFR(invoice.paid_at)}
              </Text>
            )}
            {invoice.status === "annule" && (
              <Text style={s.cancelled}>
                {invoice.is_credit_note ? "Avoir annulé" : "Facture annulée"}
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>
            {legal.company_name ?? "Cosmo Club Paris"}
            {legal.siret ? ` · SIRET ${legal.siret}` : ""}
            {legal.tva_intracom && !legal.tva_franchise
              ? ` · TVA ${legal.tva_intracom}`
              : ""}
          </Text>
          <Text>
            {docLabel} {invoice.number} — conservé
            {invoice.is_credit_note ? "" : "e"} 10 ans conformément à
            l&apos;article L123-22 du Code de commerce.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
