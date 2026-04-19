import React from 'react';
import { FiFile, FiX } from 'react-icons/fi';
import Button from '../../../../../components/common/Button';
import FileAttachmentView from '../../../../../components/file-upload/FileAttachmentView';
import { extractFileNameFromUrl } from "../../../../../utils/helpers/file";

export default function ProgressAttachmentUpload({ formData, setFormData, setError, projectId, editingId, isRTL, t }) {
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const maxSizeMB = 10;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const validFiles = files.filter(file => {
        if (file.size > maxSizeBytes) {
          setError(t('progress_file_too_large', { name: file.name, maxSize: maxSizeMB }));
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setFormData(prev => ({
          ...prev,
          attachment_files: [...(prev.attachment_files || []), ...validFiles],
        }));
      }
    }
    e.target.value = '';
  };

  const removeExistingFile = (index) => {
    const newUrls = [...formData.attachment_file_urls];
    const newNames = [...formData.attachment_file_names];
    newUrls.splice(index, 1);
    newNames.splice(index, 1);
    setFormData({ ...formData, attachment_file_urls: newUrls, attachment_file_names: newNames });
  };

  const removeNewFile = (index) => {
    const newFiles = [...formData.attachment_files];
    newFiles.splice(index, 1);
    setFormData({ ...formData, attachment_files: newFiles });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="progress-field">
      <label className="progress-field__label">
        {t('progress_attachment_label')} ({t('progress_multiple_files_allowed')})
      </label>

      <div className="progress-files-list">
        {/* Existing saved files */}
        {formData.attachment_file_urls?.length > 0 && formData.attachment_file_urls.map((url, index) => (
          <div key={`existing-${url}`} className="progress-file-item">
            <FileAttachmentView
              fileUrl={url}
              fileName={formData.attachment_file_names[index] || extractFileNameFromUrl(url)}
              projectId={projectId}
              endpoint={`projects/${projectId}/progress/${editingId || ''}/`}
            />
            <Button variant="danger" size="sm" onClick={() => removeExistingFile(index)}>
              {t('remove')}
            </Button>
          </div>
        ))}

        {/* Newly selected files (not yet uploaded) */}
        {formData.attachment_files?.length > 0 && formData.attachment_files.map((file, index) => (
          <div key={`new-${file.name}-${file.size}`} className="file-attachment-view__container progress-file-item--new">
            <div className="file-attachment-view__icon">
              <FiFile />
            </div>
            <div className="file-attachment-view__info">
              <span className="file-attachment-view__filename" title={file.name}>
                {file.name}
              </span>
              <span className="progress-file-item__size">{formatFileSize(file.size)}</span>
            </div>
            <div className="file-attachment-view__actions">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="file-attachment-view__btn"
                onClick={() => removeNewFile(index)}
                title={t('remove')}
              >
                <FiX />
              </Button>
            </div>
          </div>
        ))}

        <div>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileChange}
            className="ds-hidden"
            id="multiple-file-input"
          />
          <label htmlFor="multiple-file-input" className="progress-file-upload-btn">
            {t('progress_add_files')}
          </label>
          <div className="progress-field__hint">{t('progress_allowed_file_types')}</div>
        </div>
      </div>
    </div>
  );
}
