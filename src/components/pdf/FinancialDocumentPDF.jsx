/**
 * FinancialDocumentPDF — universal @react-pdf/renderer component.
 * Handles: invoice | payment | receiptVoucher | taxInvoice
 * Mirrors the visual style of UnifiedFinancialPrintTemplate (cream/beige palette).
 */
import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from "@react-pdf/renderer";
import { formatMoney, formatDate } from "../../utils/formatters";
import { registerPDFFonts } from "./registerFonts";

registerPDFFonts();

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  bg:       "#fbf8f2",
  border:   "#d8c9b3",
  primary:  "#17202f",
  secondary:"#7f7364",
  tableHdr: "#f0eadf",
  white:    "#ffffff",
};

const S = StyleSheet.create({
  page: { fontFamily: "Cairo", fontSize: 9, color: C.primary, backgroundColor: C.bg, paddingTop: 14, paddingBottom: 14, paddingLeft: 17, paddingRight: 17 },

  /* Header */
  topRow: { flexDirection: "row", borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, overflow: "hidden", backgroundColor: C.white, marginBottom: 10, minHeight: 80 },
  companyPanel: { flex: 1.35, flexDirection: "row", alignItems: "center", gap: 12, padding: "14 18", borderRightWidth: 1, borderRightColor: C.border, borderRightStyle: "solid" },
  logoBox: { width: 60, height: 60, objectFit: "contain", flexShrink: 0 },
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

  /* Cards */
  cardsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  card: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: "10 12", minHeight: 60 },
  cardWide: { flex: 2 },
  cardLabel: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", marginBottom: 7 },
  cardValueAr: { fontFamily: "Cairo", fontSize: 10, fontWeight: 700, color: C.primary, marginBottom: 1 },
  cardValueEn: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 400, color: C.secondary },
  cardLine: { fontFamily: "Cairo", fontSize: 7.5, color: C.secondary, marginTop: 3 },

  /* Details section */
  section: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, overflow: "hidden", marginBottom: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: "10 16 8", borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid" },
  sectionHeaderLabel: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase" },
  tableWrap: { padding: "0 10 12" },
  table: { marginTop: 8 },
  tableHdrRow: { flexDirection: "row", backgroundColor: C.tableHdr, borderRadius: 4 },
  thCell: { paddingVertical: 7, paddingHorizontal: 6, alignItems: "center" },
  thText: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.primary, textAlign: "center" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid", minHeight: 28 },
  tdCell: { paddingVertical: 9, paddingHorizontal: 6, justifyContent: "center" },
  tdMuted:  { fontFamily: "Cairo", fontSize: 8.5, color: C.secondary, textAlign: "center" },
  tdLeft:   { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, fontWeight: 700 },
  tdCenter: { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, textAlign: "center" },
  tdRight:  { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, fontWeight: 700, textAlign: "right" },

  /* Notes */
  notesSection: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: "10 14", marginBottom: 10, gap: 5 },
  noteRow: { flexDirection: "row", gap: 8 },
  noteLabel: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", width: 110, flexShrink: 0 },
  noteValue: { fontFamily: "Cairo", fontSize: 8, color: C.primary, flex: 1 },

  /* Extra fields */
  extraGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  extraField: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: "8 12", minWidth: "22%" },
  extraLabel: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", marginBottom: 4 },
  extraValue: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.primary },

  /* Totals */
  totalsBox: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, marginBottom: 10, overflow: "hidden" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid" },
  totalsRowLast: { borderBottomWidth: 0 },
  totalsLabel: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.secondary, flex: 1 },
  totalsValue: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.primary, textAlign: "right" },
  totalsGrandLabel: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.secondary, flex: 1 },
  totalsGrandValue: { fontFamily: "Cairo", fontSize: 16, fontWeight: 700, color: C.primary, textAlign: "right" },

  /* Bank + QR */
  bankQrRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  bankBox: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: "10 14" },
  bankTitle: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 5, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid" },
  bankRow: { flexDirection: "row", gap: 8, marginBottom: 3, alignItems: "baseline" },
  bankLabel: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.secondary, textTransform: "uppercase", width: 110, flexShrink: 0 },
  bankValue: { fontFamily: "Cairo", fontSize: 8, fontWeight: 700, color: C.primary, flex: 1 },
  bankChequeLine: { fontFamily: "Cairo", fontSize: 7, color: C.primary, marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: C.border, borderTopStyle: "solid" },
  bankChequeBold: { fontWeight: 700 },
  qrBox: { width: 90, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: 10, alignItems: "center", justifyContent: "center", gap: 6 },
  qrPlaceholder: { width: 60, height: 60, borderWidth: 1, borderColor: C.border, borderStyle: "solid", alignItems: "center", justifyContent: "center" },
  qrLabel: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" },

  /* Signatures */
  sigRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  sigCard: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: "12 14", minHeight: 60, justifyContent: "flex-end" },
  sigCardStamp: { alignItems: "center", justifyContent: "center" },
  sigLine: { height: 1, backgroundColor: C.primary, marginBottom: 8 },
  sigLabel: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.secondary, textTransform: "uppercase", textAlign: "center" },
  sigLabelAr: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textAlign: "center", marginBottom: 2 },
  stampBox: { borderWidth: 1, borderColor: C.border, borderStyle: "dashed", borderRadius: 5, paddingVertical: 14, paddingHorizontal: 10, width: "100%", alignItems: "center" },

  /* Footer */
  notice: { textAlign: "center", fontFamily: "Cairo", fontSize: 7.5, color: C.secondary, marginTop: 6, marginBottom: 6 },
  credsBanner: { width: "100%", marginTop: 4 },
});

