/**
 * File Helper Utilities
 * Consolidated from: fileHelpers.js, fileNaming.js, fileUploadHelpers.js, fileCompression.js
 *
 * @module helpers/file
 */

import imageCompression from 'browser-image-compression';
import { logger } from '../logger.js';

// ===== File Validation =====

/**
 * Validate file state
 * Ensures no intermediate states or references to non-existent files
 *
 * @param {any} fileValue - File value (File object, URL string, null, undefined)
 * @returns {{isValid: boolean, type: 'file'|'url'|'empty', value: any}} Validation result
 */
export function validateFileState(fileValue) {
  // No file
  if (fileValue === null || fileValue === undefined || fileValue === '') {
    return { isValid: true, type: 'empty', value: null };
  }

  // New file (File object)
  if (fileValue instanceof File) {
    return { isValid: true, type: 'file', value: fileValue };
  }

  // Existing file URL (URL string)
  if (typeof fileValue === 'string' && fileValue.trim() !== '') {
    return { isValid: true, type: 'url', value: fileValue.trim() };
  }

  // Invalid state
  logger.warn('Invalid file state:', fileValue);
  return { isValid: false, type: 'empty', value: null };
}

/**
 * Clean and normalize file value
 * Ensures value is in valid and expected state
 *
 * @param {any} fileValue - File value
 * @returns {File|string|null} Cleaned value
 */
export function sanitizeFileValue(fileValue) {
  const { isValid, type, value } = validateFileState(fileValue);

  if (!isValid || type === 'empty') {
    return null;
  }

  return value;
}

/**
 * Build payload for file deletion
 * Ensures correct deletion flag is sent to backend
 *
 * @param {FormData} formData - FormData object
 * @param {string} fieldName - Field name
 * @param {any} currentValue - Current value
 * @param {string} existingUrl - Existing file URL (if any)
 * @returns {boolean} True if deletion flag was added
 */
export function appendFileDeleteFlag(formData, fieldName, currentValue, existingUrl) {
  // If value is explicitly null and there's an existing file, send deletion flag
  if (currentValue === null && existingUrl && existingUrl.trim()) {
    formData.append(`${fieldName}_delete`, "true");
    return true;
  }
  return false;
}

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array<string>} [allowedTypes=[]] - Allowed MIME types
 * @returns {boolean} True if type is allowed
 */
export function validateFileType(file, allowedTypes = []) {
  if (!file || allowedTypes.length === 0) return true;
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} [maxSizeMB=10] - Maximum size in MB
 * @returns {boolean} True if size is acceptable
 */
export function validateFileSize(file, maxSizeMB = 10) {
  if (!file) return false;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

// ===== File URL Utilities =====

/**
 * Extract file name from URL with decoding
 * @param {string} fileUrl - File URL
 * @returns {string} File name
 */
export function extractFileNameFromUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return "";

  const parts = fileUrl.split("/");
  const fileName = parts[parts.length - 1] || "";

  try {
    return decodeURIComponent(fileName);
  } catch { /* decodeURIComponent fallback */
    return fileName;
  }
}

/**
 * Extract relative file path from URL
 * @param {string} fileUrl - File URL (e.g., /media/contracts/main/file.pdf)
 * @returns {string|null} Relative file path (e.g., contracts/main/file.pdf)
 */
function extractMediaPath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return null;

  // Remove `/media/` prefix if present
  if (fileUrl.startsWith("/media/")) {
    return fileUrl.substring(7); // Remove "/media/"
  }

  // If this is a full URL that contains `/media/` somewhere in the path
  const mediaIndex = fileUrl.indexOf("/media/");
  if (mediaIndex !== -1) {
    return fileUrl.substring(mediaIndex + 7);
  }

  // If this is a relative URL without `/media/`
  if (fileUrl.startsWith("/")) {
    return fileUrl.substring(1);
  }

  return fileUrl;
}

