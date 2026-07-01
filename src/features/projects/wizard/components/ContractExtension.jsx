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

          {/* Letter attachments */}
          {(extension.letter_attachments || []).length > 0 && (
            <Field label={t("letter_attachment")}>
              {(extension.letter_attachments || []).map((att, i) => att.url ? (
                <FileAttachmentView
                  key={i}
                  fileUrl={att.url}
                  fileName={att.name || extractFileNameFromUrl(att.url)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/start-order/`}
                />
              ) : null)}
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
            onChange={(file) => {
              onUpdate(actualIndex, "file", file);
              if (file) onUpdate(actualIndex, "extension_file_delete", false);
            }}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            maxSizeMB={30}
            showPreview={true}
            existingFileUrl={extension.file_url}
            existingFileName={extension.file_name || (extension.file_url ? extractFileNameFromUrl(extension.file_url) : "")}
            onRemoveExisting={() => {
              onUpdate(actualIndex, "file", null);
              onUpdate(actualIndex, "file_url", null);
              onUpdate(actualIndex, "file_name", null);
              onUpdate(actualIndex, "extension_file_delete", true);
            }}
            fileType="extension_file"
            fileIndex={actualIndex}
          />
        </Field>

        {/* Letter attachments — multiple images */}
        <Field label={t("letter_attachment")}>
          {(extension.letter_attachments || []).map((att, attIdx) => (
            <div key={attIdx} style={{ marginBottom: "8px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <FileUpload
                  value={att.newFile || null}
                  onChange={(file) => {
                    const updated = [...(extension.letter_attachments || [])];
                    // Clear old URL when new file is selected — prevents keeping both old + new
                    updated[attIdx] = { url: null, name: null, newFile: file };
                    onUpdate(actualIndex, "letter_attachments", updated);
                  }}
                  accept=".jpg,.jpeg,.png"
                  maxSizeMB={30}
                  showPreview={true}
                  existingFileUrl={att.url}
                  existingFileName={att.name || (att.url ? extractFileNameFromUrl(att.url) : "")}
                  onRemoveExisting={() => {
                    const updated = [...(extension.letter_attachments || [])];
                    updated[attIdx] = { ...updated[attIdx], url: null, name: null, newFile: null };
                    onUpdate(actualIndex, "letter_attachments", updated);
                  }}
                  fileType="letter_attachment"
                  fileIndex={attIdx}
                />
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  const updated = (extension.letter_attachments || []).filter((_, i) => i !== attIdx);
                  onUpdate(actualIndex, "letter_attachments", updated);
                }}
              >
                {t("delete")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const updated = [...(extension.letter_attachments || []), { url: null, name: null, newFile: null }];
              onUpdate(actualIndex, "letter_attachments", updated);
            }}
          >
            + {t("add_attachment")}
          </Button>
        </Field>
      </div>
    </div>
  );
}
