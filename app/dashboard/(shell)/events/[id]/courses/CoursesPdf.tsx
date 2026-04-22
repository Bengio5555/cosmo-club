import * as React from "react";
import {
  Document as _Document,
  Page as _Page,
  Text as _Text,
  View as _View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { CoursesData } from "./computeCoursesData";
import { formatDateFR, formatEUR } from "@/lib/format";

// @react-pdf/renderer v4 ships class components whose JSX signature
// clashes with React 19's stricter element typing ("does not have a
// 'props' property"). Cast once here so the rest of the file reads
// like idiomatic JSX.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Document = _Document as unknown as React.FC<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Page = _Page as unknown as React.FC<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Text = _Text as unknown as React.FC<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const View = _View as unknown as React.FC<any>;

/**
 * React-PDF layout for the shopping list. Keep visual fidelity close to
 * the HTML page (same hierarchy, same wording) but natively structured
 * in react-pdf primitives so the output is a real vector PDF — no
 * browser / rasterisation required.
 *
 * Uses react-pdf's bundled PDF core fonts (Helvetica + Times-Roman)
 * to avoid any runtime font fetch on Vercel serverless. Custom brand
 * fonts can be added later via Font.register with a local
 * /public/fonts asset if we want Fraunces/Inter exactly.
 */
const DISPLAY = "Times-Roman";
const DISPLAY_BOLD = "Times-Bold";
const BODY = "Helvetica";
const BODY_BOLD = "Helvetica-Bold";

const c = {
  ink: "#1a1614",
  muted: "#5a5147",
  line: "#dcd6c9",
  grenat: "#8b1a1a",
};

const s = StyleSheet.create({
  page: {
    fontFamily: BODY,
    fontSize: 10,
    color: c.ink,
    padding: 40,
    lineHeight: 1.5,
  },

  /* Header */
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: c.ink,
    paddingBottom: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: c.grenat,
    marginBottom: 4,
    fontWeight: 500,
  },
  title: {
    fontFamily: DISPLAY_BOLD,
    fontSize: 20,
    color: c.ink,
    marginBottom: 6,
  },
  metaLine: {
    fontSize: 10,
    color: c.muted,
  },
  metaStrong: {
    color: c.ink,
    fontFamily: BODY_BOLD,
  },
  menuBlock: {
    width: 200,
    alignItems: "flex-end",
  },
  menuLabel: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: c.muted,
    marginBottom: 4,
  },
  menuRow: {
    fontSize: 10,
    color: c.ink,
    textAlign: "right",
  },
  menuSub: {
    fontSize: 8,
    color: c.muted,
    marginTop: 4,
    fontStyle: "italic",
  },

  /* Supplier group */
  group: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderBottomWidth: 0.8,
    borderBottomColor: c.ink,
    paddingBottom: 4,
    marginBottom: 6,
  },
  supplierName: {
    fontFamily: DISPLAY_BOLD,
    fontSize: 13,
  },
  supplierCount: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: c.muted,
  },

  /* Table */
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: c.line,
    paddingBottom: 4,
    paddingTop: 4,
  },
  th: {
    fontSize: 6.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: c.muted,
    fontWeight: 500,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: c.line,
    paddingVertical: 6,
    alignItems: "flex-start",
  },
  colCheck: { width: 16 },
  checkBox: {
    width: 9,
    height: 9,
    borderWidth: 0.8,
    borderColor: c.ink,
    borderRadius: 1.5,
    marginTop: 2,
  },
  colName: { flex: 1, paddingRight: 6 },
  colQty: { width: 44, textAlign: "right" },
  colUnit: { width: 32, textAlign: "right" },
  colPU: { width: 46, textAlign: "right" },
  colTotal: { width: 54, textAlign: "right" },
  cellText: { fontSize: 10, color: c.ink },
  prodName: { fontFamily: BODY_BOLD },
  prodSub: { fontSize: 7.5, color: c.muted, marginTop: 1.5 },
  qtyBig: { fontSize: 11, fontFamily: BODY_BOLD },
  unitSmall: { fontSize: 7.5, color: c.muted, textTransform: "lowercase" },

  /* Subtotal */
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    paddingTop: 4,
  },
  subtotalLabel: { fontSize: 9, color: c.muted },
  subtotalValue: { fontSize: 9, fontFamily: BODY_BOLD, color: c.ink },

  /* Total */
  totalBlock: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: c.ink,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  totalLabel: {
    fontFamily: DISPLAY_BOLD,
    fontSize: 15,
  },
  totalValue: {
    fontFamily: DISPLAY_BOLD,
    fontSize: 18,
  },

  /* Footer */
  footer: {
    marginTop: 18,
    paddingTop: 8,
    borderTopWidth: 0.4,
    borderTopColor: c.line,
    fontSize: 8,
    color: c.muted,
    textAlign: "center",
  },

  /* Empty state */
  empty: {
    marginTop: 40,
    padding: 30,
    textAlign: "center",
    backgroundColor: "rgba(139, 26, 26, 0.04)",
    borderWidth: 0.5,
    borderColor: c.line,
    borderRadius: 4,
    color: c.muted,
    fontSize: 11,
  },
});

