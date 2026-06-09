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
import { CGV_TEXT } from "@/lib/cgv";

// React 19 / @react-pdf v4 typing clash — same trick as CoursesPdf.tsx.
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

export type SignedQuoteData = {
  quote: {
    number: string;
    subject: string | null;
    issue_date: string;
    event_date: string | null;
    event_end_date?: string | null;
    event_location: string | null;
    guests_count: number | null;
    tva_rate: number;
    commission_rate: number;
    /** Global commercial discount in %, applied on subtotal HT after
     *  line discounts and before commission gross-up. 0 = no rebate. */
    discount_global_pct?: number;
    total_ht: number;
    total_tva: number;
    total_ttc: number;
  };
  items: Array<{
    section: string | null;
    title: string;
    description: string | null;
    qty: number;
    unit: string | null;
    unit_price_ht: number;
    line_total_ht: number;
    discount_ht?: number;
  }>;
  client: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  company: {
    name: string;
    address_line1: string | null;
    address_line2: string | null;
    postal_code: string | null;
    city: string | null;
    siret: string | null;
    email: string | null;
    phone: string | null;
    /** data:image/png;base64 logo to render in the PDF header. When
     *  null the template falls back to the company name in display
     *  type. */
    logoDataUrl: string | null;
  };
  signature: {
    name: string;
    signedAt: string; // ISO
    ip: string | null;
    cgvVersion: string;
    pngDataUrl: string;
  };
};

const c = {
  ink: "#1a1614",
  muted: "#5a5147",
  line: "#dcd6c9",
  grenat: "#8b1a1a",
  bg: "#fffaf2",
};
const DISPLAY = "Times-Roman";
const DISPLAY_BOLD = "Times-Bold";
const BODY = "Helvetica";
const BODY_BOLD = "Helvetica-Bold";

const s = StyleSheet.create({
  page: {
    fontFamily: BODY,
    fontSize: 10,
    color: c.ink,
    padding: 40,
    lineHeight: 1.45,
  },
  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.ink,
  },
  brand: {
    fontFamily: DISPLAY_BOLD,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  brandLogo: {
    // Logo is 1000×600 (5:3 ratio). Height capped at ~32 pt keeps the
    // header light; the source PNG is sharp enough at any DPI Adobe
    // Reader / Preview will request.
    width: 140,
    height: 32,
    objectFit: "contain",
  },
  brandSub: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: c.muted,
    textTransform: "uppercase",
    marginTop: 6,
  },
  doc: {
    alignItems: "flex-end",
  },
  docLabel: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: c.grenat,
  },
  docNumber: {
    fontFamily: DISPLAY_BOLD,
    fontSize: 16,
    marginTop: 2,
  },
  docMeta: {
    fontSize: 8.5,
    color: c.muted,
    marginTop: 3,
  },

  /* Parties */
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  party: {
    flexBasis: "48%",
  },
  partyLabel: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: c.muted,
    marginBottom: 4,
  },
  partyLine: { fontSize: 9.5, marginBottom: 1.5 },
  partyName: { fontFamily: BODY_BOLD, fontSize: 11, marginBottom: 2 },

  /* Items table */
  sectionHead: {
    fontFamily: DISPLAY_BOLD,
    fontSize: 11,
    color: c.grenat,
    marginTop: 12,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 0.6,
    borderBottomColor: c.grenat,
  },
  rowHead: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: c.line,
  },
  rowItem: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.4,
    borderBottomColor: c.line,
  },
  th: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: c.muted,
  },
  colTitle: { flex: 1, paddingRight: 6 },
  colQty: { width: 48, textAlign: "right" },
  colPu: { width: 60, textAlign: "right" },
  colSum: { width: 64, textAlign: "right" },
  cell: { fontSize: 9.5 },
  cellTitle: { fontFamily: BODY_BOLD },
  cellSub: { fontSize: 8, color: c.muted, marginTop: 1 },

  /* Totals */
  totalsBlock: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalsTable: {
    width: 220,
  },
  trow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  tlabel: { fontSize: 9.5, color: c.muted },
  tvalue: { fontSize: 9.5 },
  tfinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 0.8,
    borderTopColor: c.ink,
  },
  tfinalLabel: { fontFamily: BODY_BOLD, fontSize: 11 },
  tfinalValue: { fontFamily: BODY_BOLD, fontSize: 11 },

  /* Signature box */
  sigSection: {
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: c.ink,
  },
  sigGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  sigCol: {
    flexBasis: "48%",
  },
  sigLabel: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: c.muted,
    marginBottom: 6,
  },
  sigBox: {
    borderWidth: 0.7,
    borderColor: c.ink,
    borderRadius: 4,
    height: 90,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sigImage: { maxHeight: 72, maxWidth: 200 },
  audit: {
    marginTop: 10,
    fontSize: 8,
    color: c.muted,
    lineHeight: 1.5,
  },
  cgvNote: {
    fontSize: 7.5,
    color: c.muted,
    marginTop: 14,
    fontStyle: "italic",
    lineHeight: 1.5,
  },

  /* Footer page-num */
  pageNum: {
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7.5,
    color: c.muted,
  },

  /* CGV body (page 2) */
  cgvTitle: {
    fontFamily: DISPLAY_BOLD,
    fontSize: 16,
    color: c.ink,
    marginBottom: 12,
  },
  cgvSection: {
    fontFamily: DISPLAY_BOLD,
    fontSize: 11,
    color: c.grenat,
    marginTop: 10,
    marginBottom: 4,
  },
  cgvPara: { fontSize: 9, color: c.ink, marginBottom: 6 },
  cgvBullet: {
    fontSize: 9,
    color: c.ink,
    marginLeft: 8,
    marginBottom: 2,
  },
});

