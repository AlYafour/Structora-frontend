import arI from "../../locales/ar/invoices.json";
import enI from "../../locales/en/invoices.json";
import arP from "../../locales/ar/payments.json";
import enP from "../../locales/en/payments.json";

const AR = { ...arI, ...arP };
const EN = { ...enI, ...enP };

/**
 * Returns a bilingual label object {ar, en} for a given i18n key.
 * Looks up in invoices + payments locale files (ar and en).
 */
export function L(key, fallback) {
  return {
    ar: AR[key] || EN[key] || fallback || key,
    en: EN[key] || AR[key] || fallback || key,
  };
}
