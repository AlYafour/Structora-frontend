import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { pdf } from '@react-pdf/renderer';
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";
import { formatMoney, formatDate } from "../../../utils/formatters";
import { getContractTypeLabel } from "../../../utils/projectLabels";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import DirhamsIcon from "../../../components/common/DirhamsIcon";
import { companyApi } from "../../../services/company/companyApi";
import { projectApi } from "../../../services/projects/projectApi";
import { api } from "../../../services/api";
import { logger } from "../../../utils/logger";
import { useNotifications } from "../../../contexts/NotificationContext";
import ContractPdfDocument from "./ContractPdfDocument";
import "./ContractTab.css";

async function toBase64(url) {
  if (!url) return null;
  try {
    let path = url;
    try {
      path = new URL(url).pathname.replace(/^\/api\//, '');
    } catch (_err) {
      path = url;
    }
    const { data } = await api.get(path, { responseType: 'blob' });
    return new Promise((res) => {
      const r = new FileReader();
      r.onload  = () => res(r.result);
      r.onerror = () => res(null);
      r.readAsDataURL(data);
    });
  } catch { return null; }
}

const ContractTab = memo(function ContractTab({ projectId, contract, startOrder, projectPermissions }) {
  const { t, i18n } = useTranslation();
  const isAR = i18n.language === 'ar';
  const hasContract = !!contract;
  const contractTypeLabel = getContractTypeLabel(contract?.contract_type, i18n.language);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const { error: showError } = useNotifications();

  // Helper function to render amount with Dirhams icon for English only
  const renderAmount = (value) => {
    if (!value) return t("empty_value");

    if (!isAR) {
      // For English: Extract just the number and add Dirhams icon
      const formattedValue = formatMoney(value, { lang: 'en' });
      // Remove any currency text/symbol that might be there
      const numericValue = formattedValue.replace(/[^0-9.,]/g, '');
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {numericValue} <DirhamsIcon size={12} color="#374151" />
        </span>
      );
    }
    // For Arabic: Use the Arabic formatted string (includes Arabic text/symbols)
    return formatMoney(value, { lang: 'ar' });
  };

  // Collect all attachments into a single array
  const allAttachments = [];

  // Core static attachments
  if (contract?.contract_file) {
    allAttachments.push({
      label: t("original_contract"),
      fileUrl: contract.contract_file,
      fileName: contract.contract_file_name || extractFileNameFromUrl(contract.contract_file),
    });
  }

  if (contract?.quantities_table_file) {
    allAttachments.push({
      label: t("quantities_table"),
      fileUrl: contract.quantities_table_file,
      fileName: contract.quantities_table_file_name || extractFileNameFromUrl(contract.quantities_table_file),
    });
  }

  if (contract?.approved_materials_table_file) {
    allAttachments.push({
      label: t("approved_materials_table"),
      fileUrl: contract.approved_materials_table_file,
      fileName: contract.approved_materials_table_file_name || extractFileNameFromUrl(contract.approved_materials_table_file),
    });
  }

  if (contract?.contract_appendix_file) {
    allAttachments.push({
      label: t("contract_appendix"),
      fileUrl: contract.contract_appendix_file,
      fileName: contract.contract_appendix_file_name || extractFileNameFromUrl(contract.contract_appendix_file),
    });
  }

  if (contract?.contract_explanation_file) {
    allAttachments.push({
      label: t("contract_explanation"),
      fileUrl: contract.contract_explanation_file,
      fileName: contract.contract_explanation_file_name || extractFileNameFromUrl(contract.contract_explanation_file),
    });
  }

  if (contract?.price_offer_file) {
    allAttachments.push({
      label: t("price_offer"),
      fileUrl: contract.price_offer_file,
      fileName: contract.price_offer_file_name || extractFileNameFromUrl(contract.price_offer_file),
    });
  }

  // Drawings
  const drawingTypes = [
    { key: "architectural_drawings", label: t("architectural_drawings") },
    { key: "structural_drawings", label: t("structural_drawings") },
    { key: "ac_drawings", label: t("ac_drawings") },
    { key: "electrical_drawings", label: t("electrical_drawings") },
    { key: "water_supply_drawings", label: t("water_supply_drawings") },
    { key: "drainage_drawings", label: t("drainage_drawings") },
    { key: "telecommunication_drawings", label: t("telecommunication_drawings") },
    { key: "fire_fighting_drawings", label: t("fire_fighting_drawings") },
    { key: "cctv_drawings", label: t("cctv_drawings") },
  ];

  drawingTypes.forEach(({ key, label }) => {
    const fileUrl = contract?.[`${key}_file`];
    const fileName = contract?.[`${key}_file_name`];
    if (fileUrl) {
      allAttachments.push({
        label,
        fileUrl,
        fileName: fileName || extractFileNameFromUrl(fileUrl),
      });
    }
  });

  // Dynamic attachments (contractual appendices)
  if (contract?.attachments && Array.isArray(contract.attachments)) {
    contract.attachments
      .filter(att => att && att.type !== "main_contract") // Filter out main_contract
      .forEach((att, idx) => {
        if (att.file_url) {
          const appendixNumber = contract.attachments
            .slice(0, idx)
            .filter(a => a.type === "appendix").length;
          allAttachments.push({
            label: `${t("contract_appendix")} ${appendixNumber + 1}`,
            fileUrl: att.file_url,
            fileName: att.file_name || extractFileNameFromUrl(att.file_url),
          });
        }
      });
  }

  const handleDownloadContract = async () => {
    setDownloadingPdf(true);
    try {
      const [settings, projectData, freshContracts] = await Promise.all([
        companyApi.getCurrentSettings(),
        projectApi.getWithIncludes(projectId, ['siteplan']),
        projectApi.getContract(projectId),
      ]);
      const lhBase64 = await toBase64(settings?.letter_head_template_url || null);
      const sp = projectData?.siteplan_data || {};

      // Use freshly-fetched contract data to guarantee new fields
      // (general_clauses, definitions, contract_sections) are present.
      const freshContract = Array.isArray(freshContracts) ? freshContracts[0] : freshContracts;
      const pdfData = { ...contract, ...freshContract, letterhead_url: lhBase64, siteplan_data: sp };

      const blob = await pdf(<ContractPdfDocument data={pdfData} />).toBlob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Contract_${contract.tender_no || projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      logger.error('Download contract PDF failed', err);
      showError(t('download_contract_pdf_failed'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!hasContract) {
    return (
      <div className="prj-tab-panel">
        <div className="prj-tab-header">
          <div className="prj-tab-actions ds-flex ds-gap-3">
            <Button
              as={Link}
              to={`/projects/${projectId}/wizard?step=contract&mode=view&sectionOnly=true`}
              variant="secondary"
              size="md"
            >
              {t("view")}
            </Button>
            <Button
              as={Link}
              to={`/projects/${projectId}/wizard?step=contract&mode=edit&sectionOnly=true`}
              variant="primary"
              size="md"
              disabled={!projectPermissions?.can_edit}
            >
              {t("edit")}
            </Button>
          </div>
        </div>
        <div className="prj-empty-state">
          {t("contract_not_added")}
        </div>
      </div>
    );
  }

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions ds-flex ds-gap-3">
          <Button
            as={Link}
            to={`/projects/${projectId}/wizard?step=contract&mode=view&sectionOnly=true`}
            variant="secondary"
            size="md"
          >
            {t("view")}
          </Button>
          <Button
            as={Link}
          to={`/projects/${projectId}/wizard?step=contract&mode=edit&sectionOnly=true`}
            variant="primary"
            size="md"
            disabled={!projectPermissions?.can_edit}
          >
            {t("edit")}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleDownloadContract}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? t("generating_pdf") : t("download_pdf")}
          </Button>
        </div>
      </div>

      {/* Contract Information Cards - Compact Professional Layout */}
      <div className="contract-tab__info-grid ds-gap-4 ds-mt-6">
        {contractTypeLabel && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("contract_type_label")}</div>
            <div className="prj-info-value">
              {contractTypeLabel}
            </div>
          </Card>
        )}

        {contract?.total_project_value && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("total_project_value")}</div>
            <div className="prj-info-value prj-info-value--money">
              {renderAmount(contract.total_project_value)}
            </div>
          </Card>
        )}

        {(startOrder?.project_end_date || contract?.project_end_date) && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("project_end_date_calculated")}</div>
            <div className="prj-info-value">
              {startOrder?.project_end_date
                ? formatDate(startOrder.project_end_date)
                : formatDate(contract.project_end_date)}
            </div>
          </Card>
        )}
      </div>

      {/* Attachments Section - Always visible even if empty */}
      <div className="ds-mt-6">
        <h3 className="prj-section-heading">
          {t("attachments")}
        </h3>
        <Card className="ds-p-5">
          {allAttachments.length > 0 ? (
            <div className="contract-tab__attachments-grid ds-gap-4">
              {allAttachments.map((attachment) => (
                <div key={attachment.label}>
                  <div className="prj-info-label ds-mb-3">
                    {attachment.label}
                  </div>
                  <FileAttachmentView
                    fileUrl={attachment.fileUrl || null}
                    fileName={attachment.fileName || ""}
                    projectId={projectId}
                    endpoint={`projects/${projectId}/contract/`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="contract-tab__empty-attachments ds-text-center ds-p-4">
              {t("no_attachments")}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
});

export default ContractTab;