function formatDateFR(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTimeFR(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

/** Group line items by section in the order they first appear. */
function groupBySection(items: SignedQuoteData["items"]) {
  const buckets = new Map<string, SignedQuoteData["items"]>();
  for (const it of items) {
    const key = it.section?.trim() || "Prestations";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(it);
  }
  return Array.from(buckets.entries());
}

/** Tiny markdown parser for the CGV page (heading levels + bullets). */
function parseCgvBlocks(src: string) {
  const blocks: Array<
    | { kind: "h1"; text: string }
    | { kind: "h2"; text: string }
    | { kind: "p"; text: string }
    | { kind: "ul"; items: string[] }
  > = [];
  for (const raw of src.split(/\n\n+/)) {
    const b = raw.trim();
    if (!b) continue;
    if (b.startsWith("# ")) {
      blocks.push({ kind: "h1", text: b.slice(2) });
    } else if (b.startsWith("## ")) {
      blocks.push({ kind: "h2", text: b.slice(3) });
    } else if (b.split("\n").every((l) => l.trim().startsWith("- "))) {
      blocks.push({
        kind: "ul",
        items: b
          .split("\n")
          .map((l) => l.trim().slice(2))
          .map((t) => t.replace(/\*\*(.+?)\*\*/g, "$1")),
      });
    } else {
      blocks.push({ kind: "p", text: b.replace(/\*\*(.+?)\*\*/g, "$1") });
    }
  }
  return blocks;
}

export function SignedQuotePdf({ data }: { data: SignedQuoteData }) {
  const groups = groupBySection(data.items);
  const cgvBlocks = parseCgvBlocks(CGV_TEXT);
  const clientName =
    data.client?.company_name ||
    [data.client?.first_name, data.client?.last_name]
      .filter(Boolean)
      .join(" ") ||
    data.client?.email ||
    "—";

  return (
    <Document>
      {/* ─── PAGE 1 — Quote summary + signature ─── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            {data.company.logoDataUrl ? (
              <Image src={data.company.logoDataUrl} style={s.brandLogo} />
            ) : (
              <Text style={s.brand}>{data.company.name}</Text>
            )}
            <Text style={s.brandSub}>Cocktails · Barista · Événementiel</Text>
            {data.company.address_line1 && (
              <Text style={[s.partyLine, { color: c.muted, marginTop: 4 }]}>
                {[
                  data.company.address_line1,
                  data.company.postal_code,
                  data.company.city,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
          </View>
          <View style={s.doc}>
            <Text style={s.docLabel}>Devis signé</Text>
            <Text style={s.docNumber}>{data.quote.number}</Text>
            <Text style={s.docMeta}>
              Émis le {formatDateFR(data.quote.issue_date)}
            </Text>
            {data.quote.event_date && (
              <Text style={s.docMeta}>
                Événement&nbsp;:{" "}
                {data.quote.event_end_date &&
                data.quote.event_end_date.slice(0, 10) !==
                  data.quote.event_date.slice(0, 10)
                  ? `du ${formatDateFR(data.quote.event_date)} au ${formatDateFR(data.quote.event_end_date)}`
                  : formatDateFR(data.quote.event_date)}
              </Text>
            )}
          </View>
        </View>

        {/* Parties */}
        <View style={s.partiesRow}>
          <View style={s.party}>
            <Text style={s.partyLabel}>Prestataire</Text>
            <Text style={s.partyName}>{data.company.name}</Text>
            {data.company.email && (
              <Text style={s.partyLine}>{data.company.email}</Text>
            )}
            {data.company.phone && (
              <Text style={s.partyLine}>{data.company.phone}</Text>
            )}
            {data.company.siret && (
              <Text style={[s.partyLine, { color: c.muted }]}>
                SIRET {data.company.siret}
              </Text>
            )}
          </View>
          <View style={s.party}>
            <Text style={s.partyLabel}>Client</Text>
            <Text style={s.partyName}>{clientName}</Text>
            {data.client?.email && (
              <Text style={s.partyLine}>{data.client.email}</Text>
            )}
            {data.client?.phone && (
              <Text style={s.partyLine}>{data.client.phone}</Text>
            )}
            {data.quote.event_location && (
              <Text style={[s.partyLine, { color: c.muted, marginTop: 3 }]}>
                Lieu&nbsp;: {data.quote.event_location}
              </Text>
            )}
            {data.quote.guests_count && (
              <Text style={[s.partyLine, { color: c.muted }]}>
                Invités&nbsp;: {data.quote.guests_count}
              </Text>
            )}
          </View>
        </View>

        {/* Items grouped by section */}
        {groups.map(([sectionName, sectionItems], gi) => (
          <View key={`grp-${gi}`} wrap={false}>
            <Text style={s.sectionHead}>{sectionName}</Text>
            <View style={s.rowHead}>
              <Text style={[s.th, s.colTitle]}>Prestation</Text>
              <Text style={[s.th, s.colQty]}>Qté</Text>
              <Text style={[s.th, s.colPu]}>P.U. HT</Text>
              <Text style={[s.th, s.colSum]}>Total HT</Text>
            </View>
            {sectionItems.map((it, i) => (
              <View key={`r-${gi}-${i}`} style={s.rowItem}>
                <View style={s.colTitle}>
                  <Text style={[s.cell, s.cellTitle]}>{it.title}</Text>
                  {it.description && (
                    <Text style={s.cellSub}>{it.description}</Text>
                  )}
                  {it.discount_ht && it.discount_ht > 0 ? (
                    <Text style={[s.cellSub, { color: c.grenat }]}>
                      Remise commerciale : −{formatEURPdfSafe(it.discount_ht)}
                    </Text>
                  ) : null}
                </View>
                <Text style={[s.cell, s.colQty]}>
                  {it.qty}
                  {it.unit ? ` ${it.unit}` : ""}
                </Text>
                <Text style={[s.cell, s.colPu]}>
                  {formatEURPdfSafe(it.unit_price_ht)}
                </Text>
                <Text style={[s.cell, s.colSum]}>
                  {formatEURPdfSafe(it.line_total_ht)}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsBlock}>
          <View style={s.totalsTable}>
            {/* Global commercial discount, surfaced as a distinct row
                when present. total_ht is already post-discount and
                post-commission, so we invert the discount factor to
                reconstruct the pre-rebate subtotal the client expects
                to see. Mirrors the HTML plaquette + invoice. */}
            {Number(data.quote.discount_global_pct ?? 0) > 0 && (() => {
              const pct = Number(data.quote.discount_global_pct);
              const pre = data.quote.total_ht / (1 - pct / 100);
              const rebate = pre - data.quote.total_ht;
              return (
                <>
                  <View style={s.trow}>
                    <Text style={s.tlabel}>Sous-total HT</Text>
                    <Text style={s.tvalue}>{formatEURPdfSafe(pre)}</Text>
                  </View>
                  <View style={s.trow}>
                    <Text style={s.tlabel}>
                      Remise commerciale (−{pct}%)
                    </Text>
                    <Text style={s.tvalue}>
                      − {formatEURPdfSafe(rebate)}
                    </Text>
                  </View>
                </>
              );
            })()}
            <View style={s.trow}>
              <Text style={s.tlabel}>Total HT</Text>
              <Text style={s.tvalue}>{formatEURPdfSafe(data.quote.total_ht)}</Text>
            </View>
            <View style={s.trow}>
              <Text style={s.tlabel}>TVA {data.quote.tva_rate}%</Text>
              <Text style={s.tvalue}>{formatEURPdfSafe(data.quote.total_tva)}</Text>
            </View>
            <View style={s.tfinal}>
              <Text style={s.tfinalLabel}>Total TTC</Text>
              <Text style={s.tfinalValue}>
                {formatEURPdfSafe(data.quote.total_ttc)}
              </Text>
            </View>
          </View>
        </View>

        {/* Signature + audit */}
        <View style={s.sigSection} wrap={false}>
          <Text style={s.partyLabel}>Acceptation et signature</Text>
          <View style={s.sigGrid}>
            <View style={s.sigCol}>
              <Text style={s.sigLabel}>Bon pour accord — {data.signature.name}</Text>
              <View style={s.sigBox}>
                <Image src={data.signature.pngDataUrl} style={s.sigImage} />
              </View>
            </View>
            <View style={s.sigCol}>
              <Text style={s.sigLabel}>Audit signature électronique</Text>
              <Text style={s.audit}>
                Horodatage&nbsp;: {formatDateTimeFR(data.signature.signedAt)}
              </Text>
              {data.signature.ip && (
                <Text style={s.audit}>IP&nbsp;: {data.signature.ip}</Text>
              )}
              <Text style={s.audit}>
                Version CGV signée&nbsp;: {data.signature.cgvVersion}
              </Text>
              <Text style={s.audit}>
                Acceptation explicite des conditions générales de vente
                (case cochée puis tracé manuscrit). Conformément à
                l&apos;article 1366 du Code civil, ce document a la
                même force probante qu&apos;une signature manuscrite.
              </Text>
            </View>
          </View>

          <Text style={s.cgvNote}>
            Conditions générales de vente reproduites en page 2 du présent
            document, telles que présentées au client lors de la signature.
          </Text>
        </View>

        <Text
          style={s.pageNum}
          render={({
            pageNumber,
            totalPages,
          }: {
            pageNumber: number;
            totalPages: number;
          }) =>
            `${data.company.name} — Devis ${data.quote.number} — page ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* ─── PAGE 2+ — CGV reproduced verbatim ─── */}
      <Page size="A4" style={s.page}>
        <Text style={s.cgvTitle}>Conditions générales de vente</Text>
        <Text style={[s.cgvPara, { color: c.muted }]}>
          Document de référence — version {data.signature.cgvVersion}
        </Text>
        {cgvBlocks.map((b, i) => {
          if (b.kind === "h1") return null; // already shown above as title
          if (b.kind === "h2")
            return (
              <Text key={i} style={s.cgvSection}>
                {b.text}
              </Text>
            );
          if (b.kind === "p")
            return (
              <Text key={i} style={s.cgvPara}>
                {b.text}
              </Text>
            );
          // ul
          return (
            <View key={i}>
              {b.items.map((li, li2) => (
                <Text key={li2} style={s.cgvBullet}>
                  • {li}
                </Text>
              ))}
            </View>
          );
        })}
        <Text
          style={s.pageNum}
          render={({
            pageNumber,
            totalPages,
          }: {
            pageNumber: number;
            totalPages: number;
          }) =>
            `${data.company.name} — Devis ${data.quote.number} — page ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
