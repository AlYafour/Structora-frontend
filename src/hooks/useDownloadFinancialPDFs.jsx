import { useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import JSZip from "jszip";
import QRCode from "qrcode";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../contexts/NotificationContext";
import { api } from "../services/api";
import { projectApi } from "../services";
import { taxInvoiceApi } from "../services/taxInvoices/taxInvoiceApi";
import { downloadBlob } from "../utils/helpers/file";
import FinancialDocumentPDF from "../components/pdf/FinancialDocumentPDF";

function buildQRData(documentType, item, company) {
  if (documentType === "invoice") {
    return JSON.stringify({ type: "INVOICE", id: item.id, number: item.invoice_number || item.id, amount: item.amount, date: item.invoice_date, company: company?.name, vat_number: company?.vat_number });
  }
  if (documentType === "payment") {
    return JSON.stringify({ type: "PAYMENT_RECEIPT", id: item.id, amount: item.amount, date: item.date, method: item.payment_method, payer: item.payer, company: company?.name });
  }
  if (documentType === "receiptVoucher") {
    return JSON.stringify({ type: "RECEIPT_VOUCHER", voucher_number: item.voucher_number, amount: item.amount, date: item.date, company: company?.name });
  }
  if (documentType === "taxInvoice") {
    return JSON.stringify({ type: "TAX_INVOICE", invoice_number: item.tax_invoice_number, net_amount: item.net_amount, vat_amount: item.vat_amount, gross_amount: item.gross_amount, date: item.date, company: company?.name, vat_number: company?.vat_number });
  }
  return JSON.stringify({ id: item.id });
}

/** Shared project/company/variations setup needed to render any financial document PDF. */
async function fetchProjectAndCompanyForPDF(projectId, documentType) {
  const needsVariations = documentType === "invoice";
  const [projectData, settingsRes, variationsData] = await Promise.all([
    projectApi.getWithIncludes(projectId, ["siteplan", "license", "contract"]),
    api.get("auth/tenant-settings/current/", { _skipAuthRedirect: true }),
    needsVariations ? projectApi.getVariations(projectId) : Promise.resolve(null),
  ]);

  const siteplanData = projectData?.siteplan_data || null;
  const licenseData  = projectData?.license_data  || null;
  const projectForPDF = {
    ...projectData,
    owners:               siteplanData?.owners || [],
    plot_number:          siteplanData?.plot_number || projectData?.plot_number || null,
    contract:             projectData?.contract_data || null,
    __consultant_name_ar: licenseData?.design_consultant_name    || licenseData?.supervision_consultant_name    || "",
    __consultant_name_en: licenseData?.design_consultant_name_en || licenseData?.supervision_consultant_name_en || "",
  };

  const settingsData = settingsRes.data;
  const rawLogoPath  = (settingsData.logo_url || settingsData.company_logo || "").split("?")[0];
  const logoUrl = rawLogoPath
    ? (rawLogoPath.startsWith("http") ? rawLogoPath : `${window.location.origin}/media/${rawLogoPath}`)
    : null;
  const companyForPDF = {
    name:       settingsData.company_name        || settingsData.contractor_name     || "",
    name_en:    settingsData.contractor_name_en  || "",
    address:    settingsData.company_address     || settingsData.contractor_address  || "",
    phone:      settingsData.company_phone       || settingsData.contractor_phone    || "",
    email:      settingsData.contractor_email    || settingsData.company_email       || "",
    vat_number: settingsData.company_trn || "",
    logo:       logoUrl,
  };

  const variations = variationsData
    ? (Array.isArray(variationsData) ? variationsData : (variationsData?.results || []))
    : [];

  return { projectData, projectForPDF, companyForPDF, variations };
}

/** Render a single financial document (invoice/payment/receiptVoucher/taxInvoice) to a PDF Blob. */
async function renderFinancialDocumentBlob({ item, documentType, projectForPDF, companyForPDF, variations, projectId }) {
  const needsLinkedItems = documentType === "taxInvoice";
  let linkedInvoiceItems = [];
  if (needsLinkedItems) {
    try {
      if (item.invoice) {
        const res = await projectApi.findInvoiceById(item.invoice);
        const inv = res?.invoice || res;
        linkedInvoiceItems = Array.isArray(inv?.items) ? inv.items : [];
      } else if (item.invoice_number && projectId) {
        const nums = String(item.invoice_number).split(",").map(x => x.trim()).filter(Boolean);
        const allInv = await projectApi.getInvoices(projectId);
        const matched = (Array.isArray(allInv) ? allInv : allInv?.results || [])
          .filter(inv => nums.includes(String(inv.invoice_number)));
        if (matched.length > 0) {
          const arrays = await Promise.all(
            matched.map(async (inv) => {
              if (Array.isArray(inv.items) && inv.items.length > 0) return inv.items;
              const full = await projectApi.findInvoiceById(inv.id);
              const fi = full?.invoice || full;
              return Array.isArray(fi?.items) ? fi.items : [];
            })
          );
          linkedInvoiceItems = arrays.flat();
        }
      }
    } catch (linkErr) {
      console.warn("[useDownloadFinancialPDFs] linked items fetch failed for item", item?.id, linkErr);
    }
  }

  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(buildQRData(documentType, item, companyForPDF), { width: 64, margin: 1 });
  } catch (qrErr) {
    console.warn("[useDownloadFinancialPDFs] QR generation failed", item?.id, qrErr);
  }

  return pdf(
    <FinancialDocumentPDF
      documentType={documentType}
      data={item}
      project={projectForPDF}
      company={companyForPDF}
      variations={variations}
      linkedInvoiceItems={linkedInvoiceItems}
      qrDataUrl={qrDataUrl}
    />
  ).toBlob();
}

