import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import Button from "../common/Button";
import DirhamsIcon from "../common/DirhamsIcon";
import { formatDate, formatMoney } from "../../utils/formatters";
import { projectApi } from "../../services";
import {
  buildFileUrl,
  extractFileNameFromUrl,
  handleFileClick,
} from "../../utils/helpers/file";
import "./UnifiedFinancialPrintTemplate.css";

const EMPTY = "-";

function hasFile(url) {
  return (
    url &&
    typeof url === "string" &&
    url.trim() !== "" &&
    url !== "null" &&
    url !== "undefined"
  );
}

function numberOrZero(value) {
  return parseFloat(value || 0) || 0;
}

function buildBilingualValue(ar, en) {
  const arValue = ar || en || EMPTY;
  const enValue = en || ar || EMPTY;
  return { ar: arValue, en: enValue };
}

function BilingualText({ value, className = "" }) {
  if (value && typeof value === "object" && ("ar" in value || "en" in value)) {
    return (
      <span className={`ufp-bilingual ${className}`}>
        <span className="ufp-bilingual__ar" dir="rtl">{value.ar || value.en || EMPTY}</span>
        <span className="ufp-bilingual__en" dir="ltr">{value.en || value.ar || EMPTY}</span>
      </span>
    );
  }

  return <span className={className}>{value ?? EMPTY}</span>;
}

const PUBLIC_DOCUMENT_SLUGS = {
  invoice: "invoice",
  payment: "payment",
  receiptVoucher: "receipt-voucher",
  taxInvoice: "tax-invoice",
};

