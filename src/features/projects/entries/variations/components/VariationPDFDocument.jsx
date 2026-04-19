import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from "@react-pdf/renderer";
import { formatMoney, formatDate } from "../../../../../utils/formatters";

/* ═══════════════════════════════════════════════════════════════
   FONT REGISTRATION
   Cairo supports Arabic + Latin in one file.
   We load from /public/fonts/ (Vite serves public/* at root).
════════════════════════════════════════════════════════════════ */
const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

Font.register({
  family: "Cairo",
  fonts: [
    { src: `${ORIGIN}/fonts/Cairo-Regular.ttf`, fontWeight: 400 },
    { src: `${ORIGIN}/fonts/Cairo-Bold.ttf`,    fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
════════════════════════════════════════════════════════════════ */
const T = {
  black:     "#0A0A0A",
  navy:      "#0B1629",
  gold:      "#B8960C",
  goldLight: "#F5E9C0",
  white:     "#FFFFFF",
  offWhite:  "#F8F7F4",
  gray1:     "#1A1A1A",
  gray3:     "#444444",
  gray5:     "#888888",
  gray7:     "#BBBBBB",
  gray9:     "#EEEEEE",
  border:    "#D4D0C8",
  negRed:    "#7B0000",
  negLight:  "#FFF0F0",
  posGreen:  "#004D1A",
  posLight:  "#F0FFF4",
  headerBg:  "#0B1629",
  rowAlt:    "#F8F7F4",
};

/* ═══════════════════════════════════════════════════════════════
   STYLES
════════════════════════════════════════════════════════════════ */
const S = StyleSheet.create({
  /* Page */
  page: {
    fontFamily: "Cairo",
    fontSize: 9,
    color: T.gray1,
    backgroundColor: T.white,
    paddingTop: 52,
    paddingBottom: 52,
    paddingLeft: 40,
    paddingRight: 40,
  },

  /* ── Running header (fixed) ── */
  runningHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: T.navy,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 40,
    justifyContent: "space-between",
  },
  runningHeaderText: {
    fontFamily: "Cairo",
    fontSize: 7.5,
    color: "rgba(255,255,255,0.55)",
    fontWeight: 400,
  },
  runningHeaderBrand: {
    fontFamily: "Cairo",
    fontSize: 8,
    fontWeight: 700,
    color: T.gold,
  },

  /* ── Running footer (fixed) ── */
  runningFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: T.offWhite,
    borderTopWidth: 1,
    borderTopColor: T.border,
    borderTopStyle: "solid",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 40,
    justifyContent: "space-between",
  },
  runningFooterText: {
    fontFamily: "Cairo",
    fontSize: 7.5,
    color: T.gray5,
  },
  runningFooterPage: {
    fontFamily: "Cairo",
    fontSize: 7.5,
    color: T.gray5,
  },

  /* ── Document header (logo / company / doc type) ── */
  docHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: "solid",
    borderRadius: 2,
    overflow: "hidden",
  },
  /* Gold left accent bar */
  docHeaderAccent: {
    width: 4,
    backgroundColor: T.gold,
  },
  docHeaderLogo: {
    width: 64,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.offWhite,
    borderRightWidth: 1,
    borderRightColor: T.border,
    borderRightStyle: "solid",
  },
  logoImg: { width: 48, height: 48, objectFit: "contain" },
  docHeaderCenter: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  /* Bilingual company name: Arabic right, English left */
  companyNameRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 2,
  },
  companyNameAr: {
    fontFamily: "Cairo",
    fontSize: 13,
    fontWeight: 700,
    color: T.black,
  },
  companyNameEn: {
    fontFamily: "Cairo",
    fontSize: 8.5,
    fontWeight: 400,
    color: T.gray3,
  },
  docHeaderRight: {
    width: 100,
    borderLeftWidth: 1,
    borderLeftColor: T.border,
    borderLeftStyle: "solid",
    backgroundColor: T.navy,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docTypeLabelAr: {
    fontFamily: "Cairo",
    fontSize: 11,
    fontWeight: 700,
    color: T.gold,
    textAlign: "center",
    marginBottom: 2,
  },
  docTypeLabelEn: {
    fontFamily: "Cairo",
    fontSize: 7,
    fontWeight: 400,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  docDate: {
    fontFamily: "Cairo",
    fontSize: 8,
    color: T.white,
    textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 2,
  },

  /* ── Section ── */
  section: { marginBottom: 14 },

  /* Bilingual section title */
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: T.navy,
    borderBottomStyle: "solid",
    paddingBottom: 4,
  },
  sectionTitleAr: {
    fontFamily: "Cairo",
    fontSize: 10,
    fontWeight: 700,
    color: T.navy,
    flex: 1,
    textAlign: "right",
  },
  sectionTitleSep: {
    width: 1,
    height: 12,
    backgroundColor: T.gold,
    marginHorizontal: 8,
  },
  sectionTitleEn: {
    fontFamily: "Cairo",
    fontSize: 8.5,
    fontWeight: 700,
    color: T.gray3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
    textAlign: "left",
  },

  /* ── Info grid (bilingual key–value pairs) ── */
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: "solid",
    marginBottom: 8,
  },
  infoCell: {
    width: "33.33%",
    borderRightWidth: 0.5,
    borderRightColor: T.border,
    borderRightStyle: "solid",
    borderBottomWidth: 0.5,
    borderBottomColor: T.border,
    borderBottomStyle: "solid",
    padding: 7,
  },
  infoCellWide: {
    width: "50%",
    borderRightWidth: 0.5,
    borderRightColor: T.border,
    borderRightStyle: "solid",
    borderBottomWidth: 0.5,
    borderBottomColor: T.border,
    borderBottomStyle: "solid",
    padding: 7,
  },
  infoCellFull: {
    width: "100%",
    borderBottomWidth: 0.5,
    borderBottomColor: T.border,
    borderBottomStyle: "solid",
    padding: 7,
  },
  /* Inside each cell: English label top-left, Arabic label top-right */
  infoCellLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  infoCellLabelEn: {
    fontFamily: "Cairo",
    fontSize: 6.5,
    fontWeight: 700,
    color: T.gray5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoCellLabelAr: {
    fontFamily: "Cairo",
    fontSize: 7,
    fontWeight: 700,
    color: T.gray5,
  },
  infoCellValue: {
    fontFamily: "Cairo",
    fontSize: 9,
    color: T.gray1,
    fontWeight: 400,
    textAlign: "right",
  },
  infoCellValueMono: {
    fontFamily: "Cairo",
    fontSize: 9,
    color: T.navy,
    fontWeight: 700,
    textAlign: "left",
  },

  /* ── Items Table ── */
  table: {
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: "solid",
    marginBottom: 4,
  },
  /* Table header row — navy background */
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: T.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: T.gold,
    borderBottomStyle: "solid",
  },
  /* Bilingual column header */
  thCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  thAr: {
    fontFamily: "Cairo",
    fontSize: 7.5,
    fontWeight: 700,
    color: T.white,
    textAlign: "center",
  },
  thEn: {
    fontFamily: "Cairo",
    fontSize: 6,
    fontWeight: 400,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    textTransform: "uppercase",
  },
  /* Data row */
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: T.border,
    borderBottomStyle: "solid",
    minHeight: 22,
  },
  tableRowAlt: { backgroundColor: T.rowAlt },
  /* Data cell */
  tdCell: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    justifyContent: "center",
  },
  tdText: {
    fontFamily: "Cairo",
    fontSize: 8.5,
    color: T.gray1,
    textAlign: "right",
  },
  tdTextCenter: {
    fontFamily: "Cairo",
    fontSize: 8.5,
    color: T.gray1,
    textAlign: "center",
  },
  tdTextLeft: {
    fontFamily: "Cairo",
    fontSize: 8.5,
    color: T.gray1,
    textAlign: "left",
  },
  tdMono: {
    fontFamily: "Cairo",
    fontSize: 8.5,
    color: T.gray1,
    textAlign: "right",
  },
  /* Amount cell colored */
  tdAmountNeg: { color: T.negRed, fontWeight: 700, fontFamily: "Cairo", fontSize: 8.5, textAlign: "right" },
  tdAmountPos: { color: T.posGreen, fontWeight: 700, fontFamily: "Cairo", fontSize: 8.5, textAlign: "right" },
  /* Footer row */
  tableFooterRow: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderTopColor: T.navy,
    borderTopStyle: "solid",
    backgroundColor: T.offWhite,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableFooterLabel: {
    flex: 1,
    fontFamily: "Cairo",
    fontSize: 9,
    fontWeight: 700,
    color: T.navy,
    textAlign: "right",
  },
  tableFooterValue: {
    width: 90,
    fontFamily: "Cairo",
    fontSize: 9,
    fontWeight: 700,
    textAlign: "right",
  },

  /* Column widths */
  colDesc:   { flex: 4 },
  colQty:    { width: 36 },
  colUnit:   { width: 30 },
  colRate:   { width: 68 },
  colOHP:    { width: 36 },
  colAmount: { width: 80 },

  /* ── Financial Summary ── */
  summaryTable: {
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: "solid",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: T.border,
    borderBottomStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  summaryRowAlt: { backgroundColor: T.rowAlt },
  summaryRowBold: { backgroundColor: T.offWhite },
  summaryRowNegLight: { backgroundColor: T.negLight },
  summaryRowPosLight: { backgroundColor: T.posLight },
  /* Bilingual label */
  summaryLabelWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  summaryLabelEn: { fontFamily: "Cairo", fontSize: 7.5, color: T.gray5 },
  summaryLabelSep: { fontSize: 8, color: T.gray7 },
  summaryLabelAr: { fontFamily: "Cairo", fontSize: 8.5, color: T.gray1, textAlign: "right" },
  summaryLabelArBold: { fontFamily: "Cairo", fontSize: 9, fontWeight: 700, color: T.navy, textAlign: "right" },
  summaryValue: {
    width: 110,
    fontFamily: "Cairo",
    fontSize: 9,
    textAlign: "right",
    color: T.gray1,
  },
  summaryValueBold: { fontWeight: 700, color: T.navy },
  summaryValueNeg: { color: T.negRed, fontWeight: 700 },
  summaryValuePos: { color: T.posGreen, fontWeight: 700 },
  /* Final row */
  summaryFinalRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.navy,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  summaryFinalLabelWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  summaryFinalLabelEn: { fontFamily: "Cairo", fontSize: 8, color: "rgba(255,255,255,0.55)" },
  summaryFinalLabelAr: { fontFamily: "Cairo", fontSize: 11, fontWeight: 700, color: T.white },
  summaryFinalValue: {
    width: 120,
    fontFamily: "Cairo",
    fontSize: 13,
    fontWeight: 700,
    color: T.gold,
    textAlign: "right",
  },

  /* ── Remarks box ── */
  remarksBox: {
    fontFamily: "Cairo",
    fontSize: 8.5,
    color: T.gray3,
    lineHeight: 1.6,
    padding: 10,
    backgroundColor: T.offWhite,
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: "solid",
    textAlign: "right",
  },

  /* ── Gold divider ── */
  goldLine: {
    height: 1.5,
    backgroundColor: T.gold,
    marginBottom: 4,
    opacity: 0.35,
  },
});

