// frontend/src/components/FileUploadWithProgressBar.jsx
import { useState } from 'react';
import FileUpload from './FileUpload';
import './FileUploadWithProgressBar.css';

/**
 * Simple file upload component with progress bar
 * Shows progress bar during upload (on save)
 * Allows the user to continue entering data
 */
export default function FileUploadWithProgressBar({
  value,
  onChange,
  uploadProgress = 0, // progress from 0-100
  isUploading = false, // upload state
  accept = "application/pdf",
  maxSizeMB = 10,
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
  onPreview,
}) {
  return (
    <div className={`file-upload-with-progress-bar ${className}`}>
      <FileUpload
        value={value}
        onChange={onChange}
        accept={accept}
        maxSizeMB={maxSizeMB}
        label={label}
        disabled={disabled || isUploading}
        showPreview={showPreview}
        compressionOptions={compressionOptions}
        existingFileUrl={existingFileUrl}
        existingFileName={existingFileName}
        onRemoveExisting={onRemoveExisting}
        fileType={fileType}
        fileIndex={fileIndex}
        onPreview={onPreview}
      />

      {/* Progress bar during upload */}
      {isUploading && (
        <div className="upload-progress-container">
          <div className="upload-progress-bar">
            <div 
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="upload-progress-text">
            {uploadProgress}%
          </span>
        </div>
      )}
    </div>
  );
}

