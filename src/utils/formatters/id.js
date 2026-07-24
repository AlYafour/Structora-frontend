/**
 * ID and Code Formatting Utilities
 * Consolidated from: idFormatters.js, internalCodeFormatter.js, formatters.js, inputFormatters.js
 *
 * @module formatters/id
 */

// ===== Emirates ID Formatting =====

/**
 * Format Emirates ID (784-XXXX-XXXXXXX-X)
 * @param {string} digits - Raw digits
 * @returns {string} Formatted Emirates ID
 */
export const formatEmiratesId = (digits) => {
  if (!digits) return "";
  const raw = digits.replace(/\D/g, "").slice(0, 15);
  const part1 = raw.slice(0, 3);
  const part2 = raw.slice(3, 7);
  const part3 = raw.slice(7, 14);
  const part4 = raw.slice(14, 15);
  return [part1, part2, part3, part4].filter(Boolean).join("-");
};

/**
 * Handle Emirates ID input with cursor position preservation
 * @param {Event} event - Input event
 * @param {Function} onUpdate - Update callback function
 */
export const handleEmiratesIdInput = (event, onUpdate) => {
  const input = event.target;
  const cursorPos = input.selectionStart || 0;

  // Count how many digits are before the cursor in the current value
  const beforeCursor = input.value.slice(0, cursorPos);
  const digitsBeforeCursor = beforeCursor.replace(/\D/g, "").length;

  const raw = input.value.replace(/\D/g, "").slice(0, 15);

  let formatted = "";
  if (raw.length > 0) formatted += raw.slice(0, 3);
  if (raw.length > 3) formatted += "-" + raw.slice(3, 7);
  if (raw.length > 7) formatted += "-" + raw.slice(7, 14);
  if (raw.length > 14) formatted += "-" + raw.slice(14, 15);

  // Calculate new cursor position: find the position in formatted string
  // that has the same number of digits before it
  let newCursor = 0;
  let digitsSeen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (digitsSeen === digitsBeforeCursor) break;
    newCursor = i + 1;
    if (/\d/.test(formatted[i])) {
      digitsSeen++;
    }
  }

  onUpdate(formatted);

  requestAnimationFrame(() => {
    if (input && input.setSelectionRange) {
      input.setSelectionRange(newCursor, newCursor);
    }
  });
};

/**
 * Calculate birth date from Emirates ID
 * Format: 784-YYYY-MMDD-XXXXXXX-X
 * @param {string} idNumber - Emirates ID
 * @returns {string|null} Birth date in YYYY-MM-DD format or null
 */
export const calculateBirthDateFromEmiratesId = (idNumber) => {
  if (!idNumber) return null;

  // Remove separators
  const cleaned = String(idNumber).replace(/[-\s]/g, "");

  // Must be 15 digits
  if (cleaned.length !== 15) return null;

  try {
    // Positions 4-7 represent year
    const year = cleaned.slice(3, 7);
    // Positions 8-9 represent month
    const month = cleaned.slice(7, 9);
    // Positions 10-11 represent day
    const day = cleaned.slice(9, 11);

    // Validate date components
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);

    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) return null;
    if (monthNum < 1 || monthNum > 12) return null;
    if (dayNum < 1 || dayNum > 31) return null;

    // Validate using Date object
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      return null;
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  } catch { /* date conversion fallback */
    return null;
  }
};

/**
 * Calculate age from Emirates ID
 * @param {string} idNumber - Emirates ID
 * @returns {number|null} Age in years or null if invalid
 */
