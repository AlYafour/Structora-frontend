/**
 * Currency Formatting Utilities
 * Consolidated from: formatters.js, numberFormatting.js
 *
 * @module formatters/currency
 */


/**
 * Get currency label based on language
 * @param {string} [lang="ar"] - Language code
 * @returns {string} "AED" for English, "د.إ" for Arabic
 */
export const getCurrencyLabel = (lang) => lang === "en" ? "AED" : "د.إ";

/**
 * Format money amount in AED
 * English: AED 1,200.50 | Arabic: د.إ 1,200.50
 * Always uses English digits (en-US locale)
 *
 * @param {string|number} value - Value to format
 * @param {Object} [options={}] - Formatting options
 * @param {boolean} [options.showDecimals=true] - Show decimal places
 * @param {string} [options.lang] - Language code ("ar"|"en"). Defaults to "ar"
 * @returns {string} Formatted money or "—" if invalid
 */
export const formatMoney = (value, options = {}) => {
  const { showDecimals = true, lang } = options;
  const label = getCurrencyLabel(lang);
  const number = Number(String(value || 0).replace(/,/g, ""));
  if (!Number.isFinite(number)) return "—";

  if (showDecimals) {
    return `${label} ${number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${label} ${Math.round(number).toLocaleString("en-US")}`;
};

/**
 * Format money with decimal places (always shows .00)
 * @param {string|number} value - Value to format
 * @returns {string} Formatted money or "—" if invalid
 */
export const formatMoneyDecimal = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(String(value).replace(/,/g, ""));
  if (isNaN(number)) return "—";
  return `د.إ ${number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