/**
 * Build full file URL from relative or absolute URL
 * Uses protected API endpoint instead of direct access
 * @param {string} fileUrl - File URL (relative or absolute)
 * @returns {string|null} Full file URL via API
 */
export function buildFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") {
    return null;
  }

  // If this is an absolute URL without `/media/` in path, return as-is
  if (fileUrl.startsWith("http") && !fileUrl.includes("/media/")) {
    return fileUrl;
  }

  // Extract clean relative path
  let path = fileUrl;

  // Strip full Cloudinary URL prefix (if backend accidentally returned a full URL)
  const mediaIdx = path.indexOf('/media/');
  if (mediaIdx !== -1) {
    path = path.substring(mediaIdx + 7);
  }

  // Strip leading /media/ or repeated media/ prefixes (handles double-prefix bug)
  if (path.startsWith('/media/')) path = path.substring(7);
  while (path.startsWith('media/')) path = path.substring(6);
  path = path.replace(/^\/+/, '');

  if (!path) return null;

  // Decode once if the path is already encoded (to avoid double-encoding)
  try {
    const decoded = decodeURIComponent(path);
    if (decoded !== path) path = decoded;
  } catch { /* already decoded or malformed — use as-is */ }

  // Encode each segment separately (handles Arabic characters and spaces)
  const encodedPath = path.split('/').map(segment => {
    if (!segment) return segment;
    return encodeURIComponent(segment);
  }).join('/');

  // Build API base URL
  let apiBase;
  if (import.meta.env.DEV) {
    apiBase = "/api";
  } else {
    const envApiUrl = import.meta.env.VITE_API_URL || "";
    if (envApiUrl) {
      apiBase = envApiUrl.replace(/\/+$/, "");
      if (!apiBase.endsWith("/api")) {
        apiBase = apiBase.endsWith("/") ? `${apiBase}api` : `${apiBase}/api`;
      }
    } else {
      apiBase = `${window.location.origin}/api`;
    }
  }

  return `${apiBase}/files/${encodedPath}`;
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===== File Operations =====

/**
 * Fetch file with authentication credentials
 * Uses protected API endpoint
 * @param {string} fileUrl - File URL
 * @returns {Promise<Blob>} Blob object for file
 */
async function fetchFileWithAuth(fileUrl) {
  const apiUrl = buildFileUrl(fileUrl);
  if (!apiUrl) {
    throw new Error("Could not build file URL");
  }

  const fullApiUrl = apiUrl.startsWith("http") ? apiUrl : `${window.location.origin}${apiUrl}`;

  // Auth cookies are sent automatically via credentials: 'include'
  let response = await fetch(fullApiUrl, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': '*/*' }
  });

  // Auto-refresh token on 401 (refresh cookie is sent automatically)
  if (!response.ok && response.status === 401) {
    try {
      const { api } = await import("../../services/api");
      await api.post('auth/token/refresh/', {});

      response = await fetch(fullApiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': '*/*' }
      });
    } catch { /* token refresh failed */
      throw new Error("Authentication failed. Please login again.");
    }
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * Create simple HTML page to display file with clear title
 * @param {Blob} blob - Blob object for file
 * @param {string} fileName - File name
 * @param {string} mimeType - File type (MIME type)
 * @returns {string} HTML content
 */
