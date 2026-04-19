/**
 * STRUCTORA Brand Configuration — Single Source of Truth
 *
 * Change the brand name, colors, or logo here and it updates everywhere:
 * - Admin sidebar, login page, landing page
 * - Registration page, branded loader
 * - Theme manager, MUI theme provider
 * - Company settings defaults, onboarding defaults
 *
 * The StructoraLogo SVG component is separate (components/common/StructoraLogo.jsx)
 * because it's an inline SVG icon, not the full logo image.
 */

const BRAND = Object.freeze({
  // ── Name ──
  name: "STRUCTORA",
  nameAr: "ستراكتورا",

  // ── Colors ──
  primaryColor: "#C8A84E",     // Gold
  primaryDark: "#8B7333",      // Gold dark
  secondaryColor: "#0B1629",   // Deep Navy

  // ── Logo ──
  logoPath: "/logo.png",       // Public folder asset
});

export default BRAND;
