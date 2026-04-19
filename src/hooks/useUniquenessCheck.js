import { useRef, useCallback } from "react";
import { api } from "../services/api";
import i18n from "i18next";

/**
 * Hook for checking uniqueness of phone / email / id_number across the system.
 *
 * Usage:
 *   const { checkUniqueness } = useUniquenessCheck();
 *   const result = await checkUniqueness("email", "Test@ex.com", "owner", 5);
 *   // result = { exists: true, owner_name: "أحمد", owner_type: "owner" }
 */
export default function useUniquenessCheck() {
  const abortRef = useRef(null);

  const checkUniqueness = useCallback(async (field, value, excludeType = "", excludeId = "") => {
    if (!value || !value.trim()) return { exists: false };

    // Abort previous pending request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data } = await api.get("check-uniqueness/", {
        params: {
          field,
          value: value.trim(),
          exclude_type: excludeType,
          exclude_id: excludeId,
          lang: i18n.language || "ar",
        },
        signal: controller.signal,
      });
      return data; // { exists: bool, owner_name?: string, owner_type?: string }
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") {
        return { exists: false, cancelled: true };
      }
      return { exists: false };
    }
  }, []);

  return { checkUniqueness };
}
