// Component for managing a static contract attachment (e.g., bill of quantities, approved materials list, etc.)
import { useTranslation } from "react-i18next";
import Field from "../../../../components/forms/Field";
import ViewRow from "../../../../components/forms/ViewRow";
import FileUpload from "../../../../components/file-upload/FileUpload";
import FileAttachmentView from "../../../../components/file-upload/FileAttachmentView";
import { extractFileNameFromUrl } from "../../../../utils/helpers/file";

export default function StaticContractAttachmentFile({
  label,
  value, // File or null
  fileUrl, // Existing file URL
  fileName, // Existing file name
  onChange, // (file: File | null) => void
  onRemoveExisting, // () => void
  accept = ".pdf,.xlsx,.xls",
  maxSizeMB = 10,
  isView = false,
  projectId,
  endpoint,
}) {
  const { t } = useTranslation();
  if (isView) {
    return (
      <Field label={label}>
        {fileUrl ? (
          <FileAttachmentView
            fileUrl={fileUrl}
            fileName={fileName || extractFileNameFromUrl(fileUrl)}
            projectId={projectId}
            endpoint={endpoint}
          />
        ) : (
          <div className="card text-center prj-muted p-20">{t("no_file")}</div>
        )}
      </Field>
    );
  }

  return (
    <Field label={label}>
      <FileUpload
        value={value}
        onChange={onChange}
        accept={accept}
        maxSizeMB={maxSizeMB}
        showPreview={true}
        existingFileUrl={fileUrl}
        existingFileName={fileName || (fileUrl ? extractFileNameFromUrl(fileUrl) : "")}
        onRemoveExisting={onRemoveExisting}
      />
    </Field>
  );
}

