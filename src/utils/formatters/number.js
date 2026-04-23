/**
 * Number Formatting Utilities
 * Consolidated from: formatters.js, numberFormatting.js, inputFormatters.js, helpers.js, contractFinancial.js, contractMath.js
 *
 * @module formatters/number
 */

/**
 * Convert any value to a safe number
 * @param {string|number} value - Value to convert
 * @param {number} [defaultValue=0] - Default value if conversion fails
 * @returns {number} Safe number
 */
export const num = (value, defaultValue = 0) => {
  const n = parseFloat(String(value ?? "").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(n) ? n : defaultValue;
};

/**
 * Convert value to number (alias for compatibility)
 * @param {string|number} value - Value to convert
 * @returns {number} Safe number (defaults to 0)
 */
export const n = (value) => num(value, 0);

/**
 * Round number to nearest integer
 * @param {string|number} value - Value to round
 * @returns {number} Rounded number
 */
export const round = (value) => Math.round(num(value, 0));

/**
 * Format number with thousands separators
 * @param {string|number} value - Value to format
 * @param {Object} [options={}] - Formatting options
 * @param {number} [options.decimals=2] - Number of decimal places
 * @param {string} [options.locale="en-US"] - Locale for formatting
 * @param {boolean} [options.useCommas=true] - Use comma separators
 * @returns {string} Formatted number or "—" if invalid
 */
export const formatNumber = (value, options = {}) => {
  const {
    decimals = 2,
    locale = "en-US",
    useCommas = true,
  } = options;

  if (value === null || value === undefined || value === "") return "—";

  const number = Number(String(value).replace(/,/g, ""));
  if (isNaN(number)) return "—";

  if (useCommas) {
    return number.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return number.toFixed(decimals);
};

/**
 * Format number input (for display in inputs)
 * @param {string|number} value - Value to format
 * @returns {string} Formatted number with 2 decimals
 */
export const formatNumberInput = (value) => {
  if (!value) return "";
  const number = Number(String(value).replace(/,/g, ""));
  if (isNaN(number)) return "";
  return number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Format percentage value
 * @param {string|number} value - Value to format
 * @param {Object} [options={}] - Formatting options
 * @param {number} [options.decimals=2] - Number of decimal places
 * @param {boolean} [options.showSymbol=true] - Show % symbol
 * @param {string} [options.fallback="—"] - Fallback string for invalid values
 * @returns {string} Formatted percentage or fallback if invalid
 */
export const formatPercent = (value, options = {}) => {
  const { decimals = 2, showSymbol = true, fallback = "—" } = options;

  if (value === null || value === undefined || value === "") return fallback;

  const number = Number(String(value).replace(/,/g, ""));
  if (isNaN(number)) return fallback;

  const formatted = number.toFixed(decimals);
  return showSymbol ? `${formatted}%` : formatted;
};

/**
 * Format number with commas during input (real-time)
 * @param {string} value - Value to format
 * @returns {string} Formatted number with commas
 */
export const formatNumberWithCommas = (value) => {
  if (!value) return "";

  // Remove anything that's not a digit or decimal point
  const cleaned = String(value).replace(/[^\d.]/g, "");

  // Allow only one decimal point
  const parts = cleaned.split(".");
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? "." + parts.slice(1).join("") : "";

  // Add commas to integer part
  if (integerPart) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  return integerPart + decimalPart;
};

/**
 * Remove commas from number string
 * @param {string} value - Value with commas
 * @returns {string} Value without commas
 */
export const removeCommas = (value) => {
  if (!value) return "";
  return String(value).replace(/,/g, "");
};

/**
 * Format land area (supports decimals and commas)
 * @param {string} value - Value to format
 * @returns {string} Formatted area value
 */
export const formatLandArea = (value) => {
  if (!value) return "";

  // Allow only digits, decimal point, and comma
  const cleaned = String(value)
    .replace(/[^\d.,]/g, "") // Remove anything that's not digit, dot, or comma
    .replace(/,/g, ""); // Remove commas (will add them later for formatting)

  // Allow only one decimal point
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }

  return cleaned;
};

/**
 * Convert number to Arabic words
 * @param {string|number} num - Number to convert
 * @returns {string} Arabic word representation
 */
export const numberToArabicWords = (num) => {
  if (num === null || num === undefined || num === "") return "";

  num = Number(String(num).replace(/,/g, ""));
  if (isNaN(num)) return "";

  const ones = [
    "",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
  ];
  const tens = [
    "",
    "عشرة",
    "عشرون",
    "ثلاثون",
    "أربعون",
    "خمسون",
    "ستون",
    "سبعون",
    "ثمانون",
    "تسعون",
  ];
  const teens = [
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ];

  const scales = ["", "ألف", "مليون", "مليار", "تريليون"];
  const scalesPlural = ["", "آلاف", "ملايين", "مليارات", "تريليونات"];

  if (num === 0) return "صفر";

  const parts = [];
  let scaleIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    num = Math.floor(num / 1000);

    if (chunk > 0) {
      let text = "";

      const h = Math.floor(chunk / 100);
      const t = Math.floor((chunk % 100) / 10);
      const o = chunk % 10;

      if (h === 1) text += "مائة";
      else if (h === 2) text += "مائتان";
      else if (h > 2) text += ones[h] + " مائة";

      if (h > 0 && (t > 0 || o > 0)) text += " و ";

      if (t === 1 && o > 0) {
        text += teens[o - 1];
      } else {
        if (o > 0) text += ones[o];
        if (t > 1) {
          if (o > 0) text += " و ";
          text += tens[t];
        }
        if (t === 1 && o === 0) text += tens[1];
      }

      if (scaleIndex > 0) {
        if (chunk === 1) {
          text += " " + scales[scaleIndex];
        } else if (chunk === 2) {
          text += " " + scales[scaleIndex] + "ان";
        } else if (chunk >= 3 && chunk <= 10) {
          text += " " + scalesPlural[scaleIndex];
        } else {
          text += " " + scales[scaleIndex];
        }
      }

      parts.unshift(text);
    }

    scaleIndex++;
  }

  return parts.join(" و ");
};

/**
 * Convert number to English words
 * @param {string|number} num - Number to convert
 * @returns {string} English word representation
 */
export const numberToEnglishWords = (num) => {
  if (num === null || num === undefined || num === "") return "";

  num = Number(String(num).replace(/,/g, ""));
  if (isNaN(num)) return "";

  if (num === 0) return "zero";

  const ones = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen"
  ];
  
  const tens = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"
  ];
  
  const scales = ["", "thousand", "million", "billion", "trillion"];

  const convertHundred = (n) => {
    let result = "";
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    
    if (hundred > 0) {
      result += ones[hundred] + " hundred";
      if (remainder > 0) result += " ";
    }
    
    if (remainder > 0) {
      if (remainder < 20) {
        result += ones[remainder];
      } else {
        const ten = Math.floor(remainder / 10);
        const one = remainder % 10;
        result += tens[ten];
        if (one > 0) result += "-" + ones[one];
      }
    }
    
    return result;
  };

  const parts = [];
  let scaleIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    num = Math.floor(num / 1000);

    if (chunk > 0) {
      let text = convertHundred(chunk);
      if (scaleIndex > 0) {
        text += " " + scales[scaleIndex];
      }
      parts.unshift(text);
    }

    scaleIndex++;
  }

  return parts.join(" ");
};
