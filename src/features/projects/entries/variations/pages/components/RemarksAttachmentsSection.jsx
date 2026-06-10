import { memo } from 'react';
import { FaPaperclip, FaTrash, FaPlus } from 'react-icons/fa';
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
  setVariationFileCleared,
  // new multi-attachment props
  variationAttachments,
  setVariationAttachments,
  project,
  variationId,
  variation,
  t
}) => {
  if (!isEditMode && !formData.remarks && !existingVariationAttachment && !variationAttachments?.length) {
    return null;
  }

  const handleAddAttachment = () => {
    setVariationAttachments(prev => [...prev, { id: null, url: null, name: '', newFile: null }]);
  };

  const handleRemoveAttachment = (index) => {
    setVariationAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAttachmentFileChange = (index, file) => {
    setVariationAttachments(prev => prev.map((item, i) =>
      i === index ? { ...item, newFile: file, name: file?.name || item.name } : item
    ));
  };

  return (
    <div className="nvc-section nvc-section--remarks">
      <div className="nvc-section-header">
        <h3>{t('remarks')}</h3>
      </div>
      <div className="nvc-remarks-grid">
        <div className="nvc-field nvc-field--full">
          {isEditMode ? (
            <textarea
              value={formData.remarks ?? ''}
              onChange={(e) => onFormDataChange({ ...formData, remarks: e.target.value })}
              className="nvc-input nvc-textarea"
              rows={3}
              placeholder={`${t('remarks')} — ${t('one_point_per_line', 'one point per line')}`}
            />
          ) : formData.remarks ? (
            <ul className="nvc-remarks-bullets">
              {formData.remarks.split('\n').filter(l => l.trim()).map((line, i) => (
                <li key={i}>{line.trim()}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Single variation document (existing) */}
        {isEditMode ? (
          <div className="nvc-field no-print">
            <label>{t('variation_document')}</label>
            <FileUpload
              value={variationAttachment}
              onChange={(file) => {
                setVariationAttachment(file);
                if (file) setVariationFileCleared(false);
              }}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={30}
              showPreview={true}
              existingFileUrl={existingVariationAttachment}
              existingFileName={existingVariationAttachment ? existingVariationAttachment.split('/').pop() : ''}
              onRemoveExisting={() => {
                setExistingVariationAttachment(null);
                setVariationAttachment(null);
                setVariationFileCleared(true);
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

        {/* Multi-file PDF attachments */}
        <div className="nvc-field nvc-field--full no-print">
          <label className="nvc-attachments-label">
            <FaPaperclip style={{ marginRight: 6 }} />
            {t('pdf_attachments')}
            <span className="nvc-attachments-hint"> — {t('pdf_attachments_hint')}</span>
          </label>

          {/* Existing saved attachments (view mode) */}
          {!isEditMode && variationAttachments?.length > 0 && (
            <div className="nvc-attachment-list">
              {variationAttachments.map((att, i) => (
                <div key={att.id || i} className="nvc-attachment-row">
                  <FileAttachmentView
                    fileUrl={att.url || att.file}
                    fileName={att.file_name || att.name || (att.url || att.file || '').split('/').pop()}
                    projectId={project?.id}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Edit mode: new + existing */}
          {isEditMode && (
            <div className="nvc-attachment-list">
              {variationAttachments.map((att, i) => (
                <div key={i} className="nvc-attachment-row">
                  {att.url || att.file ? (
                    /* Already saved on server */
                    <div className="nvc-attachment-saved">
                      <FileAttachmentView
                        fileUrl={att.url || att.file}
                        fileName={att.file_name || att.name || (att.url || att.file || '').split('/').pop()}
                        projectId={project?.id}
                      />
                      <button
                        type="button"
                        className="nvc-attachment-remove"
                        onClick={() => handleRemoveAttachment(i)}
                        title={t('remove')}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ) : (
                    /* New slot — not yet uploaded */
                    <div className="nvc-attachment-new">
                      <FileUpload
                        value={att.newFile}
                        onChange={(file) => handleAttachmentFileChange(i, file)}
                        accept=".pdf,.jpg,.jpeg,.png"
                        maxSizeMB={50}
                        showPreview={false}
                      />
                      <button
                        type="button"
                        className="nvc-attachment-remove"
                        onClick={() => handleRemoveAttachment(i)}
                        title={t('remove')}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="nvc-attachment-add-btn"
                onClick={handleAddAttachment}
              >
                <FaPlus style={{ marginRight: 6 }} />
                {t('add_attachment')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

RemarksAttachmentsSection.displayName = 'RemarksAttachmentsSection';

export default RemarksAttachmentsSection;
