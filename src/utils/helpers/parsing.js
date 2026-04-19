/**
 * Parsing Helper Utilities
 *
 * Shared parsing functions used across multiple modules:
 * - Attachment data parsing (Progress, Payment Claims)
 * - Zero-value checking (Payment Claims)
 */

import { extractFileNameFromUrl } from './file.js';

/**
 * Parse an array-like field from an entry (handles string, array, or single value).
 * Used for attachment_file_urls, attachment_file_names, etc.
 *
 * @param {*} value - The field value (array, JSON string, or single string)
 * @param {*} [fallbackSingleField] - Fallback single field value (e.g., entry.attachment_file_url)
 * @returns {string[]} Parsed array of non-empty strings
 */
export function parseArrayField(value, fallbackSingleField) {
  if (value) {
    if (Array.isArray(value)) {
      return value.filter(v => v && String(v).trim() !== '');
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        return arr.filter(v => v && String(v).trim() !== '');
      } catch {
        return value.trim() ? [value] : [];
      }
    }
  }
  if (fallbackSingleField) {
    return [fallbackSingleField];
  }
  return [];
}

/**
 * Parse attachment URLs and names from an entry object.
 * Consolidates logic previously duplicated in ViewProgressEntryPage, useProgressForm, etc.
 *
 * @param {Object} entry - Entry object with attachment fields
 * @returns {{ urls: string[], names: string[] }} Parsed attachment data
 */
export function parseAttachmentData(entry) {
  if (!entry) return { urls: [], names: [] };

  const urls = parseArrayField(entry.attachment_file_urls, entry.attachment_file_url);
  let names = parseArrayField(entry.attachment_file_names, entry.attachment_file_name);

  // If no names found, derive from URLs
  if (names.length === 0 && urls.length > 0) {
    names = urls.map(url => extractFileNameFromUrl(url));
  }

  // Pad names array to match urls length
  while (names.length < urls.length) {
    names.push(null);
  }

  return { urls, names };
}

/**
 * Check if a value represents zero (handles string, number, null, undefined).
 * Consolidates the pattern: value === 0 || value === '0' || value === '0.00' || value === '0.0'
 *
 * @param {*} value - Value to check
 * @returns {boolean} True if value is zero or empty
 */
export function isZeroValue(value) {
  if (value === null || value === undefined || value === '') return true;
  const num = parseFloat(value);
  return !isNaN(num) && num === 0;
}
