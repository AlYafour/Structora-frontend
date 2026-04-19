/**
 * String Helper Utilities
 * Consolidated from: helpers.js, inputFormatters.js
 *
 * @module helpers/string
 */

import i18n from "../../config/i18n";
import { num } from '../formatters/number.js';

// ===== String Transformation =====

/**
 * Convert string to UPPERCASE
 * @param {string} value - Value to convert
 * @returns {string} Uppercase string
 */
export const toUppercase = (value) => {
  if (!value) return "";
  return String(value).toUpperCase();
};

/**
 * Format owner name - Capitalize each word, English only
 * @param {string} value - Name to format
 * @returns {string} Formatted name
 */
export const formatOwnerName = (value) => {
  if (!value) return "";
  // Remove any non-English characters
  const englishOnly = String(value).replace(/[^a-zA-Z\s]/g, "");
  // Capitalize each word
  return englishOnly
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Convert text to human-readable label
 * @param {string} str - String to humanize
 * @returns {string} Humanized string
 */
export const humanize = (str) =>
  String(str || "")
    .replace(/\./g, " · ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Get label for field key using i18n
 * @param {string} key - Field key
 * @returns {string} Localized label
 */
export const labelForKey = (key) => {
  const last = String(key).split(".").pop();
  const tr = i18n.t(`errors.${last}`, last);
  return tr === last ? humanize(key) : tr;
};

// ===== Boolean Conversion =====

/**
 * Convert boolean to yes/no string
 * @param {boolean} value - Boolean value
 * @returns {string} "yes" or "no"
 */
export const toYesNo = (value) => (value ? "yes" : "no");

/**
 * Convert yes/no string or boolean to boolean
 * @param {string|boolean} value - Value to convert
 * @returns {boolean} Boolean value
 */
export const toBool = (value) => value === true || value === "yes";

// ===== Array Helpers =====

/**
 * Join array elements with Arabic comma separator
 * @param {Array} arr - Array to join
 * @returns {string} Joined string
 */
export const joinArr = (arr) =>
  Array.isArray(arr) ? arr.filter((v) => v != null && v !== "").join("، ") : arr;

// ===== Object Flattening =====

/**
 * Flatten nested object to key-value pairs
 * @param {Object} obj - Object to flatten
 * @param {string} [prefix=""] - Key prefix
 * @returns {Array<[string, any]>} Array of [key, value] pairs
 */
export const flattenEntries = (obj, prefix = "") => {
  const out = [];
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) return;
    const key = prefix ? `${prefix}.${k}` : k;

    if (typeof v === "object" && v && !Array.isArray(v)) {
      out.push(...flattenEntries(v, key));
    } else {
      out.push([key, joinArr(v)]);
    }
  });
  return out;
};

// ===== Error Formatting =====

/**
 * Format server errors for display with i18n support
 * @param {Object|string|Array} data - Error data from server
 * @returns {string} Formatted error message
 */
export function formatServerErrors(data) {
  if (!data) return "";
  const tErr = (k) => i18n.t(`errors.${k}`, k);

  const lines = [];
  const walk = (value, path = []) => {
    if (Array.isArray(value)) {
      if (value.every(v => typeof v !== "object")) {
        const key = path.length ? tErr(path.at(-1)) : "";
        lines.push(`• ${key ? key + ": " : ""}${value.map(String).join(" • ")}`);
        return;
      }
      value.forEach((item, i) => {
        const last = path.at(-1);
        const label = last ? `${tErr(last)} [${i}]` : `[${i}]`;
        if (typeof item !== "object") lines.push(`• ${label}: ${String(item)}`);
        else Object.entries(item || {}).forEach(([k, v]) =>
          walk(v, [...path.slice(0, -1), `${label} → ${tErr(k)}`])
        );
      });
      return;
    }
    if (typeof value === "object" && value) {
      for (const [k, v] of Object.entries(value)) walk(v, [...path, k]);
      return;
    }
    const key = path.length ? tErr(path.at(-1)) : "";
    const prefix = path.slice(0, -1)
      .map((p) => (String(p).includes("→") ? p : tErr(p)))
      .filter(Boolean)
      .join(" → ");
    const fullKey = [prefix, key].filter(Boolean).join(" → ");
    lines.push(`• ${fullKey ? fullKey + ": " : ""}${String(value)}`);
  };
  walk(data);
  return lines.join("\n");
}

// ===== Field Order =====

/**
 * Preferred order for common fields
 * Used for consistent display ordering
 */
export const PRIMARY_ORDER = [
  "owner_name_ar",
  "owner_name_en",
  "owner_name",
  "nationality",
  "id_number",
  "id_expiry_date",
  "phone",
  "email",
  "address",
  "share_possession",
  "right_hold_type",
  "share_percent",
];
