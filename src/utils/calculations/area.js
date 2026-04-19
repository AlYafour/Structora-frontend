/**
 * Area Conversion Utilities
 * Consolidated from: areaConverters.js
 *
 * @module calculations/area
 */

/**
 * Convert square meters to square feet
 * @param {string|number} sqm - Square meters
 * @returns {number} Square feet
 */
export const sqm2ft = (sqm) => (Number(sqm) || 0) * 10.7639;

/**
 * Convert square feet to square meters
 * @param {string|number} ft - Square feet
 * @returns {number} Square meters
 */
export const ft2sqm = (ft) => (Number(ft) || 0) / 10.7639;