export const calculateAgeFromEmiratesId = (idNumber) => {
  if (!idNumber || typeof idNumber !== "string") return null;

  // Remove separators
  const cleaned = String(idNumber).replace(/[-\s]/g, "");

  let birthYear = null;

  // Method 1: If ID has separators (e.g., 784-1991-9691717-5)
  if (idNumber.includes("-")) {
    const parts = idNumber.split("-");
    if (parts.length >= 2 && parts[1]) {
      const yearStr = parts[1].trim();
      const yearNum = parseInt(yearStr, 10);
      if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
        birthYear = yearNum;
      }
    }
  }

  // Method 2: Extract from positions 4-7
  if (birthYear === null && cleaned.length >= 8) {
    const yearStr = cleaned.substring(3, 7);
    const yearNum = parseInt(yearStr, 10);
    if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
      birthYear = yearNum;
    }
  }

  // Calculate age
  if (birthYear !== null) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    return age >= 0 ? age : null;
  }

  return null;
};

// ===== Project Number Formatting =====

/**
 * Format project number (B1N-2024-014159)
 * @param {string} raw - Raw project number
 * @returns {string} Formatted project number
 */
export const formatProjectNumber = (raw) => {
  if (!raw) return "";
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const part1 = v.slice(0, 3);
  const part2 = v.slice(3, 7);
  const part3 = v.slice(7, 13);
  let formatted = part1;
  if (part2) formatted += "-" + part2;
  if (part3) formatted += "-" + part3;
  return formatted;
};

/**
 * Build permit number from project number
 * @param {string} projectNo - Project number
 * @returns {string} Permit number (project number + "-P01")
 */
export const buildPermitNumber = (projectNo) => {
  if (!projectNo) return "";
  return projectNo + "-P01";
};

// ===== Internal Code Formatting =====

/**
 * Extract digits only from string
 * @param {string} str - String to process
 * @returns {string} Digits only
 */
export const toDigits = (str) => (str || "").replace(/[^0-9]/g, "");

/**
 * Format internal code: M + digits (max 40 characters)
 * @deprecated Use auto-generated project codes instead (e.g. 37-CON-1001-2026)
 * @param {string} raw - Raw internal code
 * @returns {string} Formatted internal code
 */
export const formatInternalCode = (raw) => {
  if (!raw) return "";
  // Generated formats are already formatted (old and branch-based forms contain hyphens).
  if (String(raw).includes("-")) return raw;
  // Legacy format: M + digits
  const digits = toDigits(raw);
  return ("M" + digits).slice(0, 40);
};

/**
 * Check if last digit is odd (1,3,5,7,9)
 * @param {string} code - Code to check
 * @returns {boolean} True if last digit is odd
 */
export const isLastDigitOdd = (code) => {
  const last = code.replace(/\D/g, "").slice(-1);
  return ["1", "3", "5", "7", "9"].includes(last);
};

/**
 * Check if a project code is in the new auto-generated format
 * @param {string} code - Project code
 * @returns {boolean} True if new format (e.g. 37-CON-1001-2026)
 */
export const isAutoGeneratedCode = (code) => {
  if (!code) return false;
  return /^\d+-[A-Z]+-/.test(code);
};

// ===== Phone Number Formatting =====

/**
 * Format UAE phone number (+971 + 9 digits)
 * @param {string} value - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatUAEPhone = (value) => {
  if (!value) return "";

  // Remove anything that's not a digit
  let digits = String(value).replace(/\D/g, "");

  // Prevent 0 as first digit
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // If starts with 971, remove it (will add back)
  let phoneDigits = digits;
  if (digits.startsWith("971")) {
    phoneDigits = digits.slice(3);
  }

  // Prevent 0 as first digit after removing 971
  if (phoneDigits.startsWith("0")) {
    phoneDigits = phoneDigits.slice(1);
  }

  // Must be 9 digits
  if (phoneDigits.length > 9) {
    phoneDigits = phoneDigits.slice(0, 9);
  }

  return phoneDigits ? `+971${phoneDigits}` : "";
};

/**
 * Validate UAE phone number format
 * @param {string} value - Phone number
 * @returns {boolean} True if valid
 */
export const isValidUAEPhone = (value) => {
  if (!value) return false;
  // Must start with +971 followed by 9 digits
  return /^\+971\d{9}$/.test(value);
};
