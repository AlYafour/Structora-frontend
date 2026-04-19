/**
 * Date Formatting Utilities
 * Consolidated from: formatters.js, dateHelpers.js
 *
 * @module formatters/date
 */

/**
 * Convert Arabic digits to English digits
 * @param {string} str - String with possible Arabic digits
 * @returns {string} String with English digits
 */
export const normalizeDigits = (str) =>
  String(str ?? "")
    .replace(/[\u0660-\u0669]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .trim();

/**
 * Check if date string is a placeholder
 * @param {string} str - Date string to check
 * @returns {boolean} True if placeholder
 */
export const isPlaceholderDate = (str) => {
  const dateStr = String(str).trim();
  return /^dd\s*[/-]\s*mm\s*[/-]\s*yyyy$/i.test(dateStr);
};

/**
 * Convert date from ISO (yyyy-mm-dd) to display format (dd/mm/yyyy)
 * @param {string} dateStr - Date in ISO format
 * @param {string} [locale="ar"] - Locale (not used currently)
 * @returns {string} Formatted date or "—" if invalid
 */
export const formatDate = (dateStr, locale = "ar") => {
  if (!dateStr) return "—";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { /* date parse fallback */
    return "—";
  }
};

/**
 * Convert date from display format (dd/mm/yyyy or dd-mm-yyyy) to ISO (yyyy-mm-dd)
 * @param {string} dateStr - Date in display format
 * @returns {string|null} Date in ISO format or null if invalid
 */
export const toIsoDate = (dateStr) => {
  if (!dateStr) return null;

  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Convert from dd/mm/yyyy to yyyy-mm-dd
  let match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  // Convert from dd-mm-yyyy to yyyy-mm-dd (legacy compatibility)
  match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return null;
};

/**
 * Convert date to input format (yyyy-mm-dd)
 * @param {string} dateStr - Date in any format
 * @returns {string} Date in yyyy-mm-dd format or empty string
 */
export const toInputDate = (dateStr) => {
  if (!dateStr) return "";

  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Convert from dd/mm/yyyy to yyyy-mm-dd
  let match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  // Convert from dd-mm-yyyy to yyyy-mm-dd (legacy compatibility)
  match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return dateStr;
};

/**
 * Convert date from ISO to display format (DD/MM/YYYY)
 * @param {string} dateStr - Date in ISO format (yyyy-mm-dd)
 * @returns {string} Date in DD/MM/YYYY format or empty string
 */
export const formatDateInput = (dateStr) => {
  if (!dateStr) return "";

  try {
    // Already in ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    }

    // Already in dd/mm/yyyy format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }

    // Try converting from any other format
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { /* date parse fallback */
    return "";
  }
};

/**
 * Format date input value during typing (DD/MM/YYYY)
 * @param {string} value - Input value
 * @returns {string} Formatted value
 */
export const formatDateInputValue = (value) => {
  if (!value) return "";

  // Remove anything that's not a digit
  const digits = value.replace(/\D/g, "");

  // Apply mask with max 8 digits (DDMMYYYY)
  const limitedDigits = digits.slice(0, 8);

  if (limitedDigits.length <= 2) {
    return limitedDigits;
  } else if (limitedDigits.length <= 4) {
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
  } else {
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2, 4)}/${limitedDigits.slice(4, 8)}`;
  }
};

/**
 * Get today's date in ISO format
 * @returns {string} Today's date in yyyy-mm-dd format
 */
export const todayIso = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${mm}-${dd}`;
};

/**
 * Get day name from date
 * @param {string} dateStr - Date in ISO format
 * @param {string} [locale="ar"] - Locale for day name
 * @returns {string} Day name or empty string
 */
export const getDayName = (dateStr, locale = "ar") => {
  if (!dateStr) return "";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString(locale, { weekday: "long" });
  } catch { /* date parse fallback */
    return "";
  }
};

/**
 * Convert date to input format with Arabic digit normalization
 * @param {string} dateStr - Date string (may contain Arabic digits)
 * @returns {string} Normalized date in input format
 */
export const toInputDateUnified = (dateStr) => {
  if (!dateStr) return "";
  const normalized = normalizeDigits(dateStr);
  if (!normalized || isPlaceholderDate(normalized)) return "";
  return toInputDate(normalized);
};

/**
 * Convert date to API format (ISO) with Arabic digit normalization
 * @param {string} dateStr - Date string (may contain Arabic digits)
 * @returns {string} Normalized date in ISO format
 */
export const toApiDateUnified = (dateStr) => {
  if (!dateStr) return "";
  const normalized = normalizeDigits(dateStr);
  if (!normalized || isPlaceholderDate(normalized)) return "";
  return toIsoDate(normalized);
};