/* ═══════════════════════════════════════════════════════════════
   HELPER COMPONENTS
════════════════════════════════════════════════════════════════ */

/** Bilingual section title */
const SectionTitle = ({ ar, en }) => (
  <View style={S.sectionTitleRow}>
    <Text style={S.sectionTitleEn}>{en}</Text>
    <View style={S.sectionTitleSep} />
    <Text style={S.sectionTitleAr}>{ar}</Text>
  </View>
);

/** Info grid cell with bilingual label */
const InfoCell = ({ labelAr, labelEn, value, wide, full, mono }) => (
  <View style={full ? S.infoCellFull : wide ? S.infoCellWide : S.infoCell}>
    <View style={S.infoCellLabels}>
      <Text style={S.infoCellLabelEn}>{labelEn}</Text>
      <Text style={S.infoCellLabelAr}>{labelAr}</Text>
    </View>
    <Text style={mono ? S.infoCellValueMono : S.infoCellValue}>
      {value || "—"}
    </Text>
  </View>
);

/** Bilingual table column header */
const Th = ({ ar, en, style }) => (
  <View style={[S.thCell, style]}>
    <Text style={S.thAr}>{ar}</Text>
    <Text style={S.thEn}>{en}</Text>
  </View>
);

/** Items table */
const ItemsTable = ({ items, isOmitted, tAr, tEn }) => {
  if (!items || items.length === 0) return null;
  const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const accentColor = isOmitted ? T.negRed : T.posGreen;
  const accentLight = isOmitted ? T.negLight : T.posLight;

  return (
    <View style={S.table}>
      {/* Header */}
      <View style={S.tableHeaderRow}>
        <Th style={S.colDesc}  ar={tAr("item_description", "وصف الصنف")} en={tEn("item_description", "Description")} />
        <Th style={S.colQty}   ar={tAr("quantity", "الكمية")}            en={tEn("quantity", "Qty")} />
        <Th style={S.colUnit}  ar={tAr("unit", "الوحدة")}               en={tEn("unit", "Unit")} />
        <Th style={S.colRate}  ar={tAr("rate", "السعر")}                en={tEn("rate", "Rate")} />
        {isOmitted && <Th style={S.colOHP} ar="O.H&P" en="O.H&P" />}
        <Th style={S.colAmount} ar={tAr("amount", "المبلغ")}            en={tEn("amount", "Amount")} />
      </View>

      {/* Rows */}
      {items.map((item, idx) => (
        <View key={idx} style={[S.tableRow, idx % 2 === 1 && S.tableRowAlt]}>
          {/* Description — right-aligned Arabic */}
          <View style={[S.tdCell, S.colDesc]}>
            <Text style={S.tdText}>{item.description || "—"}</Text>
          </View>
          <View style={[S.tdCell, S.colQty]}>
            <Text style={S.tdTextCenter}>{item.qty ?? "—"}</Text>
          </View>
          <View style={[S.tdCell, S.colUnit]}>
            <Text style={S.tdTextCenter}>{item.unit || "LS"}</Text>
          </View>
          <View style={[S.tdCell, S.colRate]}>
            <Text style={S.tdMono}>{formatMoney(item.rate || 0)}</Text>
          </View>
          {isOmitted && (
            <View style={[S.tdCell, S.colOHP]}>
              <Text style={S.tdTextCenter}>
                {item.includesOverheadProfit ? "✓" : "—"}
              </Text>
            </View>
          )}
          <View style={[S.tdCell, S.colAmount, { backgroundColor: `${accentLight}55` }]}>
            <Text style={isOmitted ? S.tdAmountNeg : S.tdAmountPos}>
              {formatMoney(item.amount || 0)}
            </Text>
          </View>
        </View>
      ))}

      {/* Footer */}
      <View style={[S.tableFooterRow, { borderTopColor: accentColor }]}>
        <Text style={S.tableFooterLabel}>
          {isOmitted
            ? `${tEn("total_omitted", "Total Omitted")}  |  ${tAr("total_omitted", "الإجمالي المحذوف")}`
            : `${tEn("total_added", "Total Added")}  |  ${tAr("total_added", "الإجمالي المضاف")}`
          }
        </Text>
        <Text style={[S.tableFooterValue, { color: accentColor }]}>
          {isOmitted ? `− ${formatMoney(total)}` : `+ ${formatMoney(total)}`}
        </Text>
      </View>
    </View>
  );
};

