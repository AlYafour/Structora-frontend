/**
 * Progress Form Helpers
 *
 * Utility functions for form input handling, sanitization, and formatting
 */

/**
 * Sanitize percentage input (remove %, allow only numbers and decimal)
 * @param {string} value - Raw input value
 * @returns {string} Sanitized value
 */
export function sanitizePercentageInput(value) {
  // Remove % sign if user types it
  let cleanValue = value.replace('%', '').trim();

  // Remove any non-numeric characters except decimal point
  cleanValue = cleanValue.replace(/[^0-9.]/g, '');

  // Prevent multiple decimal points
  const parts = cleanValue.split('.');
  if (parts.length > 2) {
    cleanValue = parts[0] + '.' + parts.slice(1).join('');
  }

  return cleanValue;
}

/**
 * Validate and cap percentage value
 * @param {string} value - Input value to validate
 * @param {number} max - Maximum allowed value (default 100)
 * @returns {string|null} Valid value or null if invalid
 */
export function validatePercentageValue(value, max = 100) {
  if (value === '' || value === '.') {
    return value;
  }

  const numValue = parseFloat(value);

  // If not a valid number, return null
  if (isNaN(numValue)) {
    return null;
  }

  // If value exceeds max, cap it
  if (numValue > max) {
    return max.toString();
  }

  return value;
}

/**
 * Check if percentage meets minimum threshold
 * @param {number} currentValue - Current percentage value
 * @param {number} minimumValue - Minimum allowed value
 * @returns {boolean} True if valid, false otherwise
 */
export function meetsMinimumPercentage(currentValue, minimumValue) {
  return currentValue >= minimumValue;
}

/**
 * Prepare form data for submission (convert strings to numbers)
 * @param {Object} formData - Raw form data
 * @returns {Object} Processed form data with numeric values
 */
export function prepareProgressDataForSubmission(formData) {
  const data = {};

  // Overall (for backward compatibility) - optional
  if (formData.technical_progress_current) {
    data.technical_progress_current = parseFloat(formData.technical_progress_current);
  }
  if (formData.technical_progress_approved) {
    data.technical_progress_approved = parseFloat(formData.technical_progress_approved);
  }

  // Owner Bucket
  if (formData.owner_technical_current) {
    data.owner_technical_current = parseFloat(formData.owner_technical_current);
  }

  // Bank Bucket
  if (formData.bank_technical_current) {
    data.bank_technical_current = parseFloat(formData.bank_technical_current);
  }

  // Variations Bucket (overall)
  if (formData.variations_technical_current) {
    data.variations_technical_current = parseFloat(formData.variations_technical_current);
  }

  // Actual Current fields (field observation)
  if (formData.owner_actual_current) {
    data.owner_actual_current = parseFloat(formData.owner_actual_current);
  }
  if (formData.bank_actual_current) {
    data.bank_actual_current = parseFloat(formData.bank_actual_current);
  }
  if (formData.variations_actual_current) {
    data.variations_actual_current = parseFloat(formData.variations_actual_current);
  }

  // Common fields
  data.entry_date = formData.entry_date;
  data.notes = formData.notes || '';

  return data;
}
