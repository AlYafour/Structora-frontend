// Component for managing a single contract extension
import { useTranslation } from "react-i18next";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import FileUpload from "../../../../components/file-upload/FileUpload";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import DateInput from "../../../../components/forms/DateInput";
import Button from "../../../../components/common/Button";
import NumberField from "../../../../components/forms/NumberField";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";
import { formatDate } from "../../../../utils/formatters";
import "./wizard.css";

export default function ContractExtension({
  extension,
  index, // Extension number (1, 2, 3, ...)
  extensionIndex, // Actual index in the array
  isView,
  onUpdate,
  onRemove,
  canRemove,
  projectId,
}) {
  const { t, i18n } = useTranslation();

  // Use actual extensionIndex, fall back to index if not available
  const actualIndex = extensionIndex !== undefined ? extensionIndex : index;

  if (isView) {
    return (
      <div className="wizard-extension-card">
        <div className="wizard-extension-card__body">
          {/* Extension reason */}
          <ViewRow label={t("extension_reason")} value={extension.reason || ""} />

          {/* Date and approval number */}
          <div className="form-grid cols-2 wizard-gap-4">
            <ViewRow label={t("extension_date")} value={extension.extension_date ? formatDate(extension.extension_date, i18n.language) : ""} />
            <ViewRow label={t("approval_number")} value={extension.approval_number || ""} />
          </div>

          {/* Extension period */}
          {(extension.extension_period_from || extension.extension_period_to) && (
            <div className="form-grid cols-2 wizard-gap-4">
              <ViewRow label={t("extension_period_from")} value={extension.extension_period_from ? formatDate(extension.extension_period_from, i18n.language) : ""} />
              <ViewRow label={t("extension_period_to")} value={extension.extension_period_to ? formatDate(extension.extension_period_to, i18n.language) : ""} />
            </div>
          )}

          {/* Extension duration */}
          <div className="form-grid cols-2 wizard-gap-4">
            <ViewRow label={t("extension_duration_days")} value={extension.days || 0} />
            <ViewRow label={t("extension_duration_months")} value={extension.months || 0} />
          </div>

          {/* Note */}
          {extension.note && (
            <ViewRow label={t("extension_note")} value={extension.note} />
          )}

          {/* Extension file */}
          {extension.file_url && (
            <Field label={t("extension_file")}>
              <FileAttachmentView
                fileUrl={extension.file_url}
                fileName={extension.file_name || extractFileNameFromUrl(extension.file_url)}
                projectId={projectId}
                endpoint={`projects/${projectId}/start-order/`}
              />
            </Field>
          )}

          {/* Letter attachment */}
          {extension.letter_attachment_url && (
            <Field label={t("letter_attachment")}>
              <FileAttachmentView
                fileUrl={extension.letter_attachment_url}
                fileName={extension.letter_attachment_name || extractFileNameFromUrl(extension.letter_attachment_url)}
                projectId={projectId}
                endpoint={`projects/${projectId}/start-order/`}
              />
            </Field>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-extension-card">
      <div className="wizard-extension-card__header">
        <h5 className="wizard-extension-card__title">
          {t("extensions")} {index + 1}
        </h5>
        {canRemove && (
          <Button
            variant="danger"
            type="button"
            size="sm"
            onClick={() => onRemove(actualIndex)}
          >
            {t("delete")}
          </Button>
        )}
      </div>

      <div className="wizard-extension-card__body">
        {/* Extension reason */}
        <Field label={t("extension_reason")}>
          <input
            className="input"
            type="text"
            value={extension.reason || ""}
            onChange={(e) => onUpdate(actualIndex, "reason", e.target.value)}
            placeholder={t("extension_reason_placeholder")}
            dir={i18n.language === "ar" ? "rtl" : "ltr"}
          />
        </Field>

        {/* Date and approval number */}
        <div className="form-grid cols-2 wizard-gap-4">
          <Field label={t("extension_date")}>
            <DateInput
              className="input"
              value={extension.extension_date || ""}
              onChange={(value) => onUpdate(actualIndex, "extension_date", value)}
            />
          </Field>
          <Field label={t("approval_number")}>
            <input
              className="input"
              type="text"
              value={extension.approval_number || ""}
              onChange={(e) => onUpdate(actualIndex, "approval_number", e.target.value)}
              placeholder={t("approval_number_placeholder")}
              dir={i18n.language === "ar" ? "rtl" : "ltr"}
            />
          </Field>
        </div>

        {/* Extension period (optional) */}
        <div className="form-grid cols-2 wizard-gap-4">
          <Field label={t("extension_period_from")}>
            <DateInput
              className="input"
              value={extension.extension_period_from || ""}
              onChange={(value) => {
                onUpdate(actualIndex, "extension_period_from", value);
                const to = extension.extension_period_to;
                if (value && to) {
                  const diff = Math.round((new Date(to) - new Date(value)) / 86400000);
                  if (diff > 0) onUpdate(actualIndex, "days", diff);
                }
              }}
            />
          </Field>
          <Field label={t("extension_period_to")}>
            <DateInput
              className="input"
              value={extension.extension_period_to || ""}
              onChange={(value) => {
                onUpdate(actualIndex, "extension_period_to", value);
                const from = extension.extension_period_from;
                if (from && value) {
                  const diff = Math.round((new Date(value) - new Date(from)) / 86400000);
                  if (diff > 0) onUpdate(actualIndex, "days", diff);
                }
              }}
            />
          </Field>
        </div>

        {/* Extension duration */}
        <div className="form-grid cols-2 wizard-gap-4">
          <Field label={t("extension_duration_days")}>
            <NumberField
              value={extension.days || ""}
              onChange={(v) => onUpdate(actualIndex, "days", v ? Number(v) : 0)}
              min={0}
              placeholder="0"
              dir={i18n.language === "ar" ? "rtl" : "ltr"}
            />
          </Field>
          <Field label={t("extension_duration_months")}>
            <NumberField
              value={extension.months || ""}
              onChange={(v) => onUpdate(actualIndex, "months", v ? Number(v) : 0)}
              min={0}
              placeholder="0"
              dir={i18n.language === "ar" ? "rtl" : "ltr"}
            />
          </Field>
        </div>

        {/* Note (optional) */}
        <Field label={t("extension_note")}>
          <textarea
            className="input"
            rows={3}
            value={extension.note || ""}
            onChange={(e) => onUpdate(actualIndex, "note", e.target.value)}
            placeholder={t("extension_note_placeholder")}
            dir={i18n.language === "ar" ? "rtl" : "ltr"}
            style={{ resize: "vertical" }}
          />
        </Field>

        {/* Extension approval file */}
        <Field label={t("upload_extension_file")}>
          <FileUpload
            value={extension.file}
            onChange={(file) => onUpdate(actualIndex, "file", file)}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            maxSizeMB={30}
            showPreview={true}
            existingFileUrl={extension.file_url}
            existingFileName={extension.file_name || (extension.file_url ? extractFileNameFromUrl(extension.file_url) : "")}
            onRemoveExisting={() => {
              onUpdate(actualIndex, "file", null);
              onUpdate(actualIndex, "file_url", null);
              onUpdate(actualIndex, "file_name", null);
            }}
            fileType="extension_file"
            fileIndex={actualIndex}
          />
        </Field>

        {/* Letter attachment (optional) */}
        <Field label={t("letter_attachment")}>
          <FileUpload
            value={extension.letter_attachment}
            onChange={(file) => onUpdate(actualIndex, "letter_attachment", file)}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSizeMB={30}
            showPreview={true}
            existingFileUrl={extension.letter_attachment_url}
            existingFileName={extension.letter_attachment_name || (extension.letter_attachment_url ? extractFileNameFromUrl(extension.letter_attachment_url) : "")}
            onRemoveExisting={() => {
              onUpdate(actualIndex, "letter_attachment", null);
              onUpdate(actualIndex, "letter_attachment_url", null);
              onUpdate(actualIndex, "letter_attachment_name", null);
            }}
            fileType="letter_attachment"
            fileIndex={actualIndex}
          />
        </Field>
      </div>
    </div>
  );
}