/** Summary row — bilingual label */
const SummaryRow = ({ labelAr, labelEn, value, valueStyle, rowStyle }) => (
  <View style={[S.summaryRow, rowStyle]}>
    <View style={S.summaryLabelWrap}>
      <Text style={S.summaryLabelEn}>{labelEn}</Text>
      <Text style={S.summaryLabelSep}>|</Text>
      <Text style={S.summaryLabelAr}>{labelAr}</Text>
    </View>
    <Text style={[S.summaryValue, valueStyle]}>{value}</Text>
  </View>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN DOCUMENT
════════════════════════════════════════════════════════════════ */
const VariationPDFDocument = ({
  variation, project, companyInfo, noticeData, translations = {},
}) => {
  /* Translation helpers — Arabic and English separately */
  const AR = {
    variation_order:          "أمر التغيير",
    variation_details:        "تفاصيل التعديل",
    project_name:             "اسم المشروع",
    project_no:               "رقم المشروع",
    variation_no:             "رقم التعديل",
    reference_no:             "الرقم المرجعي",
    document_date:            "تاريخ المستند",
    project_address:          "عنوان المشروع",
    trade_discipline:         "التخصص / الحرفة",
    variation_cause:          "سبب التعديل",
    additional_time:          "الوقت الإضافي",
    variation_description:    "وصف التعديل",
    omitted_items:            "المحذوف (حسب العقد)",
    added_items:              "المضاف (حسب المورد الفعلي)",
    item_description:         "وصف الصنف",
    quantity:                 "الكمية",
    unit:                     "الوحدة",
    rate:                     "السعر",
    amount:                   "المبلغ",
    total_omitted:            "الإجمالي المحذوف",
    total_added:              "الإجمالي المضاف",
    variation_summary:        "ملخص التعديل",
    total_variation_amount:   "إجمالي مبلغ التعديل",
    contractor_ohp:           "رأس مال وربح المقاول",
    consultant_fees:          "أتعاب الاستشاري",
    total_before_discount:    "الإجمالي قبل الخصم",
    discount:                 "الخصم",
    final_amount:             "المبلغ النهائي",
    remarks:                  "ملاحظات",
  };

  const tAr = (key, fallback = "") => AR[key] || fallback;
  const tEn = (key, fallback = "") => translations[key] || fallback || key;

  /* Parse notice data */
  const data = (() => {
    if (noticeData) return noticeData;
    if (!variation?.description) return {};
    try { return JSON.parse(variation.description); }
    catch { return {}; }
  })();

  /* Financials */
  const totalOmitted         = parseFloat(data.total_omitted)                || 0;
  const totalAdded           = parseFloat(data.total_added)                  || 0;
  const totalVariation       = parseFloat(data.total_variation_amount)       || (totalAdded - totalOmitted);
  const contractorOHP        = parseFloat(data.contractor_engineering_oh_p)  || 0;
  const consultantFees       = parseFloat(data.consultant_fees)              || 0;
  const totalBeforeDiscount  = parseFloat(data.total_amount_before_discount) || (totalVariation + contractorOHP + consultantFees);
  const discountAmount       = parseFloat(data.discount_amount)              || 0;
  const discountPct          = parseFloat(data.discount_percentage)          || 0;
  const finalAmount          = parseFloat(data.total_amount || variation?.total_amount) || 0;

  const omittedItems = data.omitted_items || [];
  const addedItems   = data.added_items   || [];

  const projectNo = () =>
    project?.contract_data?.tender_no ||
    project?.awarding_data?.project_number ||
    project?.siteplan?.project_no ||
    project?.internal_code ||
    (project?.id ? `PRJ-${project.id}` : "—");

  const projectLocation = () => {
    const sp = project?.siteplan || project?.siteplan_data;
    if (!sp) return "—";
    return [sp.municipality, sp.zone, sp.sector, sp.land_no].filter(Boolean).join(" - ") || "—";
  };

  const companyNameAr = companyInfo?.name || "";
  const companyNameEn = companyInfo?.name_en || "";

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Fixed Running Header ── */}
        <View style={S.runningHeader} fixed>
          <Text style={S.runningHeaderText}>
            {tEn("variation_order", "Variation Order")} · {variation?.variation_number || ""}
          </Text>
          <Text style={S.runningHeaderBrand}>{companyNameEn || companyNameAr}</Text>
        </View>

        {/* ── Document Header ── */}
        <View style={S.docHeader}>
          <View style={S.docHeaderAccent} />
          <View style={S.docHeaderLogo}>
            {companyInfo?.logo
              ? <Image src={companyInfo.logo} style={S.logoImg} />
              : <View style={{ width: 48, height: 48 }} />}
          </View>
          <View style={S.docHeaderCenter}>
            <View style={S.companyNameRow}>
              {companyNameEn ? (
                <Text style={S.companyNameEn}>{companyNameEn}</Text>
              ) : null}
              {companyNameAr ? (
                <Text style={S.companyNameAr}>{companyNameAr}</Text>
              ) : null}
            </View>
            {/* Gold separator line */}
            <View style={{ height: 1, backgroundColor: T.gold, width: 120, opacity: 0.5, marginTop: 2 }} />
          </View>
          <View style={S.docHeaderRight}>
            <Text style={S.docTypeLabelAr}>{tAr("variation_order")}</Text>
            <Text style={S.docTypeLabelEn}>Variation Order</Text>
            <Text style={S.docDate}>
              {formatDate(data.document_date || variation?.created_at)}
            </Text>
          </View>
        </View>

        {/* ── Project / Variation Details ── */}
        <View style={S.section}>
          <SectionTitle ar={tAr("variation_details")} en="Variation Details" />
          <View style={S.infoGrid}>
            <InfoCell
              wide
              labelAr={tAr("project_name")} labelEn="Project Name"
              value={project?.display_name || project?.name}
            />
            <InfoCell
              labelAr={tAr("project_no")} labelEn="Project No."
              value={projectNo()} mono
            />
            <InfoCell
              labelAr={tAr("variation_no")} labelEn="Variation No."
              value={variation?.variation_number || data.reference_no} mono
            />
            <InfoCell
              labelAr={tAr("reference_no")} labelEn="Reference No."
              value={data.reference_no || variation?.variation_number} mono
            />
            <InfoCell
              labelAr={tAr("document_date")} labelEn="Document Date"
              value={formatDate(data.document_date || variation?.created_at)}
            />
            <InfoCell
              labelAr={tAr("project_address")} labelEn="Location"
              value={projectLocation()}
            />
            {data.trade_discipline && (
              <InfoCell
                labelAr={tAr("trade_discipline")} labelEn="Trade / Discipline"
                value={data.trade_discipline}
              />
            )}
            {data.variation_cause && (
              <InfoCell
                labelAr={tAr("variation_cause")} labelEn="Cause"
                value={data.variation_cause}
              />
            )}
            {data.additional_time && (
              <InfoCell
                labelAr={tAr("additional_time")} labelEn="Additional Time"
                value={data.additional_time}
              />
            )}
          </View>
          {data.variation_description && (
            <Text style={S.remarksBox}>{data.variation_description}</Text>
          )}
        </View>

        {/* ── Omitted Items ── */}
        {omittedItems.length > 0 && (
          <View style={S.section}>
            <SectionTitle
              ar={tAr("omitted_items")}
              en="Omitted Items (As per Contract)"
            />
            <ItemsTable items={omittedItems} isOmitted tAr={tAr} tEn={tEn} />
          </View>
        )}

        {/* ── Added Items ── */}
        {addedItems.length > 0 && (
          <View style={S.section}>
            <SectionTitle
              ar={tAr("added_items")}
              en="Added Items (As per Actual Supplied)"
            />
            <ItemsTable items={addedItems} isOmitted={false} tAr={tAr} tEn={tEn} />
          </View>
        )}

        {/* ── Financial Summary ── */}
        <View style={S.section}>
          <SectionTitle ar={tAr("variation_summary")} en="Financial Summary" />
          <View style={S.summaryTable}>

            <SummaryRow
              labelAr={tAr("total_omitted")} labelEn="Total Omitted"
              value={`− ${formatMoney(totalOmitted)}`}
              valueStyle={S.summaryValueNeg}
              rowStyle={S.summaryRowNegLight}
            />
            <SummaryRow
              labelAr={tAr("total_added")} labelEn="Total Added"
              value={`+ ${formatMoney(totalAdded)}`}
              valueStyle={S.summaryValuePos}
              rowStyle={S.summaryRowPosLight}
            />
            <SummaryRow
              labelAr={tAr("total_variation_amount")} labelEn="Total Variation Amount"
              value={formatMoney(totalVariation)}
              valueStyle={S.summaryValueBold}
              rowStyle={S.summaryRowBold}
            />

            {contractorOHP !== 0 && (
              <SummaryRow
                labelAr={`${tAr("contractor_ohp")}${data.contractor_ohp_percentage ? ` (${data.contractor_ohp_percentage}%)` : ""}`}
                labelEn={`Contractor OH&P${data.contractor_ohp_percentage ? ` (${data.contractor_ohp_percentage}%)` : ""}`}
                value={formatMoney(contractorOHP)}
                rowStyle={S.summaryRowAlt}
              />
            )}

            {consultantFees !== 0 && (
              <SummaryRow
                labelAr={`${tAr("consultant_fees")}${data.consultant_fees_percentage ? ` (${data.consultant_fees_percentage}%)` : ""}`}
                labelEn={`Consultant Fees${data.consultant_fees_percentage ? ` (${data.consultant_fees_percentage}%)` : ""}`}
                value={formatMoney(consultantFees)}
              />
            )}

            {(contractorOHP !== 0 || consultantFees !== 0) && (
              <SummaryRow
                labelAr={tAr("total_before_discount")} labelEn="Sub-Total Before Discount"
                value={formatMoney(totalBeforeDiscount)}
                valueStyle={S.summaryValueBold}
                rowStyle={S.summaryRowBold}
              />
            )}

            {discountAmount > 0 && (
              <SummaryRow
                labelAr={`${tAr("discount")}${discountPct > 0 ? ` (${discountPct.toFixed(1)}%)` : ""}`}
                labelEn={`Discount${discountPct > 0 ? ` (${discountPct.toFixed(1)}%)` : ""}`}
                value={`− ${formatMoney(discountAmount)}`}
                valueStyle={S.summaryValueNeg}
                rowStyle={S.summaryRowNegLight}
              />
            )}

            {/* Final Amount */}
            <View style={S.summaryFinalRow}>
              <View style={S.summaryFinalLabelWrap}>
                <Text style={S.summaryFinalLabelEn}>Net Amount</Text>
                <Text style={[S.summaryFinalLabelEn, { color: "rgba(255,255,255,0.3)" }]}>|</Text>
                <Text style={S.summaryFinalLabelAr}>{tAr("final_amount")}</Text>
              </View>
              <Text style={S.summaryFinalValue}>{formatMoney(finalAmount)}</Text>
            </View>

          </View>
        </View>

        {/* ── Remarks ── */}
        {data.remarks && (
          <View style={S.section}>
            <SectionTitle ar={tAr("remarks")} en="Remarks / Notes" />
            <Text style={S.remarksBox}>{data.remarks}</Text>
          </View>
        )}

        {/* ── Signature block ── */}
        <View style={{ marginTop: 20, flexDirection: "row", gap: 20 }}>
          {[
            { ar: "توقيع المقاول", en: "Contractor Signature" },
            { ar: "توقيع الاستشاري", en: "Consultant Signature" },
            { ar: "توقيع صاحب العمل", en: "Owner Signature" },
          ].map((sig, i) => (
            <View key={i} style={{
              flex: 1,
              borderWidth: 1,
              borderColor: T.border,
              borderStyle: "solid",
              padding: 8,
              alignItems: "center",
            }}>
              <View style={{ height: 30, borderBottomWidth: 0.5, borderBottomColor: T.border, borderBottomStyle: "solid", width: "100%", marginBottom: 4 }} />
              <Text style={{ fontFamily: "Cairo", fontSize: 7.5, color: T.gray3, textAlign: "center" }}>{sig.ar}</Text>
              <Text style={{ fontFamily: "Cairo", fontSize: 6.5, color: T.gray5, textAlign: "center" }}>{sig.en}</Text>
            </View>
          ))}
        </View>

        {/* ── Gold line before footer ── */}
        <View style={[S.goldLine, { marginTop: 10 }]} />

        {/* ── Fixed Running Footer ── */}
        <View style={S.runningFooter} fixed>
          <Text style={S.runningFooterText}>
            {companyInfo?.phone ? `${companyInfo.phone}  ·  ` : ""}
            {companyInfo?.email || ""}
            {companyInfo?.website ? `  ·  ${companyInfo.website}` : ""}
          </Text>
          <Text
            style={S.runningFooterPage}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
};

export default VariationPDFDocument;
