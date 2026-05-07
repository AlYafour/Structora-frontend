// frontend/src/components/FileUpload.jsx
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFile, FaCheckCircle, FaTimes, FaEye } from 'react-icons/fa';
import { formatFileSize, validateFileSize } from '../../utils/helpers/file';
import Button from '../common/Button';
import { openFileInNewWindow, extractFileNameFromUrl } from "../../utils/helpers/file";
import { logger } from '../../utils/logger';
import './FileUpload.css';

/**
 * Unified file upload component used across the entire system
 *
 * This is the only unified file upload component in the system.
 * It should be used in all screens to ensure consistency in:
 * - Display and preview
 * - Replacement and deletion
 * - Size and type validation
 * - Automatic image compression
 *
 * Features:
 * - Automatic image compression
 * - File preview
 * - Size and type validation
 * - Support for pre-existing files
 * - Unified and consistent design
 */
export default function FileUpload({
  value, // File or null
  onChange, // (file: File | null) => void
  onProgress, // (progress: number) => void (optional)
  // External accept is used to validate allowed file types
  accept = "application/pdf",
  maxSizeMB = 30,
  label,
  disabled = false,
  showPreview = true,
  compressionOptions = {},
  existingFileUrl,
  existingFileName,
  onRemoveExisting,
  className = "",
  fileType = "attachment", // File type for unified naming
  fileIndex = 0, // Index for multiple files
  onPreview, // optional override — called instead of opening in new tab
}) {
  const { t, i18n } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Create preview URL only once to avoid memory leak
  const previewUrl = useMemo(() => {
    if (value instanceof File && value.type.startsWith('image/')) {
      return URL.createObjectURL(value);
    }
    return null;
  }, [value]);

  // Clean up preview URL when file changes or on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processAndSetFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setIsProcessing(true);

    try {
      // ✅ Validate file size
      if (!validateFileSize(file, maxSizeMB)) {
        setError(t('file_upload_too_large', { name: file.name, maxSize: maxSizeMB }));
        setIsProcessing(false);
        return;
      }

      // ✅ Validate file type based on the provided accept parameter
      const acceptValue = accept || "application/pdf";
      let isValidFile = false;
      
      // If accept contains application/pdf or .pdf
      if (acceptValue.includes('application/pdf') || acceptValue.includes('.pdf')) {
        if (file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'))) {
          isValidFile = true;
        }
      }
      
      // Check by MIME type match
      if (!isValidFile) {
        const allowedMimes = acceptValue.split(',').map(s => s.trim().toLowerCase());
        if (file.type && allowedMimes.includes(file.type)) {
          isValidFile = true;
        }
      }

      // Check other extensions (e.g., .dwg, .dxf)
      if (!isValidFile) {
        const allowedExtensions = acceptValue.split(',').map(ext => {
          let clean = ext.trim().toLowerCase();
          // Remove MIME prefixes (application/, image/, etc.) or leading dot
          clean = clean.replace(/^[a-z]+\//, '').replace(/^\./, '');
          return clean;
        });

        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        isValidFile = allowedExtensions.includes(fileExtension || '');
      }
      
      if (!isValidFile) {
        const allowedTypes = acceptValue.split(',').map(ext => {
          let clean = ext.trim().toUpperCase();
          if (clean.includes('APPLICATION/')) return 'PDF';
          // Remove MIME prefixes like IMAGE/, VIDEO/, etc.
          clean = clean.replace(/^[A-Z]+\//, '').replace(/^\./, '');
          return clean;
        }).join(', ');
        setError(t('file_upload_invalid_file_type', { types: allowedTypes }));
        setIsProcessing(false);
        return;
      }

      // ✅ File is valid - send it
      onChange(file);
      setError('');
    } catch (err) {

      setError(t('file_upload_error'));
    } finally {
      setIsProcessing(false);
    }
  }, [compressionOptions, maxSizeMB, onChange, t, accept]);

  // ✅ Use the provided accept or default value
  const effectiveAccept = accept || "application/pdf";

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndSetFile(file);
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemove = () => {
    onChange(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExisting = () => {
    if (onRemoveExisting) {
      onRemoveExisting();
    }
  };

  const handleInputClick = () => {
    if (!disabled && !isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled || isProcessing) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (disabled || isProcessing) {
      setIsDragOver(false);
      return;
    }
    const file = e.dataTransfer?.files?.[0];
    setIsDragOver(false);
    if (file) {
      await processAndSetFile(file);
      // Reset input to allow selecting the same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open file in new window - unified without double download
  const handlePreview = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onPreview) { onPreview(); return; }

    try {
      // For new files (File object)
      if (value instanceof File) {
        const fileUrl = URL.createObjectURL(value);
        const link = document.createElement('a');
        link.href = fileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        return;
      }

      // For existing files - use openFileInNewWindow directly (without double download)
      if (existingFileUrl) {
        const fileName = existingFileName || extractFileNameFromUrl(existingFileUrl) || 'File';
        await openFileInNewWindow(existingFileUrl, fileName);
      }
    } catch (error) {
      logger.error('Error opening file:', error);
    }
  };

  return (
    <div
      className={`file-upload-wrapper ${className} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {label && <label className="field-label">{label}</label>}
      
      {/* Pre-existing file */}
      {existingFileUrl && !value && (
        <div className="existing-file-info">
          <div className="file-info-row">
            <div className="file-icon-text">
              <FaFile className="file-icon" />
              <span className="file-status-text">{t('file_upload_current_file')}</span>
            </div>
            <div className="file-actions">
              <Button
                variant="primary"
                type="button"
                onClick={(e) => handlePreview(e)}
                className="preview-file-btn"
                size="small"
                disabled={disabled || isProcessing}
                title={t('file_upload_preview_file')}
              >
                <FaEye />
                <span>{t('file_upload_preview')}</span>
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={handleInputClick}
                className="replace-file-btn"
                size="small"
                disabled={disabled || isProcessing}
              >
                {t('file_upload_replace')}
              </Button>
              {onRemoveExisting && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleRemoveExisting}
                  className="remove-file-btn"
                  size="small"
                >
                  <FaTimes />
                </Button>
              )}
            </div>
          </div>
          {/* Hidden input for replacement */}
          <input
            ref={fileInputRef}
            type="file"
            accept={effectiveAccept}
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
            className="file-input-hidden"
          />
        </div>
      )}

      {/* Newly selected file */}
      {value instanceof File && (
        <div className="selected-file-info">
          <div className="file-info-row">
            <div className="file-icon-text">
              <FaCheckCircle className="file-icon file-icon-success" />
              <div className="file-status-group">
                <span className="file-status-text">{t('file_upload_file_selected')}</span>
                <span className="file-size">{formatFileSize(value.size)}</span>
              </div>
            </div>
            <div className="file-actions">
              <Button
                variant="primary"
                type="button"
                onClick={(e) => handlePreview(e)}
                className="preview-file-btn"
                size="small"
                disabled={disabled || isProcessing}
                title={t('file_upload_preview_file')}
              >
                <FaEye />
                <span>{t('file_upload_preview')}</span>
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={handleInputClick}
                className="replace-file-btn"
                size="small"
                disabled={disabled || isProcessing}
              >
                {t('file_upload_replace')}
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={handleRemove}
                className="remove-file-btn"
                disabled={isProcessing}
                size="small"
              >
                <FaTimes />
              </Button>
            </div>
          </div>
          {showPreview && previewUrl && (
            <div className="file-preview">
              <img
                src={previewUrl}
                alt="Preview"
                className="preview-image"
              />
            </div>
          )}
          {/* Hidden input for replacement */}
          <input
            ref={fileInputRef}
            type="file"
            accept={effectiveAccept}
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
            className="file-input-hidden"
          />
        </div>
      )}

      {/* File upload input - shown only when there is no existing or new file */}
      {!value && !existingFileUrl && (
        <div className="file-input-wrapper" role="button" tabIndex={0} onClick={handleInputClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleInputClick(); } }}>
          <input
            ref={fileInputRef}
            type="file"
            accept={effectiveAccept}
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
            className="file-input-hidden"
          />
          <div className="file-input-display">
            <FaFile className="file-input-icon" />
            <span className="file-input-text">
              {isProcessing
                ? t('file_upload_processing')
                : t('file_upload_select_file')
              }
            </span>
            <span className="file-input-browse">{t('file_upload_browse')}</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="file-error">
          {error}
        </div>
      )}

      {/* Additional information */}
      <div className="file-upload-hint" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
        {t('file_upload_allowed_files', {
          types: accept
            ? accept.split(',').map(ext => ext.trim().replace('.', '').toUpperCase()).join(', ')
            : 'PDF',
          maxSize: maxSizeMB
        })}
      </div>
    </div>
  );
}
