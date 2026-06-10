/**
 * VariationPDFDocument — @react-pdf/renderer component.
 * Design matches VariationPrintDocument.jsx (.vpd-* CSS) exactly.
 */
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatMoney, formatDate } from "../../../../../utils/formatters";
import { registerPDFFonts } from "../../../../../components/pdf/registerFonts";

registerPDFFonts();

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
const EMPTY = "—";

const C = {
  bg:       "#fbf8f2",
  white:    "#ffffff",
  border:   "#d8c9b3",
  primary:  "#17202f",
  secondary:"#7f7364",
  tableHdr: "#f0eadf",
  offWhite: "#faf7f2",
  grandBg:  "#17202f",
};

const S = StyleSheet.create({
  page: {
    fontFamily: "Cairo", fontSize: 9, color: C.primary,
    backgroundColor: C.bg, paddingTop: 12, paddingBottom: 12,
    paddingLeft: 14, paddingRight: 14,
  },

  /* Header */
  topRow: {
    flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1,
    borderTopColor: C.border, borderBottomColor: C.border,
    borderTopStyle: "solid", borderBottomStyle: "solid",
    backgroundColor: C.white, marginBottom: 8, minHeight: 72,
  },
  companyPanel: {
    flex: 1.35, flexDirection: "row", alignItems: "center", gap: 10,
    padding: "10 14", borderRightWidth: 1, borderRightColor: C.border, borderRightStyle: "solid",
  },
  logoBox: { width: 52, height: 52, objectFit: "contain", flexShrink: 0 },
  companyBody: { flex: 1 },
  companyNameAr: { fontFamily: "Cairo", fontSize: 14, fontWeight: 700, color: C.primary },
  companyNameEn: { fontFamily: "Cairo", fontSize: 10, fontWeight: 400, color: C.secondary, marginTop: 1 },
  companyDetails: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: 5 },
  companyDetail: { fontFamily: "Cairo", fontSize: 7.5, color: C.secondary },

  titlePanel: { flex: 0.85, padding: "10 14", justifyContent: "center" },
  docTitleAr: { fontFamily: "Cairo", fontSize: 18, fontWeight: 700, color: C.primary },
  docTitleEn: { fontFamily: "Cairo", fontSize: 11, fontWeight: 400, color: C.secondary, textTransform: "uppercase", marginTop: 1 },
  metaGrid: { flexDirection: "row", gap: 14, marginTop: 8 },
  metaLabel: { fontFamily: "Cairo", fontSize: 8, fontWeight: 700, color: C.secondary, textTransform: "uppercase" },
  metaValue: { fontFamily: "Cairo", fontSize: 11, fontWeight: 700, color: C.primary, marginTop: 3 },

  qrPanel: {
    width: 80, alignItems: "center", justifyContent: "center", gap: 5,
    padding: "10 12", borderLeftWidth: 1, borderLeftColor: C.border,
    borderLeftStyle: "solid", backgroundColor: C.offWhite,
  },
  qrImage: { width: 52, height: 52 },
  qrLabel: { fontFamily: "Cairo", fontSize: 5.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", textAlign: "center", letterSpacing: 1 },

  /* Info cards */
  cardsRow: { flexDirection: "row", gap: 0, marginBottom: 8 },
  card: {
    flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderStyle: "solid", padding: "6 8", flexDirection: "row",
    flexWrap: "wrap", alignItems: "center", gap: 6,
  },
  cardLabel: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.secondary, textTransform: "uppercase", flexShrink: 0 },
  cardValue: { fontFamily: "Cairo", fontSize: 9.5, fontWeight: 700, color: C.primary, flex: 1 },
  cardValueSub: { fontFamily: "Cairo", fontSize: 7.5, color: C.secondary, flex: "0 0 100%", marginTop: 1 },
  cardDescCol: {
    flex: 2, flexDirection: "column", backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid", padding: "6 8",
  },
  cardDescLabel: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.secondary, textTransform: "uppercase", marginBottom: 4 },
  cardDescText: { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, lineHeight: 1.4 },
  cardDescCause: { fontFamily: "Cairo", fontSize: 8, color: C.secondary, marginTop: 3 },

  /* Section */
  section: {
    backgroundColor: C.white, borderTopWidth: 1, borderBottomWidth: 1,
    borderTopColor: C.border, borderBottomColor: C.border,
    borderTopStyle: "solid", borderBottomStyle: "solid", marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid",
  },
  sectionLabel: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase" },
  sectionCount: { fontFamily: "Cairo", fontSize: 7, color: C.secondary },

  /* Table */
  tableHdrRow: { flexDirection: "row", backgroundColor: C.tableHdr },
  thCell: { paddingVertical: 6, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  thText: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.primary, textAlign: "center" },
  tableRow: {
    flexDirection: "row", borderBottomWidth: 1,
    borderBottomColor: C.border, borderBottomStyle: "solid", minHeight: 24,
  },
  tdCell: { paddingVertical: 6, paddingHorizontal: 5, justifyContent: "center" },
  tdMuted:  { fontFamily: "Cairo", fontSize: 8,   color: C.secondary, textAlign: "center" },
  tdLeft:   { fontFamily: "Cairo", fontSize: 9,   color: C.primary,   fontWeight: 700 },
  tdCenter: { fontFamily: "Cairo", fontSize: 9,   color: C.primary,   textAlign: "center" },
  tdRight:  { fontFamily: "Cairo", fontSize: 9,   color: C.primary,   fontWeight: 700, textAlign: "right" },

  /* Totals strip */
  totalsBox: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  totalsCell: {
    flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.white,
    borderStyle: "solid", alignItems: "center", justifyContent: "center",
    padding: "10 8", minWidth: 80,
  },
  totalsCellHighlight: { backgroundColor: C.tableHdr },
  totalsCellSubtotal:  { backgroundColor: C.offWhite },
  totalsCellLabel: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.secondary, textTransform: "uppercase", textAlign: "center", marginBottom: 6 },
  totalsCellValue: { fontFamily: "Cairo", fontSize: 10, fontWeight: 700, color: C.primary, textAlign: "center" },
  grandCell: {
    flex: "0 0 100%", flexDirection: "row", backgroundColor: C.white,
    alignItems: "center", justifyContent: "center", gap: 16,
    padding: "12 16", borderWidth: 1, borderColor: C.border, borderStyle: "solid",
  },
  grandLabel: { fontFamily: "Cairo", fontSize: 9, fontWeight: 700, color: C.grandBg, textTransform: "uppercase", textAlign: "center" },
  grandValue: { fontFamily: "Cairo", fontSize: 18, fontWeight: 700, color: C.grandBg },

  /* Signatures */
  sigRow: { flexDirection: "row", marginBottom: 8 },
  sigCard: {
    flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderStyle: "solid", padding: "10 12", minHeight: 52, justifyContent: "flex-end",
  },
  sigCardStamp: { alignItems: "center", justifyContent: "center" },
  sigLine: { height: 1, backgroundColor: C.primary, marginBottom: 8 },
  sigLabel: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textAlign: "center", textTransform: "uppercase" },
  stampBox: { borderWidth: 1, borderColor: C.border, borderStyle: "dashed", paddingVertical: 10, paddingHorizontal: 8, width: "100%", alignItems: "center" },

  /* Footer */
  notice: { textAlign: "center", fontFamily: "Cairo", fontSize: 7, color: C.secondary, marginTop: 6, marginBottom: 2 },
  noticeSub: { textAlign: "center", fontFamily: "Cairo", fontSize: 6, color: C.secondary, marginBottom: 4 },
  credsBanner: { width: "100%", marginTop: 4 },
});

