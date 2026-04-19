import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * Hook for bilingual text — returns { ar, en } for any i18n key.
 * Shared across all print templates (Invoice, Payment, PaymentClaim, ReceiptVoucher, TaxInvoice).
 *
 * @returns {(key: string, opts?: object) => { ar: string, en: string }}
 */
export default function useBilingual() {
  const { i18n } = useTranslation();

  const bil = useCallback((key, opts) => ({
    ar: i18n.t(key, { ...opts, lng: "ar" }),
    en: i18n.t(key, { ...opts, lng: "en" }),
  }), [i18n]);

  return bil;
}
