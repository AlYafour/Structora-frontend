/**
 * FinancialDocumentPDF — @react-pdf/renderer component.
 * Handles: invoice | payment | receiptVoucher | taxInvoice
 * Layout mirrors UnifiedFinancialPrintTemplate exactly (bilingual labels, same sections, same data).
 */
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import { formatMoney, formatDate } from "../../utils/formatters";
import { registerPDFFonts } from "./registerFonts";
import { L } from "../../utils/financial/pdfLabels";

registerPDFFonts();

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
const EMPTY = "—";

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
  docTitleEn: { fontFamily: "Cairo", fontSize: 10, fontWeight: 400, color: C.secondary, textTransform: "uppercase", marginBottom: 10 },
  metaGrid: { flexDirection: "row", gap: 16 },
  metaLabelAr: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.secondary, marginBottom: 1 },
  metaLabelEn: { fontFamily: "Cairo", fontSize: 6, fontWeight: 400, color: C.secondary, marginBottom: 3 },
  metaValue: { fontFamily: "Cairo", fontSize: 10, fontWeight: 700, color: C.primary },

  /* Cards */
  cardsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  card: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: "10 12", minHeight: 60 },
  cardWide: { flex: 2 },
  cardLabelAr: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", marginBottom: 2 },
  cardLabelEn: { fontFamily: "Cairo", fontSize: 5.5, fontWeight: 400, color: C.secondary, marginBottom: 5 },
  cardValueAr: { fontFamily: "Cairo", fontSize: 10, fontWeight: 700, color: C.primary, marginBottom: 1 },
  cardValueEn: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 400, color: C.secondary },
  cardLine: { fontFamily: "Cairo", fontSize: 7.5, color: C.secondary, marginTop: 3 },

  /* Details section */
  section: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, overflow: "hidden", marginBottom: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: "10 16 8", borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid" },
  sectionHeaderLabelAr: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase" },
  sectionHeaderLabelEn: { fontFamily: "Cairo", fontSize: 6, fontWeight: 400, color: C.secondary },
  tableWrap: { padding: "0 10 12" },
  table: { marginTop: 8 },
  tableHdrRow: { flexDirection: "row", backgroundColor: C.tableHdr, borderRadius: 4 },
  thCell: { paddingVertical: 7, paddingHorizontal: 5, alignItems: "center" },
  thAr: { fontFamily: "Cairo", fontSize: 7, fontWeight: 700, color: C.primary, textAlign: "center" },
  thEn: { fontFamily: "Cairo", fontSize: 5.5, fontWeight: 400, color: C.secondary, textAlign: "center", marginTop: 1 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid", minHeight: 26 },
  tdCell: { paddingVertical: 7, paddingHorizontal: 5, justifyContent: "center" },
  tdMuted:  { fontFamily: "Cairo", fontSize: 8, color: C.secondary, textAlign: "center" },
  tdLeft:   { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, fontWeight: 700 },
  tdLeftSub:{ fontFamily: "Cairo", fontSize: 6.5, color: C.secondary, marginTop: 1 },
  tdCenter: { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, textAlign: "center" },
  tdCenterSub: { fontFamily: "Cairo", fontSize: 6.5, color: C.secondary, textAlign: "center", marginTop: 1 },
  tdRight:  { fontFamily: "Cairo", fontSize: 8.5, color: C.primary, fontWeight: 700, textAlign: "right" },

  /* Notes */
  notesSection: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: "10 14", marginBottom: 10, gap: 5 },
  noteRow: { flexDirection: "row", gap: 8 },
  noteLabelAr: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", width: 100, flexShrink: 0 },
  noteLabelEn: { fontFamily: "Cairo", fontSize: 6, fontWeight: 400, color: C.secondary },
  noteValue: { fontFamily: "Cairo", fontSize: 8, color: C.primary, flex: 1 },

  /* Extra fields */
  extraGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  extraField: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: "8 12", minWidth: "22%" },
  extraLabelAr: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", marginBottom: 2 },
  extraLabelEn: { fontFamily: "Cairo", fontSize: 5.5, fontWeight: 400, color: C.secondary, marginBottom: 4 },
  extraValueAr: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.primary },
  extraValueEn: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 400, color: C.secondary, marginTop: 1 },

  /* Totals */
  totalsBox: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, marginBottom: 10, overflow: "hidden" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: "solid" },
  totalsRowLast: { borderBottomWidth: 0 },
  totalsLabelAr: { fontFamily: "Cairo", fontSize: 8, fontWeight: 700, color: C.secondary },
  totalsLabelEn: { fontFamily: "Cairo", fontSize: 6, fontWeight: 400, color: C.secondary, marginTop: 1 },
  totalsValue: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.primary, textAlign: "right" },
  totalsGrandLabelAr: { fontFamily: "Cairo", fontSize: 8.5, fontWeight: 700, color: C.primary },
  totalsGrandLabelEn: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 400, color: C.secondary, marginTop: 1 },
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
  qrImage: { width: 60, height: 60 },
  qrPlaceholder: { width: 60, height: 60, borderWidth: 1, borderColor: C.border, borderStyle: "solid", alignItems: "center", justifyContent: "center" },
  qrLabel: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 700, color: C.secondary, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" },

  /* Signatures */
  sigRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  sigCard: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderStyle: "solid", borderRadius: 6, padding: "12 14", minHeight: 60, justifyContent: "flex-end" },
  sigCardStamp: { alignItems: "center", justifyContent: "center" },
  sigLine: { height: 1, backgroundColor: C.primary, marginBottom: 8 },
  sigLabelAr: { fontFamily: "Cairo", fontSize: 7.5, fontWeight: 700, color: C.secondary, textAlign: "center", marginBottom: 2 },
  sigLabelEn: { fontFamily: "Cairo", fontSize: 6.5, fontWeight: 400, color: C.secondary, textTransform: "uppercase", textAlign: "center" },
  stampBox: { borderWidth: 1, borderColor: C.border, borderStyle: "dashed", borderRadius: 5, paddingVertical: 14, paddingHorizontal: 10, width: "100%", alignItems: "center" },

  /* Footer */
  notice: { textAlign: "center", fontFamily: "Cairo", fontSize: 7, color: C.secondary, marginTop: 4, marginBottom: 2 },
  noticeSub: { textAlign: "center", fontFamily: "Cairo", fontSize: 6, color: C.secondary, marginBottom: 6 },
  credsBanner: { width: "100%", marginTop: 4 },
});