function createFileViewerHTML(blob, fileName, mimeType) {
  const blobUrl = URL.createObjectURL(blob);

  // Detect content type
  const isImage = mimeType.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml';

  let contentHTML = '';

  if (isImage) {
    contentHTML = `<img src="${blobUrl}" alt="${fileName}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />`;
  } else if (isPDF) {
    contentHTML = `<iframe src="${blobUrl}" style="width: 100%; height: 100vh; border: none;" title="${fileName}"></iframe>`;
  } else if (isVideo) {
    contentHTML = `<video controls style="width: 100%; max-height: 100vh;" src="${blobUrl}">Your browser does not support the video tag.</video>`;
  } else if (isAudio) {
    contentHTML = `<audio controls style="width: 100%;" src="${blobUrl}">Your browser does not support the audio tag.</audio>`;
  } else if (isText) {
    contentHTML = `<pre style="padding: 20px; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; background: #f5f5f5; margin: 0; height: 100vh; overflow: auto;">Loading...</pre>`;
  } else {
    contentHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center;">
        <p style="font-size: 18px; margin-bottom: 20px;">${fileName}</p>
        <a href="${blobUrl}" download="${fileName}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Download File</a>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${fileName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
      </style>
    </head>
    <body>
      ${contentHTML}
      ${isText ? `
        <script>
          fetch('${blobUrl}')
            .then(response => response.text())
            .then(text => {
              document.querySelector('pre').textContent = text;
            })
            .catch(error => {
              document.querySelector('pre').textContent = 'Error loading file: ' + error.message;
            });
        </script>
      ` : ''}
      <script>
        // Clean up blob URL when closing the page
        window.addEventListener('beforeunload', function() {
          URL.revokeObjectURL('${blobUrl}');
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Open file in new window safely with improved UX
 * Uses fetch with credentials to ensure authentication
 * @param {string} fileUrl - File URL
 * @param {string} [fileName=null] - File name (optional)
 * @param {Object} [options={}] - Additional options
 * @param {string} [options.target="_blank"] - Target window
 * @param {string} [options.features="noopener,noreferrer"] - Window features
 */
export async function openFileInNewWindow(fileUrl, fileName = null, options = {}) {
  if (!fileUrl) {
    return;
  }

  try {
    // Fetch file with authentication
    const blob = await fetchFileWithAuth(fileUrl);

    // Derive file name if not explicitly provided
    if (!fileName) {
      fileName = extractFileNameFromUrl(fileUrl) || 'File';
    }

    // Detect file MIME type
    const mimeType = blob.type || 'application/octet-stream';

    // Create HTML page that will display the file
    const htmlContent = createFileViewerHTML(blob, fileName, mimeType);
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const htmlBlobUrl = URL.createObjectURL(htmlBlob);

    // Open HTML page in a new window
    const {
      target = "_blank",
      features = "noopener,noreferrer"
    } = options;

    const newWindow = window.open(htmlBlobUrl, target, features);

    if (!newWindow) {
      // Fallback: use an `<a>` tag when `window.open` is blocked
      const link = document.createElement('a');
      link.href = htmlBlobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Clean up blob URLs after opening the window
    setTimeout(() => {
      URL.revokeObjectURL(htmlBlobUrl);
    }, 1000);
  } catch (error) {
    // Fallback: Try opening file directly (for public files)
    const fullUrl = buildFileUrl(fileUrl);
    if (fullUrl) {
      window.open(fullUrl, options.target || "_blank", options.features || "noopener,noreferrer");
    }
  }
}

/**
 * Download file with authentication - triggers browser download dialog
 * @param {string} fileUrl - File URL
 * @param {string} [fileName=null] - File name for download
 */
export async function downloadFile(fileUrl, fileName = null) {
  if (!fileUrl) return;

  try {
    const blob = await fetchFileWithAuth(fileUrl);

    if (!fileName) {
      fileName = extractFileNameFromUrl(fileUrl) || 'File';
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    logger.error('Error downloading file:', error);
    // Fallback: open in new window
    const fullUrl = buildFileUrl(fileUrl);
    if (fullUrl) {
      window.open(fullUrl, "_blank", "noopener,noreferrer");
    }
  }
}

/**
 * Safe onClick handler for opening files (for use in JSX)
 * @param {string} fileUrl - File URL
 * @param {string} [fileName=null] - File name
 * @returns {Function} onClick handler
 */
export function handleFileClick(fileUrl, fileName = null) {
  return async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await openFileInNewWindow(fileUrl, fileName);
  };
}

// ===== File Naming =====

/**
 * Convert field label to file name (remove "إرفاق" and other common words)
 * @param {string} labelText - Field label text
 * @returns {string} File name
 */
function labelToFileName(labelText) {
  if (!labelText) return 'ملف';

  // Remove common words
  let cleaned = labelText
    .replace(/^يرجى\s+/i, '') // Remove "يرجى"
    .replace(/^إرفاق\s+/i, '') // Remove "إرفاق"
    .replace(/^attach\s+/i, '') // Remove "attach"
    .trim();

  // Replace spaces with underscore
  cleaned = cleaned.replace(/\s+/g, '_');

  return cleaned || 'ملف';
}

/**
 * Get standard file name based on file type or field label
 * @param {string} fileType - File type (id_attachment, building_license_file, etc.)
 * @param {number} [index=0] - Index (for multiple files like ID cards)
 * @param {string} [originalExtension=''] - Original file extension
 * @param {string} [labelText=''] - Field label text (optional, used instead of fileType if provided)
 * @returns {string} Standard file name
 */
export function getStandardFileName(fileType, index = 0, originalExtension = '', labelText = '') {
  // Extract extension from original file
  const extension = originalExtension || '.pdf';

  // If label text exists, use it directly
  if (labelText) {
    const fileName = labelToFileName(labelText);
    // Extract English text from labelText if present
    const englishMatch = labelText.match(/[A-Z][a-zA-Z\s]+/);
    const englishPart = englishMatch ? englishMatch[0].trim().replace(/\s+/g, '_') : '';
    const baseName = englishPart ? `${fileName}_${englishPart}` : fileName;
    return index > 0 ? `${baseName}_${index + 1}${extension}` : `${baseName}${extension}`;
  }

  // Standard file names by type (with English text)
  const fileNames = {
    // Site plan
    'site_plan_file': { ar: 'مخطط_الأرض', en: 'Site_Plan' },

    // ID card
    'id_attachment': { ar: 'بطاقة_الهوية', en: 'ID_Card' },
    'owner_id': { ar: 'بطاقة_الهوية', en: 'ID_Card' },

    // Building license
    'building_license_file': { ar: 'رخصة_البناء', en: 'Building_Permit' },
    'license_file': { ar: 'رخصة_البناء', en: 'Building_Permit' },

    // Payment attachments
    'deposit_slip': { ar: 'إيصال_إيداع', en: 'Deposit_Slip' },
    'invoice_file': { ar: 'فاتورة_الدفع', en: 'Payment_Invoice' },
    'receipt_voucher': { ar: 'سند_قبض', en: 'Receipt_Voucher' },
    'bank_payment_attachments': { ar: 'مرفقات_دفعة_البنك', en: 'Bank_Payment_Attachments' },

    // Contract attachments
    'contract_attachment': { ar: 'مرفق_العقد', en: 'Contract_Attachment' },

    // Other attachments
    'attachment': { ar: 'مرفق', en: 'Attachment' },
  };

  const fileInfo = fileNames[fileType] || { ar: 'ملف', en: 'File' };
  const baseName = `${fileInfo.ar}_${fileInfo.en}`;
  return index > 0 ? `${baseName}_${index + 1}${extension}` : `${baseName}${extension}`;
}

/**
 * Rename file for upload
 * @param {File} file - Original file
 * @param {string} fileType - File type
 * @param {number} [index=0] - Index (for multiple files)
 * @param {string} [labelText=''] - Field label text (optional)
 * @returns {File} File with new name
 */
export function renameFileForUpload(file, fileType, index = 0, labelText = '') {
  if (!(file instanceof File)) {
    return file;
  }

  // Extract extension from original file
  const originalName = file.name;
  const extension = originalName.substring(originalName.lastIndexOf('.'));

  // Get standard name
  const newName = getStandardFileName(fileType, index, extension, labelText);

  // Create new File with standard name
  const renamedFile = new File([file], newName, {
    type: file.type,
    lastModified: file.lastModified,
  });

  return renamedFile;
}

/**
 * Extract file type from field name
 * @param {string} fieldName - Field name
 * @returns {string} File type
 */
export function getFileTypeFromFieldName(fieldName) {
  const fieldTypeMap = {
    'site_plan_file': 'site_plan_file',
    'id_attachment': 'id_attachment',
    'building_license_file': 'building_license_file',
    'deposit_slip': 'deposit_slip',
    'invoice_file': 'invoice_file',
    'receipt_voucher': 'receipt_voucher',
    'bank_payment_attachments': 'bank_payment_attachments',
  };

  return fieldTypeMap[fieldName] || 'attachment';
}

// ===== File Upload =====

/**
 * Create optimized FormData with file handling
 * @param {Object} data - Data to send
 * @param {Array<string>} [fileFields=[]] - Field names containing files
 * @returns {FormData} FormData ready to send
 */
export function createOptimizedFormData(data, fileFields = []) {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    // Skip empty fields
    if (value === null || value === undefined || value === '') {
      return;
    }

    // Handle files
    if (fileFields.includes(key) && value instanceof File) {
      formData.append(key, value, value.name);
      return;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        formData.append(key, '[]');
      } else {
        // Check if array contains files
        const hasFiles = value.some(item =>
          item instanceof File ||
          (typeof item === 'object' && item !== null && Object.values(item).some(v => v instanceof File))
        );

        if (hasFiles) {
          // Special handling for arrays containing files (like owners)
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              Object.entries(item).forEach(([subKey, subValue]) => {
                if (subValue instanceof File) {
                  formData.append(`${key}[${index}][${subKey}]`, subValue, subValue.name);
                } else if (subValue !== null && subValue !== undefined && subValue !== '') {
                  formData.append(`${key}[${index}][${subKey}]`, subValue);
                }
              });
            }
          });
        } else {
          formData.append(key, JSON.stringify(value));
        }
      }
      return;
    }

    // Handle objects
    if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
      formData.append(key, JSON.stringify(value));
      return;
    }

    // Regular values
    formData.append(key, value);
  });

  return formData;
}

