/**
 * Email validation utilities
 * Rules:
 *  1. No Arabic characters allowed
 *  2. First character must be uppercase English letter
 *  3. Must contain @ symbol
 *  4. Must have a valid domain with dot (e.g. .com, .net)
 *  5. Standard email format validation
 */

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const EMAIL_REGEX = /^[A-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate email and return error key (or null if valid).
 * Returns null for empty strings (field not required).
 */
export function validateEmail(value) {
  if (!value || value.trim() === "") return null;

  const trimmed = value.trim();

  if (ARABIC_REGEX.test(trimmed)) {
    return "validation.email_no_arabic";
  }

  if (!/^[A-Z]/.test(trimmed)) {
    return "validation.email_first_letter_capital";
  }

  if (!trimmed.includes("@")) {
    return "validation.email_missing_at";
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2 || !parts[1] || !parts[1].includes(".")) {
    return "validation.email_invalid_domain";
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return "validation.email_invalid_format";
  }

  return null;
}

/**
 * Sanitize email input:
 *  - Block Arabic characters as they are typed
 *  - Auto-capitalize the first character
 */
export function sanitizeEmailInput(value) {
  let sanitized = value.replace(ARABIC_REGEX, "");
  if (sanitized.length > 0 && /^[a-z]/.test(sanitized)) {
    sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }
  return sanitized;
}