export default function UnifiedFinancialPrintTemplate({
  documentType,
  data,
  project,
  company,
  onClose,
  hideControls = false,
  printMode: printModeProp,
  invoiceAttachments: invoiceAttachmentsProp,
  variations: variationsProp,
  linkedInvoiceItems: linkedInvoiceItemsProp,
  sheetPreview = false,
}) {
  const { t, i18n } = useTranslation();
  const tAr = useMemo(() => i18n.getFixedT("ar"), [i18n]);
  const tEn = useMemo(() => i18n.getFixedT("en"), [i18n]);
  const [asyncData, setAsyncData] = useState({
    invoiceAttachments: [],
    variations: [],
    linkedInvoiceItems: [],
  });
  const invoiceAttachments = asyncData.invoiceAttachments;
  const variations = asyncData.variations;
  const linkedInvoiceItems = asyncData.linkedInvoiceItems;

  const [printModeInternal, setPrintMode] = useState("detailed"); // "detailed" | "summary"
  const printMode = printModeProp ?? printModeInternal;
  const hasInvoiceAttachmentsProp = Array.isArray(invoiceAttachmentsProp);
  const hasVariationsProp = Array.isArray(variationsProp);
  const hasLinkedInvoiceItemsProp = Array.isArray(linkedInvoiceItemsProp);

  const label = useCallback(
    (key, fallback) => ({
      ar: tAr(key, { defaultValue: fallback || key }),
      en: tEn(key, { defaultValue: fallback || key }),
    }),
    [tAr, tEn]
  );

  const renderAmount = (value) => {
    const str = formatMoney(value, { lang: "en" });
    const numPart = str.replace(/AED\s?/, "").trim();
    return (
      <span className="ufp-amount" dir="ltr">
        {numPart} <DirhamsIcon size="1em" />
      </span>
    );
  };

  const renderDate = (value) => formatDate(value, "en");

  const buildQrData = useCallback(
    (fallback) => {
      const slug = PUBLIC_DOCUMENT_SLUGS[documentType];
      if (slug && data?.public_token) {
        return `${window.location.origin}/public/financial-documents/${slug}/${data.public_token}`;
      }
      return JSON.stringify(fallback);
    },
    [data?.public_token, documentType]
  );

  const logoUrl = useMemo(() => {
    let url = company?.logo;
    if (url && !url.startsWith("http")) url = buildFileUrl(url);
    return url || null;
  }, [company?.logo]);

  // Single combined effect: all async fetches run in parallel and update state once,
  // preventing 3 separate re-renders + 3 expensive document recomputations on load.
  useEffect(() => {
    // If all data is provided via props, apply immediately with no fetch
    if (hasInvoiceAttachmentsProp && hasVariationsProp && hasLinkedInvoiceItemsProp) {
      setAsyncData({
        invoiceAttachments: invoiceAttachmentsProp,
        variations: variationsProp,
        linkedInvoiceItems: linkedInvoiceItemsProp,
      });
      return;
    }

    let isActive = true;

    const fetchAttachments = async () => {
      if (hasInvoiceAttachmentsProp) return invoiceAttachmentsProp;
      if (documentType !== "invoice" || !data?.id || !data?.project) return [];
      try {
        const response = await projectApi.getAttachments({
          model: "actualinvoice",
          object_id: data.id.toString(),
        });
        return Array.isArray(response) ? response : response?.results || response?.items || [];
      } catch {
        return [];
      }
    };

    const fetchVariations = async () => {
      if (hasVariationsProp) return variationsProp;
      if (documentType !== "invoice" || !data?.project) return [];
      try {
        const response = await projectApi.getVariations(data.project);
        return Array.isArray(response) ? response : response?.results || response?.items || [];
      } catch {
        return [];
      }
    };

    const fetchLinkedInvoiceItems = async () => {
      if (hasLinkedInvoiceItemsProp) return linkedInvoiceItemsProp;
      if (documentType !== "taxInvoice") return [];
      try {
        if (data?.invoice) {
          const response = await projectApi.findInvoiceById(data.invoice);
          const invoice = response?.invoice || response;
          return Array.isArray(invoice?.items) ? invoice.items : [];
        }
        if (data?.invoice_number && data?.project) {
          const invoiceNumbers = data.invoice_number.split(",").map((n) => n.trim()).filter(Boolean);
          const allInvoices = await projectApi.getInvoices(data.project);
          const matched = allInvoices.filter((inv) => invoiceNumbers.includes(String(inv.invoice_number)));
          if (matched.length === 0) return [];
          const itemArrays = await Promise.all(
            matched.map(async (inv) => {
              if (Array.isArray(inv.items) && inv.items.length > 0) return inv.items;
              const full = await projectApi.findInvoiceById(inv.id);
              const fullInvoice = full?.invoice || full;
              return Array.isArray(fullInvoice?.items) ? fullInvoice.items : [];
            })
          );
          return itemArrays.flat();
        }
      } catch (err) {
        console.error("[TaxInvoice] failed to load linked invoice items:", err);
      }
      return [];
    };

    Promise.all([fetchAttachments(), fetchVariations(), fetchLinkedInvoiceItems()]).then(
      ([invoiceAttachmentsResult, variationsResult, linkedInvoiceItemsResult]) => {
        if (isActive) {
          setAsyncData({
            invoiceAttachments: invoiceAttachmentsResult,
            variations: variationsResult,
            linkedInvoiceItems: linkedInvoiceItemsResult,
          });
        }
      }
    );

    return () => {
      isActive = false;
    };
  }, [
    documentType,
    data?.id,
    data?.project,
    data?.invoice,
    data?.invoice_number,
    hasInvoiceAttachmentsProp,
    invoiceAttachmentsProp,
    hasVariationsProp,
    variationsProp,
    hasLinkedInvoiceItemsProp,
    linkedInvoiceItemsProp,
  ]);

  const projectName = useMemo(
    () =>
      buildBilingualValue(
        project?.display_name || project?.name || (project?.id ? `#${project.id}` : ""),
        project?.display_name_en ||
          project?.display_name ||
          project?.name ||
          (project?.id ? `#${project.id}` : "")
      ),
    [project]
  );
  const consultantName = useMemo(
    () =>
      buildBilingualValue(
        project?.__consultant_name_ar ||
          project?.consultant?.name ||
          project?.consultant_name ||
          project?.consultant,
        project?.__consultant_name_en ||
          project?.consultant?.name_en ||
          project?.consultant_name_en ||
          project?.consultant?.name ||
          project?.consultant_name ||
          project?.consultant
      ),
    [project]
  );

  const companyName = buildBilingualValue(company?.name, company?.name_en || company?.name);

  const document = useMemo(() => {
    if (!data) return null;

    const base = {
      title: label("invoice_print_title"),
      numberLabel: label("invoice_print_invoice_number"),
      number: EMPTY,
      dateLabel: label("invoice_print_date"),
      date: EMPTY,
      cards: [],
      sectionTitle: label("invoice_print_details"),
      lineCount: "01",
      columns: [],
      rows: [],
      totals: [],
      notes: [],
        extraFields: [],
        attachments: [],
        qrData: "{}",
        isVoided: data.status === "voided",
      };

    const _authOwner = (project?.owners || []).find(o => o.is_authorized) || (project?.owners || [])[0];
    const billToOwner = _authOwner
      ? buildBilingualValue(_authOwner.owner_name_ar || _authOwner.name, _authOwner.owner_name_en || _authOwner.name)
      : null;
    const _sp = project?.siteplan_data || {};
    const billToLines = [
      [_sp.land_no && `Plot: ${_sp.land_no}`, _sp.sector && `Sector: ${_sp.sector}`, _sp.municipality, _sp.zone && `Zone: ${_sp.zone}`].filter(Boolean).join(' | ') || null,
      project?.license_data?.license_no ? `Licence No: ${project.license_data.license_no}` : null,
    ].filter(Boolean);

    if (documentType === "invoice") {
      const isBank = data.payer === "bank";
      const netAmount = numberOrZero(data.net_amount);
      const vatAmount = numberOrZero(data.vat);
      const storedTotal = numberOrZero(data.amount);

      let subtotal, vat, total;
      if (isBank) {
        subtotal = netAmount > 0 ? netAmount : storedTotal;
        vat = vatAmount > 0 ? vatAmount : Math.round(subtotal * 0.05 * 100) / 100;
        total = Math.round((subtotal + vat) * 100) / 100;
      } else {
        subtotal = netAmount > 0 ? netAmount : storedTotal / 1.05;
        vat = vatAmount > 0 ? vatAmount : subtotal * 0.05;
        total = storedTotal > 0 ? storedTotal : subtotal + vat;
      }

      const advanceDeduction = numberOrZero(data.advance_deduction_amount);
      const netPayable = total - advanceDeduction;
      const ownerNames = (project?.owners || [])
        .filter((owner) => owner.is_authorized)
        .map((owner) => buildBilingualValue(owner.owner_name_ar || owner.name, owner.owner_name_en))
        .filter((owner) => owner.ar || owner.en);

      // For bank invoices, exclude bank_vat items from rows — VAT is shown in the totals section
      const displayItems = Array.isArray(data.items)
        ? (isBank ? data.items.filter(item => item.source !== "bank_vat") : data.items)
        : [];

      const buildDetailedRows = () =>
        displayItems.length > 0
          ? displayItems.map((item, index) => {
              const variation = item.variation_id
                ? variations.find((entry) => entry.id === item.variation_id)
                : null;
              const variationLabel = variation
                ? variation.variation_number || `#${variation.id}`
                : label("invoice_print_base_contract");
              const itemTotal =
                item.total ||
                numberOrZero(item.quantity) * numberOrZero(item.unit_price) ||
                0;
              return {
                cells: [
                  String(index + 1).padStart(2, "0"),
                  item.description || EMPTY,
                  ...(data.payer === "owner" ? [variationLabel] : []),
                  item.quantity || 0,
                  renderAmount(item.unit_price || 0),
                  renderAmount(itemTotal),
                ],
              };
            })
          : [
              {
                cells: [
                  "01",
                  data.description || label("invoice_print_invoice_amount"),
                  ...(data.payer === "owner" ? [label("invoice_print_base_contract")] : []),
                  "1",
                  renderAmount(subtotal),
                  renderAmount(subtotal),
                ],
              },
            ];

      const buildSummaryRows = () => {
        if (displayItems.length === 0) return buildDetailedRows();
        const consolidatedSources = ["variation", "prolongation_fee"];
        const baseItems = displayItems.filter(item => !consolidatedSources.includes(item.source));
        const consolidatedItems = displayItems.filter(item => consolidatedSources.includes(item.source));
        if (consolidatedItems.length === 0) return buildDetailedRows();

        const baseRows = baseItems.map((item, index) => {
          const itemTotal = item.total || numberOrZero(item.quantity) * numberOrZero(item.unit_price) || 0;
          return {
            cells: [
              String(index + 1).padStart(2, "0"),
              item.description || EMPTY,
              ...(data.payer === "owner" ? [label("invoice_print_base_contract")] : []),
              item.quantity || 0,
              renderAmount(item.unit_price || 0),
              renderAmount(itemTotal),
            ],
          };
        });

        const consolidatedTotal = consolidatedItems.reduce((sum, item) => {
          return sum + (item.total || numberOrZero(item.quantity) * numberOrZero(item.unit_price) || 0);
        }, 0);

        const consolidatedRow = {
          cells: [
            String(baseRows.length + 1).padStart(2, "0"),
            { ar: "إجمالي أوامر التغيير المعتمدة", en: "Total Approved Variations" },
            ...(data.payer === "owner"
              ? [{ ar: `${consolidatedItems.length} بند`, en: `${consolidatedItems.length} Item(s)` }]
              : []),
            consolidatedItems.length,
            renderAmount(consolidatedTotal),
            renderAmount(consolidatedTotal),
          ],
        };

        return [...baseRows, consolidatedRow];
      };

      const rows = printMode === "summary" ? buildSummaryRows() : buildDetailedRows();

      return {
        ...base,
        title: label("invoice_print_title"),
        numberLabel: label("invoice_print_invoice_number"),
        number: data.invoice_number || `#${data.id}`,
        dateLabel: label("invoice_print_date"),
        date: renderDate(data.invoice_date),
        cards: [
          {
            label: { ar: "وجهة الفاتورة", en: "Bill To" },
            value: billToOwner,
            lines: billToLines,
            span: 2,
          },
          { label: label("invoice_print_project_name"), value: billToOwner || projectName },
        ],
        sectionTitle: label("invoice_print_details"),
        lineCount: String(rows.length).padStart(2, "0"),
        columns: [
          "#",
          label("invoice_print_description"),
          ...(data.payer === "owner" ? [label("invoice_print_variation")] : []),
          label("invoice_print_quantity"),
          label("invoice_print_unit_price"),
          label("invoice_print_total"),
        ],
        rows,
        totals: [
          { label: label("invoice_print_subtotal"), value: renderAmount(subtotal) },
          { label: label("invoice_print_vat"), value: renderAmount(vat) },
          { label: label("invoice_print_grand_total"), value: renderAmount(total), grand: advanceDeduction <= 0 },
          ...(advanceDeduction > 0
            ? [
                { label: label("invoice_print_advance_deduction"), value: <>({renderAmount(advanceDeduction)})</> },
                { label: label("invoice_print_net_payable"), value: renderAmount(netPayable), grand: true },
              ]
            : []),
        ],
        notes: [
          ...(data.payment_id
            ? [{ label: label("invoice_print_payment_reference"), value: `#${data.payment_id}` }]
            : []),
          ...(data.description ? [{ label: label("invoice_print_notes"), value: data.description }] : []),
        ],
        extraFields: [
          ...(data.stage ? [{ label: label("invoice_print_stage"), value: data.stage }] : []),
          ...(project?.plot_number ? [{ label: label("invoice_print_plot_number"), value: project.plot_number }] : []),
          ...(project?.contract?.gross_total
            ? [{ label: label("invoice_print_contract_value"), value: renderAmount(project.contract.gross_total) }]
            : []),
          ...(ownerNames.length > 0
            ? [{ label: label("invoice_print_owner_name"), value: ownerNames }]
            : []),
        ],
        attachments: invoiceAttachments.map((attachment, index) => ({
          key: attachment.id || index,
          label: attachment.file_name || label("invoice_print_view_file"),
          url: attachment.file_url || attachment.file_path,
          name: attachment.file_name,
        })),
        qrData: buildQrData({
          type: "INVOICE",
          id: data.id,
          number: data.invoice_number || data.id,
          amount: total,
          vat,
          date: data.invoice_date,
          company: company?.name,
          vat_number: company?.vat_number,
        }),
      };
    }

    if (documentType === "payment") {
      const amount = numberOrZero(data.amount);
      const methodLabel = label(`payment_print_${data.payment_method}`, data.payment_method);
      const detailRows = [];
      if (data.payment_method === "bank_transfer" || (data.payment_method === "cash_deposit" && data.payer === "owner")) {
        if (data.recipient_account_number) detailRows.push({ label: label("payment_print_recipient_account_number"), value: data.recipient_account_number });
        if (data.sender_account_number) detailRows.push({ label: label("payment_print_sender_account_number"), value: data.sender_account_number });
      }
      if (data.payment_method === "bank_cheque") {
        if (data.cheque_holder_name) detailRows.push({ label: label("payment_print_cheque_holder_name"), value: data.cheque_holder_name });
        if (data.cheque_account_number) detailRows.push({ label: label("payment_print_cheque_account_number"), value: data.cheque_account_number });
        if (data.cheque_date) detailRows.push({ label: label("payment_print_cheque_date"), value: renderDate(data.cheque_date) });
      }
      if (data.transferor_name) detailRows.push({ label: label("payment_print_transferor_name"), value: data.transferor_name });
      if (data.payer === "bank" && data.project_financial_account) detailRows.push({ label: label("payment_print_project_financial_account"), value: data.project_financial_account });
      if (data.payer === "bank" && data.completion_percentage) detailRows.push({ label: label("payment_print_completion_percentage"), value: `${data.completion_percentage}%` });

      const attachments = [];

      return {
        ...base,
        title: label("payment_print_title"),
        numberLabel: label("payment_print_payment_number"),
        number: `#${data.id}`,
        dateLabel: label("payment_print_date"),
        date: renderDate(data.date),
        cards: [
          {
            label: { ar: "الدفع من", en: "Payment From" },
            value: billToOwner,
            lines: billToLines,
            span: 2,
          },
          { label: label("payment_print_payment_method"), value: methodLabel },
        ],
        sectionTitle: label("payment_print_details"),
        lineCount: String(1 + detailRows.length).padStart(2, "0"),
        columns: [
          "#",
          label("invoice_print_description"),
          label("payment_print_payment_method"),
          label("invoice_print_quantity"),
          label("payment_print_amount"),
        ],
        rows: [
          {
            cells: [
              "01",
              data.description || label("payment_print_title"),
              methodLabel,
              "1",
              renderAmount(amount),
            ],
          },
          ...detailRows.map((row, index) => ({
            cells: [
              String(index + 2).padStart(2, "0"),
              row.label,
              row.value,
              EMPTY,
              EMPTY,
            ],
          })),
        ],
        totals: [{ label: label("payment_print_amount"), value: renderAmount(amount), grand: true }],
        attachments,
        qrData: buildQrData({
          type: "PAYMENT_RECEIPT",
          id: data.id,
          amount: data.amount,
          date: data.date,
          method: data.payment_method,
          payer: data.payer,
          project: project?.display_name || project?.name || project?.id,
          company: company?.name,
        }),
      };
    }

    if (documentType === "receiptVoucher") {
      const amount = numberOrZero(data.amount);
      const creditRemaining = numberOrZero(data.credit_remaining);
      const creditDeducted = numberOrZero(data.credit_deducted);

      return {
        ...base,
        title: label("rv_print_title"),
        numberLabel: label("rv_print_voucher_number"),
        number: data.voucher_number,
        dateLabel: label("rv_print_date"),
        date: renderDate(data.date),
        cards: [
          {
            label: label("rv_print_received_from"),
            value: billToOwner || buildBilingualValue(data.received_from, data.received_from_en || data.received_from),
            lines: billToLines,
            span: 2,
          },
          ...(data.invoice_number ? [{ label: label("rv_print_invoice_number"), value: data.invoice_number }] : []),
        ],
        sectionTitle: label("rv_print_received_from_title"),
        columns: [
          "#",
          label("invoice_print_description"),
          label("rv_print_invoice_number"),
          label("invoice_print_quantity"),
          label("rv_print_amount"),
        ],
        rows: [
          {
            cells: [
              "01",
              data.purpose || label("rv_print_received_from_title"),
              data.invoice_number || EMPTY,
              "1",
              renderAmount(amount),
            ],
          },
        ],
        totals: [
          ...(creditDeducted > 0
            ? [
                { label: label("rv_print_deducted_amount"), value: <>({renderAmount(creditDeducted)})</> },
                ...(data.credit_source_voucher_number
                  ? [{ label: label("rv_print_source_voucher"), value: data.credit_source_voucher_number }]
                  : []),
              ]
            : []),
          ...(creditRemaining > 0
            ? [{ label: label("rv_print_credit_remaining"), value: renderAmount(creditRemaining) }]
            : []),
          { label: label("rv_print_amount"), value: renderAmount(amount), grand: true },
        ],
        notes: data.notes ? [{ label: label("rv_print_notes"), value: data.notes }] : [],
        qrData: buildQrData({
          type: "RECEIPT_VOUCHER",
          voucher_number: data.voucher_number,
          amount: data.amount,
          date: data.date,
          project: project?.display_name || project?.name || project?.id,
          company: company?.name,
          received_from: data.received_from,
        }),
      };
    }

    if (documentType === "taxInvoice") {
      const netAmount = numberOrZero(data.net_amount);
      const vatRate = numberOrZero(data.vat_rate || 5);
      const vatAmount = numberOrZero(data.vat_amount || (netAmount * vatRate) / 100);
      const grossAmount = numberOrZero(data.gross_amount || netAmount + vatAmount);

      const tiDisplayItems = linkedInvoiceItems.filter(item => item.source !== "bank_vat");

      const buildTaxSummaryRows = () => {
        if (tiDisplayItems.length === 0) {
          return [
            { cells: ["01", label("ti_print_net_amount"), renderAmount(netAmount), renderAmount(vatAmount)] },
          ];
        }

        const consolidatedSources = ["variation", "prolongation_fee"];
        const baseItems = tiDisplayItems.filter(item => !consolidatedSources.includes(item.source));
        const consolidatedItems = tiDisplayItems.filter(item => consolidatedSources.includes(item.source));

        const baseRows = baseItems.map((item, index) => {
          const itemNet = item.total || numberOrZero(item.quantity) * numberOrZero(item.unit_price) || 0;
          const itemVat = Math.round(itemNet * (vatRate / 100) * 100) / 100;
          return {
            cells: [
              String(index + 1).padStart(2, "0"),
              item.description || EMPTY,
              renderAmount(itemNet),
              renderAmount(itemVat),
            ],
          };
        });

        if (consolidatedItems.length === 0) return baseRows;

        const consolidatedNet = consolidatedItems.reduce((sum, item) => {
          return sum + (item.total || numberOrZero(item.quantity) * numberOrZero(item.unit_price) || 0);
        }, 0);
        const consolidatedVat = Math.round(consolidatedNet * (vatRate / 100) * 100) / 100;

        const consolidatedRow = {
          cells: [
            String(baseRows.length + 1).padStart(2, "0"),
            { ar: "إجمالي أوامر التغيير المعتمدة", en: "Total Approved Variations" },
            renderAmount(consolidatedNet),
            renderAmount(consolidatedVat),
          ],
        };

        return [...baseRows, consolidatedRow];
      };

      const tiRows = buildTaxSummaryRows();

      return {
        ...base,
        title: label("ti_print_title"),
        numberLabel: label("ti_print_invoice_number"),
        number: data.tax_invoice_number,
        dateLabel: label("ti_print_date"),
        date: renderDate(data.date),
        cards: [
          {
            label: label("ti_print_project_name"),
            value: billToOwner || projectName,
            lines: billToLines,
            span: 2,
          },
          ...(data.invoice_number ? [{ label: label("ti_print_linked_invoice_number"), value: data.invoice_number }] : []),
        ],
        sectionTitle: label("ti_print_amount_breakdown"),
        lineCount: String(tiRows.length).padStart(2, "0"),
        columns: [
          "#",
          label("invoice_print_description"),
          label("ti_print_net_amount"),
          label("ti_print_vat_amount"),
        ],
        rows: tiRows,
        totals: [
          { label: label("ti_print_net_amount"), value: renderAmount(netAmount) },
          { label: { ar: `${tAr("ti_print_vat_amount")} (${vatRate}%)`, en: `${tEn("ti_print_vat_amount")} (${vatRate}%)` }, value: renderAmount(vatAmount) },
          { label: label("ti_print_gross_amount"), value: renderAmount(grossAmount), grand: true },
        ],
        qrData: buildQrData({
          type: "TAX_INVOICE",
          invoice_number: data.tax_invoice_number,
          net_amount: netAmount,
          vat_amount: vatAmount,
          gross_amount: grossAmount,
          date: data.date,
          company: company?.name,
          vat_number: company?.vat_number,
        }),
      };
    }

    return base;
  }, [
    company,
    data,
    documentType,
    buildQrData,
    invoiceAttachments,
    label,
    linkedInvoiceItems,
    printMode,
    project,
    projectName,
    tAr,
    tEn,
    variations,
  ]);

  if (!document) return null;

  return (
    <div
      className={[
        "ufp-container",
        hideControls ? "ufp-container--embedded" : "",
        sheetPreview ? "ufp-container--sheet-preview" : "",
      ].filter(Boolean).join(" ")}
    >
      {!hideControls && (
        <div className="ufp-controls no-print">
          <Button variant="secondary" onClick={onClose}>{t("back")}</Button>
          {documentType === "invoice" && (
            <div className="ufp-print-mode-toggle">
              <button
                className={`ufp-print-mode-btn${printMode === "detailed" ? " ufp-print-mode-btn--active" : ""}`}
                onClick={() => setPrintMode("detailed")}
              >
                {t("print_mode_detailed", "Detailed")}
              </button>
              <button
                className={`ufp-print-mode-btn${printMode === "summary" ? " ufp-print-mode-btn--active" : ""}`}
                onClick={() => setPrintMode("summary")}
              >
                {t("print_mode_summary", "Summary")}
              </button>
            </div>
          )}
          <Button variant="primary" onClick={() => window.print()}>{t("print")}</Button>
        </div>
      )}

      <article className="ufp-doc" dir="ltr">
        {document.isVoided && (
          <div className="ufp-voided-banner">
            VOIDED
          </div>
        )}

        <header className="ufp-top">
          <div className="ufp-company">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={company?.name || "Company logo"}
                className="ufp-company__logo"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
            <div className="ufp-company__body">
              <BilingualText value={companyName} className="ufp-company__name" />
              <div className="ufp-company__details">
                {company?.address && <span>{company.address}</span>}
                {company?.phone && <span dir="ltr">{company.phone}</span>}
                {company?.email && <span dir="ltr">{company.email}</span>}
                {company?.vat_number && (
                  <span>
                    <BilingualText value={label("vat_registration")} />: {company.vat_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="ufp-title-panel">
            <BilingualText value={document.title} className="ufp-title" />
            <div className="ufp-meta">
              <div>
                <BilingualText value={document.numberLabel} className="ufp-meta__label" />
                <strong>{document.number}</strong>
              </div>
              <div>
                <BilingualText value={document.dateLabel} className="ufp-meta__label" />
                <strong>{document.date}</strong>
              </div>
            </div>
          </div>
        </header>

        {document.cards.length > 0 && (
          <section className="ufp-cards">
            {document.cards.map((card, index) => (
              <div
                className="ufp-info-card"
                key={`${card.label?.en || index}-${index}`}
                style={card.span > 1 ? { gridColumn: `span ${card.span}` } : {}}
              >
                <BilingualText value={card.label} className="ufp-info-card__label" />
                {card.value && <BilingualText value={card.value} className="ufp-info-card__value" />}
                {card.lines?.length > 0 && (
                  <div className="ufp-info-card__lines">
                    {card.lines.map((line, i) => (
                      <span key={i} className="ufp-info-card__line">{line}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        <section className="ufp-section ufp-section--details">
          <div className="ufp-section__header">
            <BilingualText value={document.sectionTitle} />
            <span>{document.lineCount} lines</span>
          </div>

          <table className="ufp-table">
            <thead>
              <tr>
                {document.columns.map((column, index) => (
                  <th key={index}>
                    <BilingualText value={column} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {document.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.cells.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <BilingualText value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {document.notes.length > 0 && (
          <section className="ufp-notes">
            {document.notes.map((note, index) => (
              <p key={index}>
                <strong><BilingualText value={note.label} /></strong>
                <span>{note.value}</span>
              </p>
            ))}
          </section>
        )}

        {document.extraFields.length > 0 && (
          <section className="ufp-extra-grid">
            {document.extraFields.map((field, index) => (
              <div className="ufp-field" key={index}>
                <BilingualText value={field.label} className="ufp-field__label" />
                {Array.isArray(field.value) ? (
                  <span className="ufp-field__value">
                    {field.value.map((item, itemIndex) => (
                      <BilingualText value={item} key={itemIndex} />
                    ))}
                  </span>
                ) : (
                  <BilingualText value={field.value} className="ufp-field__value" />
                )}
              </div>
            ))}
          </section>
        )}

        {document.attachments.length > 0 && (
          <section className="ufp-section ufp-section--attachments">
            <div className="ufp-section__header">
              <BilingualText value={label("invoice_print_attachments")} />
            </div>
            <div className="ufp-attachments">
              {document.attachments.map((attachment, index) => (
                <a
                  key={attachment.key || attachment.url || index}
                  href={buildFileUrl(attachment.url)}
                  onClick={handleFileClick(attachment.url, attachment.name)}
                  className="ufp-attachment"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BilingualText value={attachment.label} />
                  {attachment.name && <span>{attachment.name}</span>}
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="ufp-doc__footer">
          <section className="ufp-bottom">
            <div className="ufp-totals-box">
              <table className="ufp-totals">
                <tbody>
                  {document.totals.map((row, index) => (
                    <tr className={row.grand ? "ufp-totals__grand" : ""} key={index}>
                      <td><BilingualText value={row.label} /></td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="ufp-bank-qr-row">
            {(documentType === "invoice" || documentType === "taxInvoice") && (
              <div className="ufp-bank-details">
                <div className="ufp-bank-details__title">OUR BANK ACCOUNT DETAILS</div>
                <div className="ufp-bank-details__rows">
                  <div className="ufp-bank-details__row">
                    <span className="ufp-bank-details__label">NAME OF BANK</span>
                    <span className="ufp-bank-details__value">ADCB</span>
                  </div>
                  <div className="ufp-bank-details__row">
                    <span className="ufp-bank-details__label">ACCOUNT NUMBER</span>
                    <span className="ufp-bank-details__value">100551920001</span>
                  </div>
                  <div className="ufp-bank-details__row">
                    <span className="ufp-bank-details__label">IBAN NUMBER</span>
                    <span className="ufp-bank-details__value">AE690030000100551920001</span>
                  </div>
                </div>
                <div className="ufp-bank-details__cheque">
                  Make all cheques payable to <strong>Al Yafour General Contracting &amp; Trans Sole Proprietorship LLC</strong>
                </div>
              </div>
            )}

            <div className="ufp-verify">
              <QRCodeSVG value={document.qrData} size={64} level="M" includeMargin={false} />
              <div>
                <h4>SCAN TO VERIFY</h4>
                <BilingualText value={label("invoice_print_electronic_notice")} />
              </div>
            </div>
          </div>

          <section className="ufp-signatures">
            <div className="ufp-sign-card">
              <span />
              <strong><BilingualText value={label("invoice_print_received_by")} /></strong>
            </div>
            <div className="ufp-sign-card ufp-sign-card--stamp">
              <div><BilingualText value={label("invoice_print_company_stamp")} /></div>
            </div>
            <div className="ufp-sign-card">
              <span />
              <strong><BilingualText value={label("invoice_print_authorized_signature")} /></strong>
            </div>
          </section>

          <p className="ufp-final-notice">
            <BilingualText value={label("invoice_print_electronic_notice")} />
          </p>

          <img src="/credsnewfix.png" alt="Credentials" className="ufp-creds-banner" />
        </div>
      </article>
    </div>
  );
}
