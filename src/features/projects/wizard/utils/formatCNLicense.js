/**
 * Ensures a consultant license number has the "CN-" prefix.
 * @param {string} value - Raw license number
 * @returns {string} Formatted license number with CN- prefix
 */
export default function formatCNLicense(value) {
  if (!value) return value;
  if (value.startsWith("CN-")) return value;
  return "CN-" + value.replace(/^CN-/, "");
}
