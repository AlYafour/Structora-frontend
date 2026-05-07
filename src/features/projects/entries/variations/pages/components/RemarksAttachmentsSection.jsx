/**
 * RemarksAttachmentsSection Component
 *
 * Displays remarks and file attachments section
 */

import { memo } from 'react';
import FileUpload from '../../../../../../components/file-upload/FileUpload';
import FileAttachmentView from '../../../../../../components/file-upload/FileAttachmentView';

const RemarksAttachmentsSection = memo(({
  formData,
  isEditMode,
  onFormDataChange,
  variationAttachment,
  setVariationAttachment,
  existingVariationAttachment,
  setExistingVariationAttachment,
  project,
  variationId,
  variation,
  t
}) => {
  // In view mode: show section only if there's remarks OR an attachment to display
  // In edit mode: always show so user can add/upload
  if (!isEditMode && !formData.remarks && !existingVariationAttachment) {
    return null;
  }

  return (
    <div className="nvc-section nvc-section--remarks">
      <div className="nvc-section-header">
        <h3>{t('remarks')}</h3>
      </div>
      <div className="nvc-remarks-grid">
        <div className="nvc-field nvc-field--full">
          <textarea
            value={formData.remarks ?? ''}
            onChange={(e) => onFormDataChange({ ...formData, remarks: e.target.value })}
            disabled={!isEditMode}
            className="nvc-input nvc-textarea"
            rows={2}
            placeholder={t('remarks')}
          />
        </div>
        {isEditMode ? (
          <div className="nvc-field no-print">
            <label>{t('variation_document')}</label>
            <FileUpload
              value={variationAttachment}
              onChange={setVariationAttachment}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={30}
              showPreview={true}
              existingFileUrl={existingVariationAttachment}
              existingFileName={existingVariationAttachment ? existingVariationAttachment.split('/').pop() : ''}
              onRemoveExisting={() => {
                setExistingVariationAttachment(null);
                setVariationAttachment(null);
              }}
              disabled={!isEditMode}
            />
          </div>
        ) : existingVariationAttachment ? (
          <div className="nvc-field">
            <label>{t('variation_document')}</label>
            <FileAttachmentView
              fileUrl={existingVariationAttachment}
              fileName={existingVariationAttachment ? existingVariationAttachment.split('/').pop() : ''}
              projectId={project?.id}
              endpoint={project?.id ? `projects/${project.id}/variations/${variationId || variation?.id}/` : undefined}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
});

RemarksAttachmentsSection.displayName = 'RemarksAttachmentsSection';

export default RemarksAttachmentsSection;
