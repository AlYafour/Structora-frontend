/**
 * Arabic Formatting Utilities
 * Consolidated from: formatters.js, numberFormatting.js
 *
 * @module formatters/arabic
 */

import { formatNumberInput, numberToArabicWords } from './number.js';

/**
 * Convert English digits to Arabic digits
 * @param {string|number} str - String or number to convert
 * @returns {string} String with Arabic digits
 */
export const toArabicDigits = (str) => {
  if (!str) return "";
  return String(str).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
};

/**
 * Format money as Arabic words
 * Returns number in Arabic word form (e.g., "مليونان درهم")
 * Always uses English digits per system requirement
 * @param {string|number} value - Value to format
 * @returns {string} Arabic words representation or "—" if invalid
 */
export const formatMoneyArabic = (value) => {
  if (!value && value !== 0) return "—";
  const words = numberToArabicWords(value);
  if (!words) return "—";
  return words + " درهم";
};

// Re-export for convenience
export { numberToArabicWords };