const n = (v) => parseFloat(v || 0) || 0;
const fmt = (v) => formatMoney(v ?? 0, { lang: "en" });
const fmtDate = (v) => (v ? (formatDate(v, "en") || String(v)) : null) || EMPTY;
const safe = (v) => (v !== null && v !== undefined && v !== "") ? String(v) : EMPTY;

const ITEM_COLS = [
  { label: "#",                          width: 28,  align: "muted"  },
  { label: "وصف الصنف / Description",    flex: 4,    align: "left"   },
  { label: "الكمية / Qty",               width: 32,  align: "center" },
  { label: "الوحدة / Unit",              width: 36,  align: "center" },
  { label: "السعر / Rate",               width: 74,  align: "right"  },
  { label: "المبلغ / Amount",            width: 80,  align: "right"  },
];

function colSize(col) { return col.width ? { width: col.width } : { flex: col.flex || 1 }; }

function ItemsTable({ items }) {
  if (!items?.length) return null;
  return (
    <View>
      <View style={S.tableHdrRow}>
        {ITEM_COLS.map((col, i) => (
          <View key={i} style={[S.thCell, colSize(col)]}>
            <Text style={S.thText}>{col.label}</Text>
          </View>
        ))}
      </View>
      {items.map((item, ri) => {
        const cells = [
          { value: String(ri + 1).padStart(2, "0"), align: "muted",  width: 28  },
          { value: item.description || EMPTY,        align: "left",   flex: 4    },
          { value: safe(item.qty ?? item.quantity),  align: "center", width: 32  },
          { value: safe(item.unit || "LS"),          align: "center", width: 36  },
          { value: fmt(item.rate ?? item.unit_price ?? 0), align: "right", width: 74 },
          { value: fmt(item.amount ?? item.total ?? 0),    align: "right", width: 80 },
        ];
        return (
          <View key={ri} style={S.tableRow}>
            {cells.map((cell, ci) => {
              const ts = cell.align === "right" ? S.tdRight : cell.align === "center" ? S.tdCenter : cell.align === "muted" ? S.tdMuted : S.tdLeft;
              return (
                <View key={ci} style={[S.tdCell, cell.width ? { width: cell.width } : { flex: cell.flex || 1 }]}>
                  <Text style={ts}>{safe(cell.value)}</Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const VariationPDFDocument = ({ variation, project, companyInfo, qrDataUrl }) => {
  let nd = {};
  if (variation?.description) {
    try { nd = JSON.parse(variation.description); } catch { nd = {}; }
  }

  const totalOmitted   = n(nd.total_omitted);
  const totalAdded     = n(nd.total_added);
  const totalVar       = n(nd.total_variation_amount || (totalAdded - totalOmitted));
  const contractorOHP  = n(nd.contractor_engineering_oh_p);
  const consultantFees = n(nd.consultant_fees);
  const beforeDiscount = n(nd.total_amount_before_discount || (totalVar + contractorOHP + consultantFees));
  const discountAmt    = n(nd.discount_amount);
  const discountPct    = n(nd.discount_percentage);
  const finalAmount    = n(nd.total_amount || variation?.total_amount);
  const omittedItems   = nd.omitted_items || [];
  const addedItems     = nd.added_items   || [];

  const sp = project?.siteplan || project?.siteplan_data || {};
  const location = [sp.municipality, sp.zone, sp.sector, sp.land_no].filter(Boolean).join(" - ");
  const projectNo = project?.contract_data?.tender_no || project?.awarding_data?.project_number || project?.internal_code || "";
  const projectNameAr = project?.display_name || project?.name || "";
  const projectNameEn = project?.display_name_en || project?.display_name || project?.name || "";

  const companyAr = companyInfo?.name || "";
  const companyEn = companyInfo?.name_en || companyInfo?.name || "";

  const totalsCells = [
    ...(totalOmitted !== 0 ? [{ label: `إجمالي البنود المحذوفة\nTotal Omitted`, value: fmt(totalOmitted) }] : []),
    ...(totalAdded   !== 0 ? [{ label: `إجمالي البنود المضافة\nTotal Added`,   value: fmt(totalAdded), highlight: true }] : []),
    { label: `صافي أمر التغيير\nNet Variation`, value: fmt(totalVar), highlight: true },
    ...(contractorOHP  !== 0 ? [{ label: `مصاريف المقاول${nd.contractor_ohp_percentage ? ` (${nd.contractor_ohp_percentage}%)` : ""}\nContractor OH&P`, value: fmt(contractorOHP) }] : []),
    ...(consultantFees !== 0 ? [{ label: `رسوم الاستشاري${nd.consultant_fees_percentage ? ` (${nd.consultant_fees_percentage}%)` : ""}\nConsultant Fees`, value: fmt(consultantFees) }] : []),
    ...(nd.custom_fees || [])
      .map(f => {
        const amt = f.type === 'percentage'
          ? (totalVar * parseFloat(f.percentage || 0)) / 100
          : parseFloat(f.amount) || 0;
        const pctLabel = f.type === 'percentage' && f.percentage ? ` (${f.percentage}%)` : '';
        const name = f.name || 'رسوم إضافية';
        return { label: `${name}${pctLabel}\n${name}${pctLabel}`, value: fmt(amt), _amt: amt };
      })
      .filter(f => f._amt !== 0)
      .map(({ _amt: _ignored, ...rest }) => rest),
    ...(discountAmt > 0 ? [
      { label: `المجموع قبل الخصم\nTotal Before Discount`, value: fmt(beforeDiscount), subtotal: true },
      { label: `خصم${discountPct > 0 ? ` (${discountPct.toFixed(1)}%)` : ""}\nDiscount`, value: `(${fmt(discountAmt)})` },
    ] : []),
  ];

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.topRow}>
          <View style={S.companyPanel}>
            {companyInfo?.logo ? <Image src={companyInfo.logo} style={S.logoBox} /> : null}
            <View style={S.companyBody}>
              {companyAr ? <Text style={S.companyNameAr}>{safe(companyAr)}</Text> : null}
              {companyEn && companyEn !== companyAr ? <Text style={S.companyNameEn}>{safe(companyEn)}</Text> : null}
              <View style={S.companyDetails}>
                {companyInfo?.address && <Text style={S.companyDetail}>{safe(companyInfo.address)}</Text>}
                {companyInfo?.phone   && <Text style={S.companyDetail}>{safe(companyInfo.phone)}</Text>}
                {companyInfo?.email   && <Text style={S.companyDetail}>{safe(companyInfo.email)}</Text>}
              </View>
            </View>
          </View>
          <View style={S.titlePanel}>
            <Text style={S.docTitleAr}>أمر التغيير</Text>
            <Text style={S.docTitleEn}>Variation Order</Text>
            <View style={S.metaGrid}>
              <View>
                <Text style={S.metaLabel}>رقم التغيير / VAR. NO.</Text>
                <Text style={S.metaValue}>{safe(variation?.variation_number || nd.reference_no)}</Text>
              </View>
              <View>
                <Text style={S.metaLabel}>التاريخ / DATE</Text>
                <Text style={S.metaValue}>{fmtDate(nd.document_date || variation?.created_at)}</Text>
              </View>
            </View>
          </View>
          {qrDataUrl ? (
            <View style={S.qrPanel}>
              <Image src={qrDataUrl} style={S.qrImage} />
              <Text style={S.qrLabel}>SCAN TO{"\n"}VERIFY</Text>
            </View>
          ) : null}
        </View>

        {/* Info Cards */}
        <View style={S.cardsRow}>
          <View style={[S.card, { flex: 2 }]}>
            <Text style={S.cardLabel}>اسم المشروع / Project Name</Text>
            <Text style={S.cardValue}>{safe(projectNameAr)}</Text>
            {projectNameEn && projectNameEn !== projectNameAr ? <Text style={S.cardValueSub}>{safe(projectNameEn)}</Text> : null}
            {location ? <Text style={S.cardValueSub}>{safe(location)}</Text> : null}
          </View>
          <View style={S.card}>
            <Text style={S.cardLabel}>رقم المشروع / Project No.</Text>
            <Text style={S.cardValue}>{safe(projectNo)}</Text>
          </View>
          {nd.variation_description ? (
            <View style={S.cardDescCol}>
              <Text style={S.cardDescLabel}>وصف التغيير / Variation Description</Text>
              <Text style={S.cardDescText}>{safe(nd.variation_description)}</Text>
              {nd.variation_cause && nd.variation_cause !== nd.variation_description
                ? <Text style={S.cardDescCause}>Cause: {safe(nd.variation_cause)}</Text> : null}
            </View>
          ) : null}
        </View>

        {/* Added Items */}
        {addedItems.length > 0 ? (
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionLabel}>البنود المضافة / Added Items</Text>
              <Text style={S.sectionCount}>{String(addedItems.length).padStart(2, "0")} lines</Text>
            </View>
            <ItemsTable items={addedItems} />
          </View>
        ) : null}

        {/* Omitted Items */}
        {omittedItems.length > 0 ? (
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionLabel}>البنود المحذوفة / Omitted Items</Text>
              <Text style={S.sectionCount}>{String(omittedItems.length).padStart(2, "0")} lines</Text>
            </View>
            <ItemsTable items={omittedItems} />
          </View>
        ) : null}

        {/* Totals strip */}
        <View style={S.totalsBox}>
          {totalsCells.map((cell, i) => (
            <View key={i} style={[S.totalsCell, cell.highlight && S.totalsCellHighlight, cell.subtotal && S.totalsCellSubtotal]}>
              <Text style={S.totalsCellLabel}>{safe(cell.label)}</Text>
              <Text style={S.totalsCellValue}>{safe(cell.value)}</Text>
            </View>
          ))}
          <View style={S.grandCell}>
            <Text style={S.grandLabel}>{`المبلغ الإجمالي\nTotal Amount`}</Text>
            <Text style={S.grandValue}>{fmt(finalAmount)}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={S.sigRow}>
          <View style={S.sigCard}>
            <View style={S.sigLine} />
            <Text style={S.sigLabel}>استلمه / Received By</Text>
          </View>
          <View style={[S.sigCard, S.sigCardStamp]}>
            <View style={S.stampBox}>
              <Text style={S.sigLabel}>ختم الشركة / Company Stamp</Text>
            </View>
          </View>
          <View style={S.sigCard}>
            <View style={S.sigLine} />
            <Text style={S.sigLabel}>توقيع مخوّل / Authorized Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={S.notice}>هذه الوثيقة صادرة إلكترونياً وصالحة دون توقيع يدوي.</Text>
        <Text style={S.noticeSub}>This document is electronically generated and valid without a handwritten signature.</Text>
        <Image src={`${ORIGIN}/credsnewfix.png`} style={S.credsBanner} />

      </Page>
    </Document>
  );
};

export default VariationPDFDocument;