/* ── Helpers ────────────────────────────────────────────────── */
const n = (v) => parseFloat(v || 0) || 0;
const fmt = (v) => formatMoney(v ?? 0, { lang: "en" });
const fmtDate = (v) => (v ? (formatDate(v, "en") || String(v)) : null) || "—";
const safe = (v) => (v !== null && v !== undefined && v !== "") ? String(v) : "—";
const bv = (ar, en) => ({ ar: ar || en || EMPTY, en: en || ar || EMPTY });

function colSizeOf(col) {
  return col.width ? { width: col.width } : { flex: col.flex || 1 };
}

/* ── BilText: renders {ar,en} as two-line or string as one-line ── */
function BilText({ value, arStyle, enStyle }) {
  if (value && typeof value === "object" && ("ar" in value || "en" in value)) {
    const ar = value.ar || value.en || EMPTY;
    const en = value.en || value.ar || EMPTY;
    if (ar === en) return <Text style={arStyle}>{safe(ar)}</Text>;
    return (
      <View>
        <Text style={arStyle}>{safe(ar)}</Text>
        <Text style={enStyle}>{safe(en)}</Text>
      </View>
    );
  }
  return <Text style={arStyle}>{safe(value)}</Text>;
}

/* ── DocTable ───────────────────────────────────────────────── */
function DocTable({ columns, rows }) {
  return (
    <View style={S.table}>
      <View style={S.tableHdrRow}>
        {columns.map((col, i) => (
          <View key={i} style={[S.thCell, colSizeOf(col)]}>
            <BilText value={col.label} arStyle={S.thAr} enStyle={S.thEn} />
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={S.tableRow}>
          {row.cells.map((cell, ci) => {
            const col = columns[ci];
            const isAmt  = col?.align === "right";
            const isCtr  = col?.align === "center";
            const isMuted = col?.align === "muted";
            const tdStyle = isAmt ? S.tdRight : isCtr ? S.tdCenter : isMuted ? S.tdMuted : S.tdLeft;
            const subStyle = isAmt ? S.tdRight  : isCtr ? S.tdCenterSub : S.tdLeftSub;
            return (
              <View key={ci} style={[S.tdCell, colSizeOf(col)]}>
                <BilText value={cell} arStyle={tdStyle} enStyle={subStyle} />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* ── Document builders ──────────────────────────────────────── */
function buildInvoiceDoc(data, project, variations) {
  const isBank = data.payer === "bank";
  const sp = project?.siteplan_data || {};
  const authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
  const billToOwner = authOwner
    ? bv(authOwner.owner_name_ar || authOwner.name, authOwner.owner_name_en || authOwner.name)
    : null;
  const billToLines = [
    [sp.land_no && `Plot: ${sp.land_no}`, sp.sector && `Sector: ${sp.sector}`, sp.municipality, sp.zone && `Zone: ${sp.zone}`].filter(Boolean).join(" | ") || null,
    project?.license_data?.license_no ? `Licence No: ${project.license_data.license_no}` : null,
  ].filter(Boolean);
  const projectName = bv(
    project?.display_name || project?.name || (project?.id ? `#${project.id}` : ""),
    project?.display_name_en || project?.display_name || project?.name || (project?.id ? `#${project.id}` : "")
  );

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

  const displayItems = Array.isArray(data.items)
    ? (isBank ? data.items.filter(i => i.source !== "bank_vat") : data.items)
    : [];

  const ownerNames = (project?.owners || [])
    .filter(o => o.is_authorized)
    .map(o => bv(o.owner_name_ar || o.name, o.owner_name_en || o.name))
    .filter(o => o.ar || o.en);

  const columns = isBank
    ? [
        { label: "#",                               width: 28, align: "muted"  },
        { label: L("invoice_print_description"),    flex: 4,   align: "left"   },
        { label: L("invoice_print_quantity"),       width: 30, align: "center" },
        { label: L("invoice_print_unit_price"),     width: 78, align: "right"  },
        { label: L("invoice_print_total"),          width: 80, align: "right"  },
      ]
    : [
        { label: "#",                               width: 28, align: "muted"  },
        { label: L("invoice_print_description"),    flex: 4,   align: "left"   },
        { label: L("invoice_print_variation"),      flex: 2,   align: "center" },
        { label: L("invoice_print_quantity"),       width: 30, align: "center" },
        { label: L("invoice_print_unit_price"),     width: 78, align: "right"  },
        { label: L("invoice_print_total"),          width: 80, align: "right"  },
      ];

  const rows = displayItems.length > 0
    ? displayItems.map((item, i) => {
        const variation = item.variation_id
          ? variations.find(v => v.id === item.variation_id) : null;
        const varLabel = variation
          ? (variation.variation_number || `#${variation.id}`)
          : L("invoice_print_base_contract");
        const itemTotal = item.total || (n(item.quantity) * n(item.unit_price)) || 0;
        return {
          cells: isBank
            ? [String(i + 1).padStart(2, "0"), item.description || EMPTY, String(item.quantity || 0), fmt(item.unit_price || 0), fmt(itemTotal)]
            : [String(i + 1).padStart(2, "0"), item.description || EMPTY, varLabel, String(item.quantity || 0), fmt(item.unit_price || 0), fmt(itemTotal)],
        };
      })
    : [{
        cells: isBank
          ? ["01", data.description || L("invoice_print_invoice_amount"), "1", fmt(subtotal), fmt(subtotal)]
          : ["01", data.description || L("invoice_print_invoice_amount"), L("invoice_print_base_contract"), "1", fmt(subtotal), fmt(subtotal)],
      }];

  return {
    titleAr: L("invoice_print_title").ar,
    titleEn: L("invoice_print_title").en,
    numberLabel: L("invoice_print_invoice_number"),
    number: String(data.invoice_number || `#${data.id}`),
    dateLabel: L("invoice_print_date"),
    date: fmtDate(data.invoice_date),
    cards: [
      { label: { ar: "وجهة الفاتورة", en: "Bill To" }, value: billToOwner, lines: billToLines, span: 2 },
      { label: L("invoice_print_project_name"), value: billToOwner || projectName },
    ],
    sectionTitle: L("invoice_print_details"),
    columns, rows,
    totals: [
      { label: L("invoice_print_subtotal"), value: fmt(subtotal) },
      { label: L("invoice_print_vat"),      value: fmt(vat) },
      { label: L("invoice_print_grand_total"), value: fmt(total), grand: advDed <= 0 },
      ...(advDed > 0 ? [
        { label: L("invoice_print_advance_deduction"), value: `(${fmt(advDed)})` },
        { label: L("invoice_print_net_payable"),       value: fmt(netPayable), grand: true },
      ] : []),
    ],
    notes: [
      ...(data.payment_id  ? [{ label: L("invoice_print_payment_reference"), value: `#${data.payment_id}` }] : []),
      ...(data.description ? [{ label: L("invoice_print_notes"),             value: data.description }]       : []),
    ],
    extraFields: [
      ...(data.stage            ? [{ label: L("invoice_print_stage"),          value: data.stage }]                            : []),
      ...(project?.plot_number  ? [{ label: L("invoice_print_plot_number"),    value: String(project.plot_number) }]           : []),
      ...(project?.contract?.gross_total ? [{ label: L("invoice_print_contract_value"), value: fmt(project.contract.gross_total) }] : []),
      ...(ownerNames.length > 0 ? [{ label: L("invoice_print_owner_name"),     value: ownerNames }]                            : []),
    ],
    showBankDetails: true,
    qrData: JSON.stringify({ type: "INVOICE", id: data.id, number: data.invoice_number || data.id, amount: total, vat, date: data.invoice_date }),
  };
}

function buildPaymentDoc(data, project) {
  const sp = project?.siteplan_data || {};
  const authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
  const billToOwner = authOwner
    ? bv(authOwner.owner_name_ar || authOwner.name, authOwner.owner_name_en || authOwner.name)
    : null;
  const billToLines = [
    [sp.land_no && `Plot: ${sp.land_no}`, sp.sector && `Sector: ${sp.sector}`, sp.municipality, sp.zone && `Zone: ${sp.zone}`].filter(Boolean).join(" | ") || null,
    project?.license_data?.license_no ? `Licence No: ${project.license_data.license_no}` : null,
  ].filter(Boolean);

  const amount = n(data.amount);
  const method = data.payment_method || "";
  const methodLabel = L(`payment_print_${method}`, method);

  const detailRows = [];
  if (method === "bank_transfer" || (method === "cash_deposit" && data.payer === "owner")) {
    if (data.recipient_account_number) detailRows.push({ label: L("payment_print_recipient_account_number"), value: String(data.recipient_account_number) });
    if (data.sender_account_number)    detailRows.push({ label: L("payment_print_sender_account_number"),    value: String(data.sender_account_number) });
  }
  if (method === "bank_cheque") {
    if (data.cheque_holder_name)    detailRows.push({ label: L("payment_print_cheque_holder_name"),    value: String(data.cheque_holder_name) });
    if (data.cheque_account_number) detailRows.push({ label: L("payment_print_cheque_account_number"), value: String(data.cheque_account_number) });
    if (data.cheque_date)           detailRows.push({ label: L("payment_print_cheque_date"),           value: fmtDate(data.cheque_date) });
  }
  if (data.transferor_name) detailRows.push({ label: L("payment_print_transferor_name"),          value: String(data.transferor_name) });
  if (data.payer === "bank" && data.project_financial_account) detailRows.push({ label: L("payment_print_project_financial_account"), value: String(data.project_financial_account) });
  if (data.payer === "bank" && data.completion_percentage)     detailRows.push({ label: L("payment_print_completion_percentage"),     value: `${data.completion_percentage}%` });

  const columns = [
    { label: "#",                               width: 28, align: "muted"  },
    { label: L("invoice_print_description"),    flex: 3,   align: "left"   },
    { label: L("payment_print_payment_method"), flex: 2,   align: "center" },
    { label: L("invoice_print_quantity"),       width: 30, align: "center" },
    { label: L("payment_print_amount"),         width: 90, align: "right"  },
  ];

  const rows = [
    { cells: ["01", data.description || L("payment_print_title"), methodLabel, "1", fmt(amount)] },
    ...detailRows.map((row, i) => ({
      cells: [String(i + 2).padStart(2, "0"), row.label, row.value, EMPTY, EMPTY],
    })),
  ];

  return {
    titleAr: L("payment_print_title").ar,
    titleEn: L("payment_print_title").en,
    numberLabel: L("payment_print_payment_number"),
    number: `#${data.id}`,
    dateLabel: L("payment_print_date"),
    date: fmtDate(data.date),
    cards: [
      { label: { ar: "الدفع من", en: "Payment From" }, value: billToOwner, lines: billToLines, span: 2 },
      { label: L("payment_print_payment_method"), value: methodLabel },
    ],
    sectionTitle: L("payment_print_details"),
    columns, rows,
    totals: [{ label: L("payment_print_amount"), value: fmt(amount), grand: true }],
    notes: [],
    extraFields: [],
    showBankDetails: false,
    qrData: JSON.stringify({ type: "PAYMENT_RECEIPT", id: data.id, amount: data.amount, date: data.date, method, payer: data.payer }),
  };
}

function buildReceiptVoucherDoc(data, project) {
  const sp = project?.siteplan_data || {};
  const authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
  const billToOwner = authOwner
    ? bv(authOwner.owner_name_ar || authOwner.name, authOwner.owner_name_en || authOwner.name)
    : bv(data.received_from, data.received_from_en || data.received_from);
  const billToLines = [
    [sp.land_no && `Plot: ${sp.land_no}`, sp.sector && `Sector: ${sp.sector}`, sp.municipality, sp.zone && `Zone: ${sp.zone}`].filter(Boolean).join(" | ") || null,
    project?.license_data?.license_no ? `Licence No: ${project.license_data.license_no}` : null,
  ].filter(Boolean);

  const amount          = n(data.amount);
  const creditDeducted  = n(data.credit_deducted);
  const creditRemaining = n(data.credit_remaining);

  const columns = [
    { label: "#",                            width: 28, align: "muted"  },
    { label: L("invoice_print_description"), flex: 3,   align: "left"   },
    { label: L("rv_print_invoice_number"),   flex: 2,   align: "center" },
    { label: L("invoice_print_quantity"),    width: 30, align: "center" },
    { label: L("rv_print_amount"),           width: 90, align: "right"  },
  ];

  const rows = [{
    cells: ["01", data.purpose || L("rv_print_received_from_title"), data.invoice_number || EMPTY, "1", fmt(amount)],
  }];

  return {
    titleAr: L("rv_print_title").ar,
    titleEn: L("rv_print_title").en,
    numberLabel: L("rv_print_voucher_number"),
    number: String(data.voucher_number || `#${data.id}`),
    dateLabel: L("rv_print_date"),
    date: fmtDate(data.date),
    cards: [
      { label: L("rv_print_received_from"), value: billToOwner, lines: billToLines, span: 2 },
      ...(data.invoice_number ? [{ label: L("rv_print_invoice_number"), value: String(data.invoice_number) }] : []),
    ],
    sectionTitle: L("rv_print_received_from_title"),
    columns, rows,
    totals: [
      ...(creditDeducted > 0 ? [
        { label: L("rv_print_deducted_amount"),  value: `(${fmt(creditDeducted)})` },
        ...(data.credit_source_voucher_number
          ? [{ label: L("rv_print_source_voucher"), value: String(data.credit_source_voucher_number) }]
          : []),
      ] : []),
      ...(creditRemaining > 0 ? [{ label: L("rv_print_credit_remaining"), value: fmt(creditRemaining) }] : []),
      { label: L("rv_print_amount"), value: fmt(amount), grand: true },
    ],
    notes: data.notes ? [{ label: L("rv_print_notes"), value: data.notes }] : [],
    extraFields: [],
    showBankDetails: false,
    qrData: JSON.stringify({ type: "RECEIPT_VOUCHER", voucher_number: data.voucher_number, amount: data.amount, date: data.date }),
  };
}

function buildTaxInvoiceDoc(data, project, linkedInvoiceItems) {
  const sp = project?.siteplan_data || {};
  const authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
  const billToOwner = authOwner
    ? bv(authOwner.owner_name_ar || authOwner.name, authOwner.owner_name_en || authOwner.name)
    : null;
  const billToLines = [
    [sp.land_no && `Plot: ${sp.land_no}`, sp.sector && `Sector: ${sp.sector}`, sp.municipality, sp.zone && `Zone: ${sp.zone}`].filter(Boolean).join(" | ") || null,
    project?.license_data?.license_no ? `Licence No: ${project.license_data.license_no}` : null,
  ].filter(Boolean);
  const projectName = bv(
    project?.display_name || project?.name || (project?.id ? `#${project.id}` : ""),
    project?.display_name_en || project?.display_name || project?.name || (project?.id ? `#${project.id}` : "")
  );

  const vatRate    = n(data.vat_rate || 5);
  const netAmount  = n(data.net_amount);
  const vatAmount  = n(data.vat_amount  || (netAmount * vatRate) / 100);
  const grossAmount= n(data.gross_amount || netAmount + vatAmount);

  const tiDisplayItems = (linkedInvoiceItems || []).filter(item => item.source !== "bank_vat");

  const makeRows = () => {
    if (tiDisplayItems.length === 0) {
      return [
        { cells: ["01", L("ti_print_net_amount"), fmt(netAmount), fmt(vatAmount)] },
      ];
    }
    const consolidatedSources = ["variation", "prolongation_fee"];
    const baseItems = tiDisplayItems.filter(item => !consolidatedSources.includes(item.source));
    const consItems = tiDisplayItems.filter(item =>  consolidatedSources.includes(item.source));

    const baseRows = baseItems.map((item, i) => {
      const itemNet = item.total || (n(item.quantity) * n(item.unit_price)) || 0;
      const itemVat = Math.round(itemNet * (vatRate / 100) * 100) / 100;
      return { cells: [String(i + 1).padStart(2, "0"), item.description || EMPTY, fmt(itemNet), fmt(itemVat)] };
    });

    if (consItems.length === 0) return baseRows;

    const consNet = consItems.reduce((s, item) => s + (item.total || (n(item.quantity) * n(item.unit_price)) || 0), 0);
    const consVat = Math.round(consNet * (vatRate / 100) * 100) / 100;
    return [...baseRows, {
      cells: [
        String(baseRows.length + 1).padStart(2, "0"),
        { ar: "إجمالي أوامر التغيير المعتمدة", en: "Total Approved Variations" },
        fmt(consNet),
        fmt(consVat),
      ],
    }];
  };

  const rows = makeRows();

  const columns = [
    { label: "#",                              width: 28, align: "muted"  },
    { label: L("invoice_print_description"),   flex: 4,   align: "left"   },
    { label: L("ti_print_net_amount"),         width: 90, align: "right"  },
    { label: L("ti_print_vat_amount"),         width: 90, align: "right"  },
  ];

  return {
    titleAr: L("ti_print_title").ar,
    titleEn: L("ti_print_title").en,
    numberLabel: L("ti_print_invoice_number"),
    number: String(data.tax_invoice_number || `#${data.id}`),
    dateLabel: L("ti_print_date"),
    date: fmtDate(data.date),
    cards: [
      { label: L("ti_print_project_name"), value: billToOwner || projectName, lines: billToLines, span: 2 },
      ...(data.invoice_number ? [{ label: L("ti_print_linked_invoice_number"), value: String(data.invoice_number) }] : []),
    ],
    sectionTitle: L("ti_print_amount_breakdown"),
    columns, rows,
    totals: [
      { label: L("ti_print_net_amount"),   value: fmt(netAmount) },
      { label: { ar: `مبلغ الضريبة (${vatRate}%)`, en: `VAT Amount (${vatRate}%)` }, value: fmt(vatAmount) },
      { label: L("ti_print_gross_amount"), value: fmt(grossAmount), grand: true },
    ],
    notes: [],
    extraFields: [],
    showBankDetails: true,
    qrData: JSON.stringify({ type: "TAX_INVOICE", invoice_number: data.tax_invoice_number, net_amount: netAmount, vat_amount: vatAmount, gross_amount: grossAmount, date: data.date }),
  };
}

/* ── Main component ─────────────────────────────────────────── */
export default function FinancialDocumentPDF({ documentType, data, project, company, variations = [], linkedInvoiceItems = [], qrDataUrl = null }) {
  const doc =
    documentType === "invoice"         ? buildInvoiceDoc(data, project, variations)
    : documentType === "payment"       ? buildPaymentDoc(data, project)
    : documentType === "receiptVoucher"? buildReceiptVoucherDoc(data, project)
    : documentType === "taxInvoice"    ? buildTaxInvoiceDoc(data, project, linkedInvoiceItems)
    : null;

  if (!doc) return (
    <Document>
      <Page size="A4" style={S.page}><Text>Unsupported document type</Text></Page>
    </Document>
  );

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
              {companyAr ? <Text style={S.companyNameAr}>{safe(companyAr)}</Text> : null}
              {companyEn && companyEn !== companyAr ? <Text style={S.companyNameEn}>{safe(companyEn)}</Text> : null}
              <View style={S.companyDetails}>
                {company?.address    && <Text style={S.companyDetail}>{safe(company.address)}</Text>}
                {company?.phone      && <Text style={S.companyDetail}>{safe(company.phone)}</Text>}
                {company?.email      && <Text style={S.companyDetail}>{safe(company.email)}</Text>}
                {company?.vat_number && <Text style={S.companyDetail}>{safe(L("vat_registration").en)}: {safe(company.vat_number)}</Text>}
              </View>
            </View>
          </View>
          <View style={S.titlePanel}>
            <Text style={S.docTitleAr}>{safe(doc.titleAr)}</Text>
            <Text style={S.docTitleEn}>{safe(doc.titleEn)}</Text>
            <View style={S.metaGrid}>
              <View>
                <BilText value={doc.numberLabel} arStyle={S.metaLabelAr} enStyle={S.metaLabelEn} />
                <Text style={S.metaValue}>{safe(doc.number)}</Text>
              </View>
              <View>
                <BilText value={doc.dateLabel} arStyle={S.metaLabelAr} enStyle={S.metaLabelEn} />
                <Text style={S.metaValue}>{safe(doc.date)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Cards ── */}
        {doc.cards.length > 0 && (
          <View style={S.cardsRow}>
            {doc.cards.map((card, i) => (
              <View key={i} style={[S.card, card.span > 1 && S.cardWide]}>
                <BilText value={card.label} arStyle={S.cardLabelAr} enStyle={S.cardLabelEn} />
                {card.value && <BilText value={card.value} arStyle={S.cardValueAr} enStyle={S.cardValueEn} />}
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
            <BilText value={doc.sectionTitle} arStyle={S.sectionHeaderLabelAr} enStyle={S.sectionHeaderLabelEn} />
            <Text style={S.sectionHeaderLabelAr}>{String(doc.rows.length).padStart(2, "0")} lines</Text>
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
                <View style={{ width: 110, flexShrink: 0 }}>
                  <BilText value={note.label} arStyle={S.noteLabelAr} enStyle={S.noteLabelEn} />
                </View>
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
                <BilText value={field.label} arStyle={S.extraLabelAr} enStyle={S.extraLabelEn} />
                {Array.isArray(field.value)
                  ? field.value.map((item, ii) => (
                      <BilText key={ii} value={item} arStyle={S.extraValueAr} enStyle={S.extraValueEn} />
                    ))
                  : <BilText value={field.value} arStyle={S.extraValueAr} enStyle={S.extraValueEn} />
                }
              </View>
            ))}
          </View>
        )}

        {/* ── Totals ── */}
        <View style={S.totalsBox}>
          {doc.totals.map((row, i) => (
            <View key={i} style={[S.totalsRow, i === doc.totals.length - 1 && S.totalsRowLast]}>
              <View style={{ flex: 1 }}>
                <BilText
                  value={row.label}
                  arStyle={row.grand ? S.totalsGrandLabelAr : S.totalsLabelAr}
                  enStyle={row.grand ? S.totalsGrandLabelEn : S.totalsLabelEn}
                />
              </View>
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
              {qrDataUrl
                ? <Image src={qrDataUrl} style={S.qrImage} />
                : <View style={S.qrPlaceholder}>
                    <Text style={{ fontFamily: "Cairo", fontSize: 5.5, color: C.secondary, textAlign: "center" }}>QR{"\n"}CODE</Text>
                  </View>
              }
              <Text style={S.qrLabel}>SCAN TO{"\n"}VERIFY</Text>
            </View>
          </View>
        )}

        {/* ── Signatures ── */}
        <View style={S.sigRow}>
          <View style={S.sigCard}>
            <View style={S.sigLine} />
            <Text style={S.sigLabelAr}>{safe(L("invoice_print_received_by").ar)}</Text>
            <Text style={S.sigLabelEn}>{safe(L("invoice_print_received_by").en)}</Text>
          </View>
          <View style={[S.sigCard, S.sigCardStamp]}>
            <View style={S.stampBox}>
              <Text style={S.sigLabelAr}>{safe(L("invoice_print_company_stamp").ar)}</Text>
              <Text style={S.sigLabelEn}>{safe(L("invoice_print_company_stamp").en)}</Text>
            </View>
          </View>
          <View style={S.sigCard}>
            <View style={S.sigLine} />
            <Text style={S.sigLabelAr}>{safe(L("invoice_print_authorized_signature").ar)}</Text>
            <Text style={S.sigLabelEn}>{safe(L("invoice_print_authorized_signature").en)}</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={S.notice}>{safe(L("invoice_print_electronic_notice").ar)}</Text>
        <Text style={S.noticeSub}>{safe(L("invoice_print_electronic_notice").en)}</Text>
        <Image src={`${ORIGIN}/credsnewfix.png`} style={S.credsBanner} />

      </Page>
    </Document>
  );
}
