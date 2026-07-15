import { memo, useMemo } from 'react';
import { FaPaperclip, FaTrash, FaPlus } from 'react-icons/fa';
import FileUpload from '../../../../../../components/file-upload/FileUpload';
import FileAttachmentView from '../../../../../../components/file-upload/FileAttachmentView';
import RichTextEditor from '../../../../../../components/common/RichTextEditor';
import { useAutoTranslate } from '../../../../../../hooks/useAutoTranslate';
import { htmlToPlainText, normalizeRichTextForRender } from '../../../../../../utils/richText';

function RichRemarksView({ value, className = '', dir = 'ltr' }) {
  const html = normalizeRichTextForRender(value);
  if (!html) return null;

  return (
    <div
      className={`nvc-rich-remarks-view ${className}`.trim()}
      dir={dir}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const RemarksAttachmentsSection = memo(({
  formData,
  isEditMode,
  onFormDataChange,
  existingVariationAttachment,
  // new multi-attachment props
  variationAttachments,
  setVariationAttachments,
  project,
  t
}) => {
  const remarksPlainText = useMemo(
    () => htmlToPlainText(formData.remarks).trim(),
    [formData.remarks]
  );

  const { translating } = useAutoTranslate(
    remarksPlainText,
    (ar) => onFormDataChange(prev => ({ ...prev, remarks_ar: ar })),
    { enabled: isEditMode }
  );

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
      {(isEditMode || formData.remarks) && (
        <div className="nvc-section-header">
          <h3>{t('remarks')}</h3>
        </div>
      )}
      <div className="nvc-remarks-grid">
        <div className="nvc-field nvc-field--full">
          {isEditMode ? (
            <div className="nvc-remarks-split-card">
              {/* English pane — original input */}
              <div className="nvc-remarks-split-pane nvc-remarks-split-pane--en">
                <div className="nvc-remarks-split-pane__header">
                  <span className="nvc-remarks-split-pane__lang">EN</span>
                  <span className="nvc-remarks-split-pane__label">{t('english', 'English')}</span>
                </div>
                <RichTextEditor
                  className="nvc-remarks-rich-editor"
                  value={formData.remarks ?? ''}
                  onChange={(html) => onFormDataChange({ ...formData, remarks: html })}
                  placeholder={`${t('remarks')} — ${t('one_point_per_line', 'one point per line')}`}
                  dir="ltr"
                  t={t}
                />
              </div>

              <div className="nvc-remarks-split-divider" />

              {/* Arabic pane — auto-translated, read-only */}
              <div className="nvc-remarks-split-pane nvc-remarks-split-pane--ar">
                <div className="nvc-remarks-split-pane__header">
                  <span className="nvc-remarks-split-pane__lang">ع</span>
                  <span className="nvc-remarks-split-pane__label">
                    {translating ? (
                      <span className="nvc-remarks-split-pane__translating">
                        <span className="nvc-remarks-split-pane__dot" />
                        {t('translating', 'Translating')}...
                      </span>
                    ) : t('arabic', 'Arabic')}
                  </span>
                </div>
                <div className="nvc-remarks-split-ar-view" dir="rtl">
                  {formData.remarks_ar
                    ? formData.remarks_ar
                    : <span className="nvc-remarks-split-placeholder">{t('auto_translated_arabic', 'ترجمة تلقائية...')}</span>
                  }
                </div>
              </div>
            </div>
          ) : formData.remarks ? (
            formData.remarks_ar ? (
              <div className="nvc-remarks-split-view-grid">
                <div className="nvc-remarks-split-view-col">
                  <RichRemarksView value={formData.remarks} />
                </div>
                <div className="nvc-remarks-split-view-divider" />
                <div className="nvc-remarks-split-view-col nvc-remarks-split-view-col--ar" dir="rtl">
                  <ul className="nvc-remarks-bullets nvc-remarks-bullets--ar">
                    {formData.remarks_ar.split('\n').filter(l => l.trim()).map((line, i) => (
                      <li key={i}>{line.trim()}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <RichRemarksView value={formData.remarks} />
            )
          ) : null}
        </div>

        {/* Multi-file PDF attachments */}
        <div className="nvc-field nvc-field--full no-print">
          {(isEditMode || variationAttachments?.length > 0) && (
            <label className="nvc-attachments-label">
              <FaPaperclip style={{ marginRight: 6 }} />
              {t('pdf_attachments')}
              <span className="nvc-attachments-hint"> — {t('pdf_attachments_hint')}</span>
            </label>
          )}

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