// ===== Image Compression =====

/**
 * Compress images before upload to reduce time and size
 * @param {File} file - File to compress
 * @param {Object} [options={}] - Compression options
 * @returns {Promise<File>} Compressed file
 */
export async function compressImage(file, options = {}) {
  // Check file type
  if (!file.type.startsWith('image/')) {
    // If not an image, return as is
    return file;
  }

  const defaultOptions = {
    maxSizeMB: 1, // Maximum size in MB
    maxWidthOrHeight: 1920, // Maximum width or height
    useWebWorker: true, // Use Web Worker to speed up process
    fileType: file.type, // Preserve original file type
    initialQuality: 0.8, // Image quality (0-1)
    ...options
  };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    const originalSize = (file.size / 1024 / 1024).toFixed(2);
    const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
    logger.debug(`Image compressed: ${file.name} (${originalSize}MB → ${compressedSize}MB)`);
    return compressedFile;
  } catch (error) {
    logger.warn('Image compression failed, using original file', error);
    return file; // On failure, return original file
  }
}

/**
 * Process files before upload (compress images only)
 * @param {File} file - File to process
 * @param {Object} [compressionOptions={}] - Compression options
 * @returns {Promise<File>} Processed file
 */
export async function processFileForUpload(file, compressionOptions = {}) {
  if (!file) return null;

  // Compress images only
  if (file.type.startsWith('image/')) {
    return await compressImage(file, compressionOptions);
  }

  // Other files (PDF, DOC, etc.) return as is
  return file;
}

/**
 * Download a blob as a file — creates a temporary link, clicks it, and cleans up.
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename for the download
 */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
