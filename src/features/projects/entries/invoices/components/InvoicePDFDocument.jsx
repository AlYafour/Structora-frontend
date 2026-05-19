import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from "@react-pdf/renderer";
import { formatMoney, formatDate } from "../../../../../utils/formatters";
import { registerPDFFonts } from "../../../../../components/pdf/registerFonts";

registerPDFFonts();

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

const C = {
  bg:       "#fbf8f2",
  border:   "#d8c9b3",
  primary:  "#17202f",
  secondary:"#7f7364",
  tableHdr: "#f0eadf",
  white:    "#ffffff",
};

const S = StyleSheet.create({
  page: {
    fontFamily: "Cairo",
    fontSize: 9,
    color: C.primary,
    backgroundColor: C.bg,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 17,
    paddingRight: 17,
  },

  /* ── HEADER ── */
  topRow: {
    flexDirection: "row",
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    borderRadius: 6, overflow: "hidden",
    backgroundColor: C.white,
    marginBottom: 10, minHeight: 80,
  },
  companyPanel: {
    flex: 1.35, flexDirection: "row", alignItems: "center", gap: 12,
    padding: "14 18",
    borderRightWidth: 1, borderRightColor: C.border, borderRightStyle: "solid",
  },
  logoBox: { width: 60, height: 60, objectFit: "contain", flexShrink: 0 },
  logoPlaceholder: { width: 60, height: 60, flexShrink: 0 },
  companyBody: { flex: 1 },
  companyNameAr: { fontFamily: "Cairo", fontSize: 14, fontWeight: 700, color: C.primary },
  companyNameEn: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 400, color: C.secondary, marginTop: 1 },
  companyDetails: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: 5 },
  companyDetail: { fontFamily: "Cairo", fontSize: 7.5, color: C.secondary },
  titlePanel: { flex: 0.85, padding: "14 18", justifyContent: "center" },
  docTitleAr: { fontFamily: "Cairo", fontSize: 20, fontWeight: 700, color: C.primary, marginBottom: 1 },
  docTitleEn: { fontFamily: "Cairo", fontSize: 10, fontWeight: 400, color: C.secondary, textTransform: "uppercase", marginBottom: 12 },
  metaGrid: { flexDirection: "row", gap: 16 },
  metaLabel: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", marginBottom: 4 },
  metaValue: { fontFamily: "Cairo", fontSize: 10, fontWeight: 700, color: C.primary },

  /* ── CARDS ── */
  cardsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  card: {
    flex: 1, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    borderRadius: 6, padding: "10 12", minHeight: 60,
  },
  cardWide: { flex: 2 },
  cardLabel: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", marginBottom: 7 },
  cardValueAr: { fontFamily: "Cairo", fontSize: 10, fontWeight: 700, color: C.primary, marginBottom: 1 },
  cardValueEn: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 400, color: C.secondary },
  cardLine: { fontFamily: "Cairo", fontSize: 7.5, color: C.secondary, marginTop: 3 },

  /* ── DETAILS SECTION ── */
  section: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    borderRadius: 6, overflow: "hidden", marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: "10 16 8",
    borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid",
  },
  sectionHeaderLabel: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase" },
  tableWrap: { padding: "0 10 12" },
  table: { marginTop: 8 },
  tableHdrRow: { flexDirection: "row", backgroundColor: C.tableHdr, borderRadius: 4 },
  thCell: { paddingVertical: 7, paddingHorizontal: 6, alignItems: "center" },
  thText: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.primary, textAlign: "center" },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid",
    minHeight: 28,
  },
  tdCell: { paddingVertical: 9, paddingHorizontal: 6, justifyContent: "center" },
  tdNo:     { fontFamily: "Cairo", fontSize: 8.5, color: C.secondary, textAlign: "center" },
  tdDesc:   { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, fontWeight: 700 },
  tdCenter: { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, textAlign: "center" },
  tdRight:  { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, fontWeight: 700, textAlign: "right" },
  colNo:   { width: 28 },
  colDesc: { flex: 4 },
  colVar:  { flex: 2 },
  colQty:  { width: 34 },
  colRate: { width: 78 },
  colAmt:  { width: 80 },

  /* ── NOTES ── */
  notesSection: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    borderRadius: 6, padding: "10 14", marginBottom: 10, gap: 5,
  },
  noteRow: { flexDirection: "row", gap: 8 },
  noteLabel: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", width: 110, flexShrink: 0 },
  noteValue: { fontFamily: "Cairo", fontSize: 8, color: C.primary, flex: 1 },

  /* ── EXTRA FIELDS ── */
  extraGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  extraField: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    borderRadius: 6, padding: "8 12", minWidth: "22%",
  },
  extraLabel: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", marginBottom: 4 },
  extraValue: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.primary },

  /* ── TOTALS ── */
  totalsBox: {
    backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    borderRadius: 6, marginBottom: 10, overflow: "hidden",
  },
  totalsRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 9, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid",
  },
  totalsRowLast: { borderBottomWidth: 0 },
  totalsLabel: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.secondary, flex: 1 },
  totalsValue: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.primary, textAlign: "right" },
  totalsGrandLabel: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.secondary, flex: 1 },
  totalsGrandValue: { fontFamily: "Cairo", fontSize: 16, fontWeight: 700, color: C.primary, textAlign: "right" },

  /* ── BANK + QR ── */
  bankQrRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  bankBox: {
    flex: 1, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    borderRadius: 6, padding: "10 14",
  },
  bankTitle: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 5, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid" },
  bankRow: { flexDirection: "row", gap: 8, marginBottom: 3, alignItems: "baseline" },
  bankLabel: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.secondary, textTransform: "uppercase", width: 110, flexShrink: 0 },
  bankValue: { fontFamily: "Cairo", fontSize: 8, fontWeight: 700, color: C.primary, flex: 1 },
  bankChequeLine: { fontFamily: "Cairo", fontSize: 7, color: C.primary, marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: C.border, borderTopStyle: "solid" },
  bankChequeBold: { fontWeight: 700 },
  qrBox: {
    width: 90, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    borderRadius: 6, padding: 10, alignItems: "center", justifyContent: "center", gap: 6,
  },
  qrPlaceholder: {
    width: 60, height: 60,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    alignItems: "center", justifyContent: "center",
  },
  qrLabel: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" },

  /* ── SIGNATURES ── */
  sigRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  sigCard: {
    flex: 1, backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderStyle: "solid",
    borderRadius: 6, padding: "12 14", minHeight: 60, justifyContent: "flex-end",
  },
  sigCardStamp: { alignItems: "center", justifyContent: "center" },
  sigLine: { height: 1, backgroundColor: C.primary, marginBottom: 8 },
  sigLabel:   { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.secondary, textTransform: "uppercase", textAlign: "center" },
  sigLabelAr: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textAlign: "center", marginBottom: 2 },
  stampBox: {
    borderWidth: 1, borderColor: C.border, borderStyle: "dashed",
    borderRadius: 5, paddingVertical: 14, paddingHorizontal: 10,
    width: "100%", alignItems: "center",
  },

  /* ── FOOTER ── */
  notice: { textAlign: "center", fontFamily: "Cairo", fontSize: 7.5, color: C.secondary, marginTop: 6, marginBottom: 6 },
  credsBanner: { width: "100%", marginTop: 4 },
});

