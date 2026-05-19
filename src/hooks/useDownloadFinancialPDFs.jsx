import { useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import JSZip from "jszip";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../contexts/NotificationContext";
import { api } from "../services/api";
import { projectApi } from "../services";
import { downloadBlob } from "../utils/helpers/file";
import FinancialDocumentPDF from "../components/pdf/FinancialDocumentPDF";

/**
 * Shared hook for downloading a list of financial documents as a ZIP of PDFs.
 *
 * Usage:
 *   const { downloadZip, zipLoading } = useDownloadFinancialPDFs(projectId);
 *
 *   downloadZip({
 *     items:        displayedInvoices,
 *     documentType: "invoice",          // invoice | payment | receiptVoucher | taxInvoice
 *     getFileName:  (item) => item.invoice_number || `INV-${item.id}`,
 *     zipName:      "ProjectX_Invoices.zip",  // optional — defaults to projectName_Documents.zip
 *   });
 */
export function useDownloadFinancialPDFs(projectId) {
  const { t } = useTranslation();
  const { success, error: showError } = useNotifications();
  const [zipLoading, setZipLoading] = useState(false);

  const downloadZip = useCallback(async ({ items, documentType, getFileName, zipName }) => {
    if (!items?.length) return;
    setZipLoading(true);
    try {
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
        vat_number: settingsData.company_license_number || settingsData.contractor_license_no || "",
        logo:       logoUrl,
      };

      const variations = variationsData
        ? (Array.isArray(variationsData) ? variationsData : (variationsData?.results || []))
        : [];

      const zip = new JSZip();
      let skipped = 0;
      for (const item of items) {
        try {
          const blob = await pdf(
            <FinancialDocumentPDF
              documentType={documentType}
              data={item}
              project={projectForPDF}
              company={companyForPDF}
              variations={variations}
            />
          ).toBlob();
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

  return { downloadZip, zipLoading };
}