/**
 * Shared hook for downloading financial documents as PDFs — either a single item or a
 * ZIP of several.
 *
 * Usage:
 *   const { downloadZip, zipLoading, downloadSingle, singleLoading } = useDownloadFinancialPDFs(projectId);
 *
 *   downloadZip({
 *     items:        displayedInvoices,
 *     documentType: "invoice",          // invoice | payment | receiptVoucher | taxInvoice
 *     getFileName:  (item) => item.invoice_number || `INV-${item.id}`,
 *     zipName:      "ProjectX_Invoices.zip",  // optional — defaults to projectName_Documents.zip
 *   });
 *
 *   downloadSingle(itemId, { documentType: "invoice" });
 */
export function useDownloadFinancialPDFs(projectId) {
  const { t } = useTranslation();
  const { success, error: showError } = useNotifications();
  const [zipLoading, setZipLoading] = useState(false);
  const [singleLoading, setSingleLoading] = useState(null);

  const downloadZip = useCallback(async ({ items, documentType, getFileName, zipName }) => {
    if (!items?.length) return;
    setZipLoading(true);
    try {
      const { projectData, projectForPDF, companyForPDF, variations } = await fetchProjectAndCompanyForPDF(projectId, documentType);

      const zip = new JSZip();
      let skipped = 0;
      for (const item of items) {
        try {
          const blob = await renderFinancialDocumentBlob({ item, documentType, projectForPDF, companyForPDF, variations, projectId });
          if (blob) {
            const fileName = getFileName(item).replace(/[\\/:*?"<>|]/g, "_");
            zip.file(`${fileName}.pdf`, blob);
          }
        } catch (itemErr) {
          console.error("[useDownloadFinancialPDFs] item failed:", item?.id, itemErr);
          skipped++;
        }
      }

      const projectName = (projectData.display_name || projectData.name || `Project_${projectId}`)
        .replace(/[\\/:*?"<>|]/g, "_");
      const finalName = (zipName || `${projectName}_Documents.zip`).replace(/[\\/:*?"<>|]/g, "_");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, finalName);
      if (skipped > 0) {
        showError(t("documents_partial", `Downloaded with ${skipped} item(s) skipped due to errors.`));
      } else {
        success(t("documents_downloaded", "Documents downloaded successfully"));
      }
    } catch (err) {
      console.error("[useDownloadFinancialPDFs]", err);
      showError(t("download_error", "Download failed. Please try again."));
    } finally {
      setZipLoading(false);
    }
  }, [projectId, t, success, showError]);

  const downloadSingle = useCallback(async (itemId, { documentType } = {}) => {
    setSingleLoading(itemId);
    try {
      const { projectForPDF, companyForPDF, variations } = await fetchProjectAndCompanyForPDF(projectId, documentType);

      let item;
      if (documentType === "invoice") {
        const res = await projectApi.findInvoiceById(itemId);
        item = res?.invoice || res;
      } else if (documentType === "payment") {
        item = await projectApi.findPaymentById(itemId);
      } else if (documentType === "receiptVoucher") {
        item = await projectApi.getReceiptVoucherById(projectId, itemId);
      } else if (documentType === "taxInvoice") {
        const res = await taxInvoiceApi.getById(projectId, itemId);
        item = res?.tax_invoice || res;
      } else {
        throw new Error(`downloadSingle: unsupported documentType "${documentType}"`);
      }

      const blob = await renderFinancialDocumentBlob({ item, documentType, projectForPDF, companyForPDF, variations, projectId });
      if (blob) {
        const fileName = (item.invoice_number || item.voucher_number || item.tax_invoice_number || `${documentType}-${item.id}`)
          .toString().replace(/[\\/:*?"<>|]/g, "_");
        downloadBlob(blob, `${fileName}.pdf`);
      }
      success(t("document_downloaded", "Document downloaded successfully"));
    } catch (err) {
      console.error("[useDownloadFinancialPDFs] single failed:", itemId, err);
      showError(t("download_error", "Download failed. Please try again."));
    } finally {
      setSingleLoading(null);
    }
  }, [projectId, t, success, showError]);

  return { downloadZip, zipLoading, downloadSingle, singleLoading };
}
