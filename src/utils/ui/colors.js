/**
 * Adjust color brightness by percentage
 * @param {string} hex - Hex color (e.g., '#0d9488')
 * @param {number} percent - Brightness adjustment (-100 to 100)
 * @returns {string} Adjusted hex color
 */
export function adjustColorBrightness(hex, percent) {
  if (!hex) return hex;
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