function n(v) { return parseFloat(v || 0) || 0; }
function fmt(v) { return formatMoney(v ?? 0, { lang: "en" }); }

export default function InvoicePDFDocument({ invoice, project, company, variations = [] }) {
  const isBank = invoice.payer === "bank";

  const storedTotal = n(invoice.amount);
  const storedNet   = n(invoice.net_amount);
  const storedVat   = n(invoice.vat);
  const advDed      = n(invoice.advance_deduction_amount);

  let subtotal, vat, total;
  if (isBank) {
    subtotal = storedNet > 0 ? storedNet : storedTotal;
    vat      = storedVat > 0 ? storedVat : Math.round(subtotal * 0.05 * 100) / 100;
    total    = Math.round((subtotal + vat) * 100) / 100;
  } else {
    subtotal = storedNet > 0 ? storedNet : storedTotal / 1.05;
    vat      = storedVat > 0 ? storedVat : subtotal * 0.05;
    total    = storedTotal > 0 ? storedTotal : subtotal + vat;
  }
  const netPayable = total - advDed;

  const authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
  const ownerAr = authOwner?.owner_name_ar || authOwner?.name || "";
  const ownerEn = authOwner?.owner_name_en || authOwner?.name || "";

  const projectAr = project?.display_name || project?.name || "—";
  const projectEn = project?.display_name_en || project?.display_name || project?.name || "—";

  const sp = project?.siteplan_data || {};
  const locationParts = [
    sp.land_no    && `Plot: ${sp.land_no}`,
    sp.sector     && `Sector: ${sp.sector}`,
    sp.municipality,
    sp.zone       && `Zone: ${sp.zone}`,
  ].filter(Boolean);
  const licenseNo = project?.license_data?.license_no || null;

  const items = invoice.items || [];
  const displayItems = isBank ? items.filter(i => i.source !== "bank_vat") : items;

  const rows = displayItems.length > 0
    ? displayItems.map((item, i) => {
        const variation = item.variation_id
          ? variations.find(v => v.id === item.variation_id)
          : null;
        const varLabel = variation
          ? (variation.variation_number || `#${variation.id}`)
          : "Base Contract";
        const itemTotal = item.total || (n(item.quantity) * n(item.unit_price)) || 0;
        return {
          no: String(i + 1).padStart(2, "0"),
          desc: item.description || "—",
          varLabel: !isBank ? varLabel : null,
          qty: item.quantity != null ? String(item.quantity) : "1",
          rate: fmt(item.unit_price || 0),
          amount: fmt(itemTotal),
        };
      })
    : [{
        no: "01",
        desc: invoice.description || (isBank ? "Contract Invoice" : "Invoice Amount"),
        varLabel: !isBank ? "Base Contract" : null,
        qty: "1",
        rate: fmt(subtotal),
        amount: fmt(subtotal),
      }];

  const notes = [
    invoice.payment_id  ? { label: "Payment Ref / مرجع الدفع", value: `#${invoice.payment_id}` } : null,
    invoice.description ? { label: "Notes / ملاحظات",           value: invoice.description }       : null,
  ].filter(Boolean);

  const extraFields = [
    invoice.stage              ? { label: "Stage / المرحلة",              value: invoice.stage }                         : null,
    project?.plot_number       ? { label: "Plot No. / رقم القطعة",        value: String(project.plot_number) }            : null,
    project?.contract?.gross_total ? { label: "Contract Value / قيمة العقد", value: fmt(project.contract.gross_total) }  : null,
  ].filter(Boolean);

  const invoiceDate   = formatDate(invoice.invoice_date, "en");
  const invoiceNumber = invoice.invoice_number || `#${invoice.id}`;
  const logoSrc       = company?.logo || null;
  const companyAr     = company?.name || "";
  const companyEn     = company?.name_en || company?.name || "";

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Header ── */}
        <View style={S.topRow}>
          <View style={S.companyPanel}>
            {logoSrc
              ? <Image src={logoSrc} style={S.logoBox} />
              : <View style={S.logoPlaceholder} />}
            <View style={S.companyBody}>
              {companyAr ? <Text style={S.companyNameAr}>{companyAr}</Text> : null}
              {companyEn ? <Text style={S.companyNameEn}>{companyEn}</Text> : null}
              <View style={S.companyDetails}>
                {company?.address    && <Text style={S.companyDetail}>{company.address}</Text>}
                {company?.phone      && <Text style={S.companyDetail}>{company.phone}</Text>}
                {company?.email      && <Text style={S.companyDetail}>{company.email}</Text>}
                {company?.vat_number && <Text style={S.companyDetail}>TRN: {company.vat_number}</Text>}
              </View>
            </View>
          </View>

          <View style={S.titlePanel}>
            <Text style={S.docTitleAr}>فاتورة</Text>
            <Text style={S.docTitleEn}>Invoice</Text>
            <View style={S.metaGrid}>
              <View>
                <Text style={S.metaLabel}>Invoice Number / رقم الفاتورة</Text>
                <Text style={S.metaValue}>{invoiceNumber}</Text>
              </View>
              <View>
                <Text style={S.metaLabel}>Date / التاريخ</Text>
                <Text style={S.metaValue}>{invoiceDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Cards ── */}
        <View style={S.cardsRow}>
          <View style={[S.card, S.cardWide]}>
            <Text style={S.cardLabel}>Bill To / وجهة الفاتورة</Text>
            {ownerAr ? <Text style={S.cardValueAr}>{ownerAr}</Text> : null}
            {ownerEn && ownerEn !== ownerAr ? <Text style={S.cardValueEn}>{ownerEn}</Text> : null}
            {locationParts.length > 0 && <Text style={S.cardLine}>{locationParts.join("  |  ")}</Text>}
            {licenseNo && <Text style={S.cardLine}>Licence No: {licenseNo}</Text>}
          </View>
          <View style={S.card}>
            <Text style={S.cardLabel}>Project Name / اسم المشروع</Text>
            <Text style={S.cardValueAr}>{projectAr}</Text>
            {projectEn !== projectAr && <Text style={S.cardValueEn}>{projectEn}</Text>}
          </View>
        </View>

        {/* ── Details table ── */}
        <View style={S.section}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionHeaderLabel}>Invoice Details / تفاصيل الفاتورة</Text>
            <Text style={S.sectionHeaderLabel}>{String(rows.length).padStart(2, "0")} lines</Text>
          </View>
          <View style={S.tableWrap}>
            <View style={S.table}>
              <View style={S.tableHdrRow}>
                <View style={[S.thCell, S.colNo]}><Text style={S.thText}>#</Text></View>
                <View style={[S.thCell, S.colDesc]}><Text style={S.thText}>Description / الوصف</Text></View>
                {!isBank && <View style={[S.thCell, S.colVar]}><Text style={S.thText}>Variation / التعديل</Text></View>}
                <View style={[S.thCell, S.colQty]}><Text style={S.thText}>Qty</Text></View>
                <View style={[S.thCell, S.colRate]}><Text style={S.thText}>Unit Price / سعر الوحدة</Text></View>
                <View style={[S.thCell, S.colAmt]}><Text style={S.thText}>Total / الإجمالي</Text></View>
              </View>
              {rows.map((row, idx) => (
                <View key={idx} style={S.tableRow}>
                  <View style={[S.tdCell, S.colNo]}><Text style={S.tdNo}>{row.no}</Text></View>
                  <View style={[S.tdCell, S.colDesc]}><Text style={S.tdDesc}>{row.desc}</Text></View>
                  {!isBank && <View style={[S.tdCell, S.colVar]}><Text style={S.tdCenter}>{row.varLabel || "—"}</Text></View>}
                  <View style={[S.tdCell, S.colQty]}><Text style={S.tdCenter}>{row.qty}</Text></View>
                  <View style={[S.tdCell, S.colRate]}><Text style={S.tdRight}>{row.rate}</Text></View>
                  <View style={[S.tdCell, S.colAmt]}><Text style={S.tdRight}>{row.amount}</Text></View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {notes.length > 0 && (
          <View style={S.notesSection}>
            {notes.map((note, i) => (
              <View key={i} style={S.noteRow}>
                <Text style={S.noteLabel}>{note.label}</Text>
                <Text style={S.noteValue}>{note.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Extra fields ── */}
        {extraFields.length > 0 && (
          <View style={S.extraGrid}>
            {extraFields.map((field, i) => (
              <View key={i} style={S.extraField}>
                <Text style={S.extraLabel}>{field.label}</Text>
                <Text style={S.extraValue}>{field.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Totals ── */}
        <View style={S.totalsBox}>
          <View style={S.totalsRow}>
            <Text style={S.totalsLabel}>Subtotal (Excl. VAT) / المجموع بدون ضريبة</Text>
            <Text style={S.totalsValue}>{fmt(subtotal)}</Text>
          </View>
          <View style={S.totalsRow}>
            <Text style={S.totalsLabel}>VAT 5% / ضريبة القيمة المضافة</Text>
            <Text style={S.totalsValue}>{fmt(vat)}</Text>
          </View>
          {advDed > 0 ? (
            <>
              <View style={S.totalsRow}>
                <Text style={S.totalsLabel}>Gross Total / الإجمالي الكلي</Text>
                <Text style={S.totalsValue}>{fmt(total)}</Text>
              </View>
              <View style={S.totalsRow}>
                <Text style={S.totalsLabel}>Advance Deduction / خصم الدفعة المقدمة</Text>
                <Text style={S.totalsValue}>({fmt(advDed)})</Text>
              </View>
              <View style={[S.totalsRow, S.totalsRowLast]}>
                <Text style={S.totalsGrandLabel}>Net Payable / صافي المستحق</Text>
                <Text style={S.totalsGrandValue}>{fmt(netPayable)}</Text>
              </View>
            </>
          ) : (
            <View style={[S.totalsRow, S.totalsRowLast]}>
              <Text style={S.totalsGrandLabel}>Grand Total / الإجمالي الكلي</Text>
              <Text style={S.totalsGrandValue}>{fmt(total)}</Text>
            </View>
          )}
        </View>

        {/* ── Bank + QR ── */}
        <View style={S.bankQrRow}>
          <View style={S.bankBox}>
            <Text style={S.bankTitle}>Our Bank Account Details</Text>
            <View style={S.bankRow}>
              <Text style={S.bankLabel}>Name of Bank</Text>
              <Text style={S.bankValue}>ADCB</Text>
            </View>
            <View style={S.bankRow}>
              <Text style={S.bankLabel}>Account Number</Text>
              <Text style={S.bankValue}>100551920001</Text>
            </View>
            <View style={S.bankRow}>
              <Text style={S.bankLabel}>IBAN Number</Text>
              <Text style={S.bankValue}>AE690030000100551920001</Text>
            </View>
            <Text style={S.bankChequeLine}>
              Make all cheques payable to{" "}
              <Text style={S.bankChequeBold}>Al Yafour General Contracting &amp; Trans Sole Proprietorship LLC</Text>
            </Text>
          </View>
          <View style={S.qrBox}>
            <View style={S.qrPlaceholder}>
              <Text style={{ fontFamily: "Cairo", fontSize: 5.5, color: C.secondary, textAlign: "center" }}>QR{"\n"}CODE</Text>
            </View>
            <Text style={S.qrLabel}>SCAN TO{"\n"}VERIFY</Text>
          </View>
        </View>

        {/* ── Signatures ── */}
        <View style={S.sigRow}>
          <View style={S.sigCard}>
            <View style={S.sigLine} />
            <Text style={S.sigLabelAr}>توقيع المستلم</Text>
            <Text style={S.sigLabel}>RECEIVED BY</Text>
          </View>
          <View style={[S.sigCard, S.sigCardStamp]}>
            <View style={S.stampBox}>
              <Text style={S.sigLabelAr}>ختم الشركة</Text>
              <Text style={S.sigLabel}>COMPANY STAMP</Text>
            </View>
          </View>
          <View style={S.sigCard}>
            <View style={S.sigLine} />
            <Text style={S.sigLabelAr}>توقيع مفوض</Text>
            <Text style={S.sigLabel}>AUTHORIZED SIGNATURE</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={S.notice}>
          This is an electronically generated document  ·  هذه وثيقة صادرة إلكترونياً
        </Text>
        <Image src={`${ORIGIN}/credsnewfix.png`} style={S.credsBanner} />

      </Page>
    </Document>
  );
}