/* ── Helpers ────────────────────────────────────────────────── */
const n = (v) => parseFloat(v || 0) || 0;
const fmt = (v) => formatMoney(v ?? 0, { lang: "en" });
const fmtDate = (v) => (v ? (formatDate(v, "en") || String(v)) : null) || "—";
const safe = (v) => (v !== null && v !== undefined && v !== "") ? String(v) : "—";

const METHOD_LABELS = {
  bank_transfer: "Bank Transfer / تحويل بنكي",
  cash_deposit:  "Cash Deposit / إيداع نقدي",
  bank_cheque:   "Bank Cheque / شيك بنكي",
  cash:          "Cash / نقداً",
};

function colStyleOf(col) {
  return col.width ? { width: col.width } : { flex: col.flex || 1 };
}

function cellTextStyle(col) {
  if (col.align === "right")  return S.tdRight;
  if (col.align === "center") return S.tdCenter;
  if (col.align === "muted")  return S.tdMuted;
  return S.tdLeft;
}

/* ── Sub-components ─────────────────────────────────────────── */
function DocTable({ columns, rows }) {
  return (
    <View style={S.table}>
      <View style={S.tableHdrRow}>
        {columns.map((col, i) => (
          <View key={i} style={[S.thCell, colStyleOf(col)]}>
            <Text style={S.thText}>{col.label}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={S.tableRow}>
          {row.map((cell, ci) => (
            <View key={ci} style={[S.tdCell, colStyleOf(columns[ci])]}>
              <Text style={cellTextStyle(columns[ci])}>{safe(cell)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/* ── Document normalisers ───────────────────────────────────── */
function buildInvoiceDoc(data, project, variations) {
  const isBank = data.payer === "bank";
  const sp = project?.siteplan_data || {};
  const authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
  const ownerAr = authOwner?.owner_name_ar || authOwner?.name || "";
  const ownerEn = authOwner?.owner_name_en || authOwner?.name || "";
  const locationParts = [
    sp.land_no    && `Plot: ${sp.land_no}`,
    sp.sector     && `Sector: ${sp.sector}`,
    sp.municipality,
    sp.zone       && `Zone: ${sp.zone}`,
  ].filter(Boolean);
  const licenseNo = project?.license_data?.license_no || null;
  const projectAr = project?.display_name || project?.name || "—";
  const projectEn = project?.display_name_en || project?.display_name || project?.name || "—";

  const storedTotal = n(data.amount);
  const storedNet   = n(data.net_amount);
  const storedVat   = n(data.vat);
  const advDed      = n(data.advance_deduction_amount);
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

  const items = data.items || [];
  const displayItems = isBank ? items.filter(i => i.source !== "bank_vat") : items;

  const columns = isBank
    ? [
        { label: "#",                             width: 28, align: "muted"  },
        { label: "Description / الوصف",           flex: 4,   align: "left"   },
        { label: "Qty",                           width: 34, align: "center" },
        { label: "Unit Price / سعر الوحدة",       width: 78, align: "right"  },
        { label: "Total / الإجمالي",              width: 80, align: "right"  },
      ]
    : [
        { label: "#",                             width: 28, align: "muted"  },
        { label: "Description / الوصف",           flex: 4,   align: "left"   },
        { label: "Variation / التعديل",           flex: 2,   align: "center" },
        { label: "Qty",                           width: 34, align: "center" },
        { label: "Unit Price / سعر الوحدة",       width: 78, align: "right"  },
        { label: "Total / الإجمالي",              width: 80, align: "right"  },
      ];

  const rows = displayItems.length > 0
    ? displayItems.map((item, i) => {
        const variation = item.variation_id
          ? variations.find(v => v.id === item.variation_id) : null;
        const varLabel = variation
          ? (variation.variation_number || `#${variation.id}`) : "Base Contract";
        const itemTotal = item.total || (n(item.quantity) * n(item.unit_price)) || 0;
        return isBank
          ? [String(i + 1).padStart(2, "0"), item.description || "—", item.quantity ?? "1", fmt(item.unit_price || 0), fmt(itemTotal)]
          : [String(i + 1).padStart(2, "0"), item.description || "—", varLabel, item.quantity ?? "1", fmt(item.unit_price || 0), fmt(itemTotal)];
      })
    : [
        isBank
          ? ["01", data.description || "Contract Invoice", "1", fmt(subtotal), fmt(subtotal)]
          : ["01", data.description || "Invoice Amount", "Base Contract", "1", fmt(subtotal), fmt(subtotal)],
      ];

  const totals = [
    { label: "Subtotal (Excl. VAT) / المجموع بدون ضريبة", value: fmt(subtotal) },
    { label: "VAT 5% / ضريبة القيمة المضافة",             value: fmt(vat) },
    ...(advDed > 0
      ? [
          { label: "Gross Total / الإجمالي الكلي",               value: fmt(total) },
          { label: "Advance Deduction / خصم الدفعة المقدمة",     value: `(${fmt(advDed)})` },
          { label: "Net Payable / صافي المستحق",                  value: fmt(netPayable), grand: true },
        ]
      : [{ label: "Grand Total / الإجمالي الكلي",                value: fmt(total), grand: true }]),
  ];

  const notes = [
    data.payment_id  ? { label: "Payment Ref / مرجع الدفع", value: `#${data.payment_id}` } : null,
    data.description ? { label: "Notes / ملاحظات",           value: data.description }       : null,
  ].filter(Boolean);

  const extraFields = [
    data.stage                  ? { label: "Stage / المرحلة",             value: data.stage }                          : null,
    project?.plot_number        ? { label: "Plot No. / رقم القطعة",       value: String(project.plot_number) }         : null,
    project?.contract?.gross_total ? { label: "Contract Value / قيمة العقد", value: fmt(project.contract.gross_total) }: null,
  ].filter(Boolean);

  return {
    titleAr: "فاتورة", titleEn: "Invoice",
    numberLabel: "Invoice Number / رقم الفاتورة",
    number: data.invoice_number || `#${data.id}`,
    dateLabel: "Date / التاريخ", date: fmtDate(data.invoice_date),
    cards: [
      { label: "Bill To / وجهة الفاتورة", valueAr: ownerAr, valueEn: ownerEn !== ownerAr ? ownerEn : null, lines: [...locationParts, licenseNo ? `Licence No: ${licenseNo}` : null].filter(Boolean), wide: true },
      { label: "Project Name / اسم المشروع", valueAr: projectAr, valueEn: projectEn !== projectAr ? projectEn : null },
    ],
    sectionLabel: "Invoice Details / تفاصيل الفاتورة",
    columns, rows, totals, notes, extraFields, showBankDetails: true,
  };
}

function buildPaymentDoc(data, project) {
  const sp = project?.siteplan_data || {};
  const authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
  const ownerAr = authOwner?.owner_name_ar || authOwner?.name || "";
  const ownerEn = authOwner?.owner_name_en || authOwner?.name || "";
  const locationParts = [
    sp.land_no && `Plot: ${sp.land_no}`, sp.sector && `Sector: ${sp.sector}`,
    sp.municipality, sp.zone && `Zone: ${sp.zone}`,
  ].filter(Boolean);
  const licenseNo = project?.license_data?.license_no || null;

  const amount = n(data.amount);
  const method = data.payment_method || "";
  const methodLabel = METHOD_LABELS[method] || method;

  const detailRows = [];
  if (method === "bank_transfer" || (method === "cash_deposit" && data.payer === "owner")) {
    if (data.recipient_account_number) detailRows.push(["—", "Recipient Account / حساب المستلم", data.recipient_account_number, "—", "—"]);
    if (data.sender_account_number)    detailRows.push(["—", "Sender Account / حساب المرسل",     data.sender_account_number,    "—", "—"]);
  }
  if (method === "bank_cheque") {
    if (data.cheque_holder_name)    detailRows.push(["—", "Cheque Holder / صاحب الشيك",    data.cheque_holder_name,                     "—", "—"]);
    if (data.cheque_account_number) detailRows.push(["—", "Cheque Account / رقم الشيك",    data.cheque_account_number,                  "—", "—"]);
    if (data.cheque_date)           detailRows.push(["—", "Cheque Date / تاريخ الشيك",     fmtDate(data.cheque_date),                   "—", "—"]);
  }
  if (data.transferor_name) detailRows.push(["—", "Transferor / المحوّل", data.transferor_name, "—", "—"]);
  if (data.payer === "bank" && data.project_financial_account) detailRows.push(["—", "Financial Account / الحساب المالي", data.project_financial_account, "—", "—"]);
  if (data.payer === "bank" && data.completion_percentage)     detailRows.push(["—", "Completion / نسبة الإنجاز", `${data.completion_percentage}%`,           "—", "—"]);

  const columns = [
    { label: "#",                               width: 28, align: "muted"  },
    { label: "Description / الوصف",             flex: 3,   align: "left"   },
    { label: "Payment Method / طريقة الدفع",   flex: 2,   align: "center" },
    { label: "Qty",                             width: 34, align: "center" },
    { label: "Amount / المبلغ",                 width: 90, align: "right"  },
  ];

  const rows = [
    ["01", data.description || "Payment", methodLabel, "1", fmt(amount)],
    ...detailRows.map((r, i) => [String(i + 2).padStart(2, "0"), ...r.slice(1)]),
  ];

  return {
    titleAr: "إيصال", titleEn: "Receipt",
    numberLabel: "Payment # / رقم الدفع",
    number: `#${data.id}`,
    dateLabel: "Date / التاريخ", date: fmtDate(data.date),
    cards: [
      { label: "Payment From / الدفع من", valueAr: ownerAr, valueEn: ownerEn !== ownerAr ? ownerEn : null, lines: [...locationParts, licenseNo ? `Licence No: ${licenseNo}` : null].filter(Boolean), wide: true },
      { label: "Payment Method / طريقة الدفع", valueAr: methodLabel },
    ],
    sectionLabel: "Payment Details / تفاصيل الدفع",
    columns, rows,
    totals: [{ label: "Amount / المبلغ", value: fmt(amount), grand: true }],
    notes: data.description ? [{ label: "Notes / ملاحظات", value: data.description }] : [],
    extraFields: [],
    showBankDetails: false,
  };
}

function buildReceiptVoucherDoc(data, project) {
  const sp = project?.siteplan_data || {};
  const authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
  const ownerAr = authOwner?.owner_name_ar || authOwner?.name || data.received_from || "";
  const ownerEn = authOwner?.owner_name_en || authOwner?.name || data.received_from_en || data.received_from || "";
  const locationParts = [
    sp.land_no && `Plot: ${sp.land_no}`, sp.sector && `Sector: ${sp.sector}`,
    sp.municipality, sp.zone && `Zone: ${sp.zone}`,
  ].filter(Boolean);
  const licenseNo = project?.license_data?.license_no || null;

  const amount         = n(data.amount);
  const creditDeducted = n(data.credit_deducted);
  const creditRemaining= n(data.credit_remaining);

  const columns = [
    { label: "#",                               width: 28, align: "muted"  },
    { label: "Description / الوصف",             flex: 3,   align: "left"   },
    { label: "Invoice # / رقم الفاتورة",        flex: 2,   align: "center" },
    { label: "Qty",                             width: 34, align: "center" },
    { label: "Amount / المبلغ",                 width: 90, align: "right"  },
  ];

  const rows = [["01", data.purpose || "Receipt", data.invoice_number || "—", "1", fmt(amount)]];

  const totals = [
    ...(creditDeducted > 0 ? [{ label: "Credit Deducted / الائتمان المخصوم", value: `(${fmt(creditDeducted)})` }] : []),
    ...(data.credit_source_voucher_number ? [{ label: "Source Voucher / السند المصدر", value: String(data.credit_source_voucher_number) }] : []),
    ...(creditRemaining > 0 ? [{ label: "Credit Remaining / الائتمان المتبقي", value: fmt(creditRemaining) }] : []),
    { label: "Amount / المبلغ", value: fmt(amount), grand: true },
  ];

  const cards = [
    { label: "Received From / المستلم منه", valueAr: ownerAr, valueEn: ownerEn !== ownerAr ? ownerEn : null, lines: [...locationParts, licenseNo ? `Licence No: ${licenseNo}` : null].filter(Boolean), wide: true },
    ...(data.invoice_number ? [{ label: "Invoice # / رقم الفاتورة", valueAr: data.invoice_number }] : []),
  ];

  return {
    titleAr: "سند قبض", titleEn: "Receipt Voucher",
    numberLabel: "Voucher # / رقم السند",
    number: String(data.voucher_number || `#${data.id}`),
    dateLabel: "Date / التاريخ", date: fmtDate(data.date),
    cards,
    sectionLabel: "Voucher Details / تفاصيل السند",
    columns, rows, totals,
    notes: data.notes ? [{ label: "Notes / ملاحظات", value: data.notes }] : [],
    extraFields: [],
    showBankDetails: false,
  };
}

function buildTaxInvoiceDoc(data, project) {
  const sp = project?.siteplan_data || {};
  const authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
  const ownerAr = authOwner?.owner_name_ar || authOwner?.name || "";
  const ownerEn = authOwner?.owner_name_en || authOwner?.name || "";
  const locationParts = [
    sp.land_no && `Plot: ${sp.land_no}`, sp.sector && `Sector: ${sp.sector}`,
    sp.municipality, sp.zone && `Zone: ${sp.zone}`,
  ].filter(Boolean);
  const licenseNo = project?.license_data?.license_no || null;
  const projectAr = project?.display_name || project?.name || "—";
  const projectEn = project?.display_name_en || project?.display_name || project?.name || "—";

  const vatRate    = n(data.vat_rate || 5);
  const netAmount  = n(data.net_amount);
  const vatAmount  = n(data.vat_amount  || (netAmount * vatRate) / 100);
  const grossAmount= n(data.gross_amount || netAmount + vatAmount);

  const columns = [
    { label: "#",                               width: 28, align: "muted"  },
    { label: "Description / الوصف",             flex: 4,   align: "left"   },
    { label: "VAT Rate / نسبة الضريبة",         width: 60, align: "center" },
    { label: "Amount / المبلغ",                  width: 90, align: "right"  },
  ];

  const rows = [
    ["01", "Net Amount / المبلغ الصافي",              "—",         fmt(netAmount)],
    ["02", "VAT Amount / ضريبة القيمة المضافة",      `${vatRate}%`, fmt(vatAmount)],
  ];

  const cards = [
    { label: "Bill To / وجهة الفاتورة", valueAr: ownerAr, valueEn: ownerEn !== ownerAr ? ownerEn : null, lines: [...locationParts, licenseNo ? `Licence No: ${licenseNo}` : null].filter(Boolean), wide: true },
    ...(data.invoice_number
      ? [{ label: "Linked Invoice / الفاتورة المرتبطة", valueAr: data.invoice_number }]
      : [{ label: "Project / المشروع", valueAr: projectAr, valueEn: projectEn !== projectAr ? projectEn : null }]),
  ];

  return {
    titleAr: "فاتورة ضريبية", titleEn: "Tax Invoice",
    numberLabel: "Tax Invoice # / رقم الفاتورة الضريبية",
    number: String(data.tax_invoice_number || `#${data.id}`),
    dateLabel: "Date / التاريخ", date: fmtDate(data.date),
    cards,
    sectionLabel: "Amount Breakdown / تفاصيل المبلغ",
    columns, rows,
    totals: [
      { label: "Net Amount / المبلغ الصافي",                           value: fmt(netAmount) },
      { label: `VAT (${vatRate}%) / ضريبة القيمة المضافة`,            value: fmt(vatAmount) },
      { label: "Gross Total / الإجمالي الكلي",                        value: fmt(grossAmount), grand: true },
    ],
    notes: [], extraFields: [], showBankDetails: true,
  };
}

/* ── Main component ─────────────────────────────────────────── */
export default function FinancialDocumentPDF({ documentType, data, project, company, variations = [] }) {
  const doc =
    documentType === "invoice"        ? buildInvoiceDoc(data, project, variations)
    : documentType === "payment"      ? buildPaymentDoc(data, project)
    : documentType === "receiptVoucher" ? buildReceiptVoucherDoc(data, project)
    : documentType === "taxInvoice"   ? buildTaxInvoiceDoc(data, project)
    : null;

  if (!doc) return <Document><Page size="A4" style={S.page}><Text>Unsupported document type</Text></Page></Document>;

  const logoSrc   = company?.logo || null;
  const companyAr = company?.name    || "";
  const companyEn = company?.name_en || company?.name || "";

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Header ── */}
        <View style={S.topRow}>
          <View style={S.companyPanel}>
            {logoSrc && <Image src={logoSrc} style={S.logoBox} />}
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
            <Text style={S.docTitleAr}>{doc.titleAr}</Text>
            <Text style={S.docTitleEn}>{doc.titleEn}</Text>
            <View style={S.metaGrid}>
              <View>
                <Text style={S.metaLabel}>{doc.numberLabel}</Text>
                <Text style={S.metaValue}>{safe(doc.number)}</Text>
              </View>
              <View>
                <Text style={S.metaLabel}>{doc.dateLabel}</Text>
                <Text style={S.metaValue}>{safe(doc.date)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Cards ── */}
        {doc.cards.length > 0 && (
          <View style={S.cardsRow}>
            {doc.cards.map((card, i) => (
              <View key={i} style={[S.card, card.wide && S.cardWide]}>
                <Text style={S.cardLabel}>{safe(card.label)}</Text>
                {card.valueAr ? <Text style={S.cardValueAr}>{safe(card.valueAr)}</Text> : null}
                {card.valueEn ? <Text style={S.cardValueEn}>{safe(card.valueEn)}</Text> : null}
                {(card.lines || []).map((line, li) => (
                  <Text key={li} style={S.cardLine}>{safe(line)}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ── Details table ── */}
        <View style={S.section}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionHeaderLabel}>{doc.sectionLabel}</Text>
            <Text style={S.sectionHeaderLabel}>{String(doc.rows.length).padStart(2, "0")} lines</Text>
          </View>
          <View style={S.tableWrap}>
            <DocTable columns={doc.columns} rows={doc.rows} />
          </View>
        </View>

        {/* ── Notes ── */}
        {doc.notes.length > 0 && (
          <View style={S.notesSection}>
            {doc.notes.map((note, i) => (
              <View key={i} style={S.noteRow}>
                <Text style={S.noteLabel}>{safe(note.label)}</Text>
                <Text style={S.noteValue}>{safe(note.value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Extra fields ── */}
        {doc.extraFields.length > 0 && (
          <View style={S.extraGrid}>
            {doc.extraFields.map((field, i) => (
              <View key={i} style={S.extraField}>
                <Text style={S.extraLabel}>{safe(field.label)}</Text>
                <Text style={S.extraValue}>{safe(field.value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Totals ── */}
        <View style={S.totalsBox}>
          {doc.totals.map((row, i) => (
            <View key={i} style={[S.totalsRow, i === doc.totals.length - 1 && S.totalsRowLast]}>
              <Text style={row.grand ? S.totalsGrandLabel : S.totalsLabel}>{safe(row.label)}</Text>
              <Text style={row.grand ? S.totalsGrandValue : S.totalsValue}>{safe(row.value)}</Text>
            </View>
          ))}
        </View>

        {/* ── Bank + QR (invoice & taxInvoice) ── */}
        {doc.showBankDetails && (
          <View style={S.bankQrRow}>
            <View style={S.bankBox}>
              <Text style={S.bankTitle}>Our Bank Account Details</Text>
              <View style={S.bankRow}><Text style={S.bankLabel}>Name of Bank</Text><Text style={S.bankValue}>ADCB</Text></View>
              <View style={S.bankRow}><Text style={S.bankLabel}>Account Number</Text><Text style={S.bankValue}>100551920001</Text></View>
              <View style={S.bankRow}><Text style={S.bankLabel}>IBAN Number</Text><Text style={S.bankValue}>AE690030000100551920001</Text></View>
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
        )}

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
