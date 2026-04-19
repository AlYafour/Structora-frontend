// Component for managing a single contract attachment
import { useTranslation } from "react-i18next";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import RtlSelect from "../../../../components/forms/RtlSelect";
import FileUpload from "../../../../components/file-upload/FileUpload";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import DateInput from "../../../../components/forms/DateInput";
import Button from "../../../../components/common/Button";
import NumberField from "../../../../components/forms/NumberField";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";
import { formatDate, formatMoney } from "../../../../utils/formatters";
import { logger } from "../../../../utils/logger";
import "./ContractAttachment.css";

const ATTACHMENT_TYPE_VALUES = ["appendix", "explanation", "bank_contract", "price_offer"];

export default function ContractAttachment({
  attachment,
  index, // For display only (appendixNumber)
  attachmentIndex, // Actual index in the array
  isView,
  onUpdate,
  onRemove,
  canRemove,
  projectId,
  isPrivateFunding = false, // Funding type: if true, hide "bank contract"
}) {
  const { t, i18n } = useTranslation();

  const ATTACHMENT_TYPES = [
    { value: "appendix", label: t("contract_attach_appendix") },
    { value: "explanation", label: t("contract_attach_explanation") },
    { value: "bank_contract", label: t("contract_attach_bank_contract") },
    { value: "price_offer", label: t("contract_attach_price_offer") },
  ];

  // Filter attachment types based on funding type
  const availableAttachmentTypes = ATTACHMENT_TYPES.filter((type) => {
    // Remove "bank contract" if funding is private (owner-only)
    if (isPrivateFunding && type.value === "bank_contract") {
      return false;
    }
    return true;
  });

  // Use actual attachmentIndex, fall back to index for backward compatibility
  const actualIndex = attachmentIndex !== undefined ? attachmentIndex : index;

  // Calculate label based on type and appendix count
  const getAttachmentTypeLabel = (type, appendixNum) => {
    if (type === "appendix") {
      return `${t("contract_attach_appendix")} ${appendixNum + 1}`;
    }
    const typeOption = availableAttachmentTypes.find((opt) => opt.value === type);
    return typeOption ? typeOption.label : type;
  };

  const attachmentTypeLabel = getAttachmentTypeLabel(attachment.type, index);
  const hasPrice = attachment.price !== undefined && attachment.price !== null && attachment.price !== "";
  const priceDisplay = hasPrice
    ? (Number.isFinite(Number(attachment.price)) ? formatMoney(Number(attachment.price)) : attachment.price)
    : "";

  // Log data for verification in view mode (dev only)
  if (isView && import.meta.env.DEV) {
    logger.debug("ContractAttachment (View Mode)", {
      type: attachment.type,
      file_url: attachment.file_url,
      file_name: attachment.file_name,
      has_file_url: !!attachment.file_url,
      full_attachment: attachment,
    });
  }

  if (isView) {
    return (
      <div className="ds-detail-card">
        <div className="ds-flex ds-flex-col ds-gap-4 ds-flex-1">
          {/* Attachment type - full row */}
          <ViewRow label={t("contract_attach_type")} value={attachmentTypeLabel} />

          {/* Date and price in the same row */}
          <div className="form-grid cols-2 ds-gap-4">
            <ViewRow label={t("contract_attach_date")} value={attachment.date ? formatDate(attachment.date, i18n.language) : ""} />
            {hasPrice && (
              <ViewRow
                label={t("contract_attach_price")}
                value={priceDisplay}
              />
            )}
          </div>

          {/* File upload below date and price */}
          <Field label={t("contract_attach_file")}>
            {(() => {
              // Check if file_url exists with logging for verification
              const hasFileUrl = !!(attachment.file_url);
              if (import.meta.env.DEV) {
                logger.debug("ContractAttachment render (View Mode)", {
                  hasFileUrl,
                  file_url: attachment.file_url,
                  file_name: attachment.file_name,
                  attachment_keys: Object.keys(attachment),
                });
              }

              if (hasFileUrl) {
                return (
                  <FileAttachmentView
                    fileUrl={attachment.file_url}
                    fileName={attachment.file_name || extractFileNameFromUrl(attachment.file_url)}
                    projectId={projectId}
                    endpoint={`projects/${projectId}/contract/`}
                  />
                );
              } else {
                return (
                  <div className="card text-center prj-muted p-20 ds-text-sm ds-text-muted">
                    {t("contract_attach_no_file")}
                  </div>
                );
              }
            })()}
          </Field>

          {/* Notes - full row */}
          {attachment.notes && (
            <ViewRow label={t("contract_attach_notes")} value={attachment.notes} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ds-detail-card">
      <div className="contract-attachment__header">
        <h5 className="contract-attachment__title">
          {attachment.type ? attachmentTypeLabel : t("contract_attach_new")}
        </h5>
        {canRemove && (
          <Button
            variant="danger"
            type="button"
            size="sm"
            onClick={() => onRemove(actualIndex)}
          >
            {t("contract_attach_delete")}
          </Button>
        )}
      </div>

      <div className="ds-flex ds-flex-col ds-gap-4 ds-flex-1">
        {/* Attachment type - full row */}
        <Field label={t("contract_attach_type")}>
          <RtlSelect
            className="rtl-select"
            options={availableAttachmentTypes}
            value={attachment.type || ""}
            onChange={(v) => {
              onUpdate(actualIndex, "type", v);
            }}
            placeholder={t("contract_attach_type_placeholder")}
          />
        </Field>

        {/* Date and price in the same row */}
        <div className="form-grid cols-2 ds-gap-4">
          <Field label={t("contract_attach_date")}>
            <DateInput
              className="input"
              value={attachment.date || ""}
              onChange={(value) => onUpdate(actualIndex, "date", value)}
            />
          </Field>
          <Field label={t("contract_attach_price")}>
            <NumberField
              value={attachment.price ?? ""}
              onChange={(v) => onUpdate(actualIndex, "price", v)}
              min={0}
            />
          </Field>
        </div>

        {/* File upload - full row below date and price */}
        <Field label={t("contract_attach_upload_file")}>
          <FileUpload
            value={attachment.file}
            onChange={(file) => onUpdate(actualIndex, "file", file)}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            maxSizeMB={10}
            showPreview={true}
            existingFileUrl={attachment.file_url}
            existingFileName={attachment.file_name || (attachment.file_url ? extractFileNameFromUrl(attachment.file_url) : "")}
            onRemoveExisting={() => {
              // Remove existing file (file_url and file_name) on delete
              onUpdate(actualIndex, "file_url", null);
              onUpdate(actualIndex, "file_name", null);
              onUpdate(actualIndex, "file", null);
            }}
            compressionOptions={{
              maxSizeMB: 1,
              maxWidthOrHeight: 1920 }}
          />
        </Field>

        {/* Notes - full row */}
        <Field label={t("contract_attach_notes_optional")}>
          <textarea
            className="input contract-attachment__notes-input"
            rows={3}
            value={attachment.notes || ""}
            onChange={(e) => onUpdate(actualIndex, "notes", e.target.value)}
            placeholder={t("contract_attach_notes_placeholder")}
          />
        </Field>
      </div>
    </div>
  );
}