export function CoursesPdf({ data }: { data: CoursesData }) {
  const { event, clientName, menuLines, totalCocktails, supplierGroups, grandTotal, mode, missingMenu } = data;
  const showOnlyShortage = mode === "shortage";

  return (
    <Document
      title={`Liste de courses – ${event.title}`}
      author="Cosmo Club Paris"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Liste de courses</Text>
            <Text style={s.title}>{event.title}</Text>
            <Text style={s.metaLine}>
              <Text style={s.metaStrong}>
                {event.date ? formatDateFR(event.date) : ""}
              </Text>
              {event.location ? ` · ${event.location}` : ""}
            </Text>
            {clientName && (
              <Text style={s.metaLine}>
                Client : <Text style={s.metaStrong}>{clientName}</Text>
                {event.guests_count ? ` · ${event.guests_count} invités` : ""}
              </Text>
            )}
          </View>

          {menuLines.length > 0 && (
            <View style={s.menuBlock}>
              <Text style={s.menuLabel}>Menu prévu</Text>
              {menuLines.map((m, i) => (
                <Text key={i} style={s.menuRow}>
                  <Text style={s.metaStrong}>× {m.qty}</Text> · {m.name}
                </Text>
              ))}
              <Text style={s.menuSub}>Total : {totalCocktails} cocktails</Text>
            </View>
          )}
        </View>

        {supplierGroups.length === 0 ? (
          <View style={s.empty}>
            <Text>
              {missingMenu
                ? "Aucun menu saisi pour cet événement — ajoute des cocktails sur la fiche event pour générer la liste."
                : showOnlyShortage
                  ? "✓ Tout est en stock. Aucune course à faire pour cet événement."
                  : "Aucun produit à acheter."}
            </Text>
          </View>
        ) : (
          supplierGroups.map((g) => (
            <View key={g.name} style={s.group} wrap={false}>
              <View style={s.groupHeader}>
                <Text style={s.supplierName}>{g.name}</Text>
                <Text style={s.supplierCount}>
                  {g.lines.length} produit{g.lines.length > 1 ? "s" : ""}
                </Text>
              </View>

              {/* Header row */}
              <View style={s.tableHead}>
                <View style={s.colCheck} />
                <Text style={[s.th, s.colName]}>Produit</Text>
                <Text style={[s.th, s.colQty]}>À acheter</Text>
                <Text style={[s.th, s.colUnit]}>Unité</Text>
                <Text style={[s.th, s.colPU]}>PU</Text>
                <Text style={[s.th, s.colTotal]}>Total</Text>
              </View>

              {/* Lines */}
              {g.lines.map((l) => (
                <View key={l.productId} style={s.row} wrap={false}>
                  <View style={s.colCheck}>
                    <View style={s.checkBox} />
                  </View>
                  <View style={s.colName}>
                    <Text style={[s.cellText, s.prodName]}>{l.productName}</Text>
                    <Text style={s.prodSub}>
                      {l.category}
                      {l.perUnit && l.contentUnit
                        ? ` · ${l.perUnit} ${l.contentUnit}/${l.unit}`
                        : ""}
                      {showOnlyShortage
                        ? ` · besoin ${l.packsNeeded}, stock ${l.stockQty}`
                        : ""}
                    </Text>
                  </View>
                  <Text style={[s.cellText, s.colQty, s.qtyBig]}>{l.toBuy}</Text>
                  <Text style={[s.cellText, s.colUnit, s.unitSmall]}>{l.unit}</Text>
                  <Text style={[s.cellText, s.colPU]}>
                    {l.costPerPack != null ? formatEUR(l.costPerPack) : "—"}
                  </Text>
                  <Text style={[s.cellText, s.colTotal]}>
                    {l.lineCost != null ? formatEUR(l.lineCost) : "—"}
                  </Text>
                </View>
              ))}

              {g.subtotal > 0 && (
                <View style={s.subtotalRow}>
                  <Text style={s.subtotalLabel}>
                    Sous-total {g.name} :
                  </Text>
                  <Text style={s.subtotalValue}>{formatEUR(g.subtotal)}</Text>
                </View>
              )}
            </View>
          ))
        )}

        {supplierGroups.length > 0 && grandTotal > 0 && (
          <View style={s.totalBlock}>
            <Text style={s.totalLabel}>
              {showOnlyShortage ? "Total à acheter" : "Total matière"}
            </Text>
            <Text style={s.totalValue}>{formatEUR(grandTotal)}</Text>
          </View>
        )}

        <Text style={s.footer} fixed>
          Cosmo Club Paris · Liste générée le{" "}
          {formatDateFR(new Date(), { withTime: true })} · À valider à
          réception fournisseur.
        </Text>
      </Page>
    </Document>
  );
}
