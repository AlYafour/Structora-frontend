import { useTranslation } from "react-i18next";
import CollapsibleSection from "./CollapsibleSection";
import FileUploadWithProgressBar from "../../../../components/file-upload/FileUploadWithProgressBar";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import FileUpload from "../../../../components/file-upload/FileUpload";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";

/**
 * AttachmentsSection — unified attachments area at the top of the wizard.
 * Includes site plan file + owner ID card uploads in a clean card layout.
 * OCR auto-extraction happens on upload, filling fields below.
 */
export default function AttachmentsSection({
  // Site plan
  form,
  sitePlanFileUrl,
  setSitePlanFileUrl,
  setF,
  onSitePlanFileChange,
  uploadProgress,
  isUploading,
  isExtracting,
  onSitePlanView,
  // Owners
  owners,
  updateOwner,
  ownerFileUrls,
  ownerFileNames,
  onOwnerIdFileChange,
  onOwnerIdView,
  // Common
  viewMode,
  projectId,
}) {
  const { t } = useTranslation();

  if (viewMode) {
    return (
      <CollapsibleSection
        title={t("attachments_section")}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.49" />
          </svg>
        }
      >
        <div className="wizard-attachments">
          {/* Site Plan */}
          <div className="wizard-attachments__card">
            <div className="wizard-attachments__card-header">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>{t("attach_land_site_plan")}</span>
            </div>
            <FileAttachmentView
              fileUrl={sitePlanFileUrl}
              fileName={sitePlanFileUrl ? extractFileNameFromUrl(sitePlanFileUrl) : ""}
              projectId={projectId}
              endpoint={`projects/${projectId}/siteplan/`}
            />
          </div>

          {/* Owner ID Cards */}
          {owners.map((owner, idx) => {
            const fileUrl =
              ownerFileUrls[idx] ||
              (typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== ""
                ? owner.id_attachment
                : "");
            const fileName =
              ownerFileNames[idx] ||
              (owner.id_attachment instanceof File ? owner.id_attachment.name : "") ||
              (fileUrl ? extractFileNameFromUrl(fileUrl) : "");

            if (!fileUrl && !fileName) return null;

            const ownerLabel = `${t("owner")} ${idx + 1}`;

            return (
              <div key={owner._uid || owner.id || idx} className="wizard-attachments__card">
                <div className="wizard-attachments__card-header">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <circle cx="8" cy="12" r="2" />
                    <path d="M16 10h2" />
                    <path d="M16 14h2" />
                  </svg>
                  <span>{t("id_attachment")} — {ownerLabel}</span>
                </div>
                <FileAttachmentView
                  fileUrl={fileUrl}
                  fileName={fileName}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/siteplan/`}
                />
              </div>
            );
          })}
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={t("attachments_section")}
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.49" />
        </svg>
      }
      defaultOpen={true}
    >
      <div className="wizard-attachments">
        <p className="wizard-attachments__hint">{t("attachments_hint")}</p>

        <div className="wizard-attachments__grid">
          {/* Site Plan File */}
          <div className="wizard-attachments__upload-card">
            <div className="wizard-attachments__card-header">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>{t("attach_land_site_plan")}</span>
            </div>
            <FileUploadWithProgressBar
              value={form.site_plan_file}
              onChange={onSitePlanFileChange}
              uploadProgress={uploadProgress}
              isUploading={isUploading}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              maxSizeMB={30}
              showPreview={true}
              existingFileUrl={sitePlanFileUrl}
              existingFileName={sitePlanFileUrl ? extractFileNameFromUrl(sitePlanFileUrl) : ""}
              onRemoveExisting={() => {
                setSitePlanFileUrl("");
                setF("site_plan_file", null);
              }}
              fileType="site_plan_file"
              compressionOptions={{ maxSizeMB: 1, maxWidthOrHeight: 1920 }}
              onPreview={onSitePlanView}
            />
            {isExtracting && (
              <div className="wizard-extract-indicator">
                <svg className="wizard-extract-indicator__spinner" viewBox="0 0 24 24" width="18" height="18">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                <span>{t("extracting_data_from_pdf")}</span>
              </div>
            )}
          </div>

          {/* Owner ID Card Uploads */}
          {owners.map((owner, idx) => {
            const fileUrl =
              ownerFileUrls[idx] ||
              (typeof owner.id_attachment === "string" && owner.id_attachment.trim() !== ""
                ? owner.id_attachment
                : "");
            const fileName =
              ownerFileNames[idx] ||
              (owner.id_attachment instanceof File ? owner.id_attachment.name : "") ||
              (fileUrl ? extractFileNameFromUrl(fileUrl) : "");

            const ownerLabel = `${t("owner")} ${idx + 1}`;

            return (
              <div key={owner._uid || owner.id || idx} className="wizard-attachments__upload-card">
                <div className="wizard-attachments__card-header">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <circle cx="8" cy="12" r="2" />
                    <path d="M16 10h2" />
                    <path d="M16 14h2" />
                  </svg>
                  <span>{t("id_attachment")} — {ownerLabel}</span>
                </div>
                <FileUpload
                  value={owner.id_attachment instanceof File ? owner.id_attachment : null}
                  onChange={(file) => onOwnerIdFileChange(idx, file)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  maxSizeMB={30}
                  showPreview={true}
                  existingFileUrl={fileUrl}
                  existingFileName={fileName}
                  onRemoveExisting={() => updateOwner(idx, "id_attachment", null)}
                  compressionOptions={{ maxSizeMB: 1, maxWidthOrHeight: 1920 }}
                  onPreview={onOwnerIdView ? () => onOwnerIdView(idx) : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </CollapsibleSection>
  );
}
