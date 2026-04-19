import { useTranslation } from "react-i18next";
import {
  FormField,
  FormGrid,
  FormInput,
  FormViewField,
} from "../../../../components/ui/form";
import DateInput from "../../../../components/forms/DateInput";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import FileUploadWithProgressBar from "../../../../components/file-upload/FileUploadWithProgressBar";
import CollapsibleSection from "./CollapsibleSection";
import VerifiableField from "./VerifiableField";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";
import { formatDate } from "../../../../utils/formatters";

export default function ApplicationDetailsSection({
  form,
  setF,
  viewMode,
  sitePlanFileUrl,
  setSitePlanFileUrl,
  uploadProgress,
  isUploading,
  isExtracting,
  onSitePlanFileChange,
  projectId,
  language,
  hideFileUpload = false,
  verifiedFields = {},
  onToggleVerify,
}) {
  const { t, i18n } = useTranslation();

  const handleApplicationDateChange = (value) => {
    setF("application_date", value);
    if (value) {
      const date = new Date(value);
      const year = date.getFullYear();
      const currentNumber = form.application_number || "";

      if (!currentNumber.trim() || !currentNumber.includes('/')) {
        setF("application_number", `${year}/`);
      } else {
        const parts = currentNumber.split('/');
        const numberAfterSlash = parts.length > 1 ? parts[1] : "";
        setF("application_number", `${year}/${numberAfterSlash}`);
      }
    }
  };

  const handleApplicationNumberChange = (e) => {
    let value = e.target.value;
    const year = form.application_date ? new Date(form.application_date).getFullYear().toString() : "";
    if (year && value.startsWith(year) && !value.includes('/')) {
      value = `${year}/`;
    }
    setF("application_number", value);
  };

  const handleFileChange = (file) => {
    if (onSitePlanFileChange) {
      onSitePlanFileChange(file);
    } else {
      setF("site_plan_file", file);
    }
  };

  return (
    <CollapsibleSection title={t("application_details")} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}>
      {viewMode ? (
        <FormGrid cols={hideFileUpload ? 2 : 3}>
          <FormViewField label={t("application_number")} value={form.application_number} />
          <FormViewField
            label={t("application_date")}
            value={formatDate(form.application_date, language || i18n.language)}
          />
          {!hideFileUpload && (
            <FormField label={t("attach_land_site_plan")}>
              <FileAttachmentView
                fileUrl={sitePlanFileUrl}
                fileName={sitePlanFileUrl ? extractFileNameFromUrl(sitePlanFileUrl) : ""}
                projectId={projectId}
                endpoint={`projects/${projectId}/siteplan/`}
              />
            </FormField>
          )}
        </FormGrid>
      ) : (
        <>
          <FormGrid cols={hideFileUpload ? 2 : 3}>
            <VerifiableField fieldName="application_date" verified={verifiedFields.application_date} onToggle={onToggleVerify} viewMode={viewMode}>
              <FormField label={t("application_date")}>
                <DateInput
                  value={form.application_date}
                  onChange={handleApplicationDateChange}
                  placeholder="dd / mm / yyyy"
                />
              </FormField>
            </VerifiableField>
            <VerifiableField fieldName="application_number" verified={verifiedFields.application_number} onToggle={onToggleVerify} viewMode={viewMode}>
              <FormField
                label={t("application_number")}
                hint={!form.application_date ? t("application_date_required_hint") : undefined}
              >
                <FormInput
                  value={form.application_number}
                  onChange={handleApplicationNumberChange}
                  placeholder={
                    form.application_date
                      ? `${new Date(form.application_date).getFullYear()}/`
                      : t("application_number_placeholder_short")
                  }
                  disabled={!form.application_date}
                  dir="rtl"
                  style={{
                    cursor: !form.application_date ? "not-allowed" : "text",
                    opacity: !form.application_date ? 0.6 : 1 }}
                />
              </FormField>
            </VerifiableField>
            {!hideFileUpload && (
              <FormField label={t("attach_land_site_plan")}>
                <FileUploadWithProgressBar
                  value={form.site_plan_file}
                  onChange={handleFileChange}
                  uploadProgress={uploadProgress}
                  isUploading={isUploading}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  maxSizeMB={10}
                  showPreview={true}
                  existingFileUrl={sitePlanFileUrl}
                  existingFileName={sitePlanFileUrl ? extractFileNameFromUrl(sitePlanFileUrl) : ""}
                  onRemoveExisting={() => {
                    setSitePlanFileUrl("");
                    setF("site_plan_file", null);
                  }}
                  fileType="site_plan_file"
                  compressionOptions={{
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920 }}
                />
              </FormField>
            )}
          </FormGrid>
          {!hideFileUpload && isExtracting && (
            <div className="wizard-extract-indicator">
              <svg className="wizard-extract-indicator__spinner" viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
              </svg>
              <span>{t("extracting_data_from_pdf")}</span>
            </div>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}
