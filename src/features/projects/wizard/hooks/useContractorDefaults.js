import { useEffect } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { api } from "../../../../services/api";
import { logger } from "../../../../utils/logger";

// Module-level cache keyed by tenant id — survives re-mounts within the same page session
const _cache = {}; // { [tenantId]: data }
let _fetchPromise = null;

function getTenantSettings(tenantId) {
  if (_cache[tenantId]) return Promise.resolve(_cache[tenantId]);
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = api.get("auth/tenant-settings/current/")
    .then(({ data }) => {
      if (data && tenantId) _cache[tenantId] = data;
      _fetchPromise = null;
      return data;
    })
    .catch((e) => {
      _fetchPromise = null;
      throw e;
    });
  return _fetchPromise;
}

/**
 * Loads contractor defaults from TenantSettings and applies them to the form.
 * Uses a module-level cache so re-mounting the component never shows empty fields.
 * TenantSettings is the single source of truth for contractor data.
 */
export default function useContractorDefaults(projectId, setF, fieldMap) {
  const { user } = useAuth();

  // الشركة = المقاول — always read from company fields directly
  const mapping = fieldMap || {
    company_name: "contractor_name",
    contractor_name_en: "contractor_name_en",
    company_license_number: "contractor_license_no",
    company_phone: "contractor_phone",
    company_email: "contractor_email",
  };

  useEffect(() => {
    if (!user?.tenant) return;

    let mounted = true;

    // Apply settings to form fields
    const applySettings = (data) => {
      if (!mounted || !data) return;
      Object.entries(mapping).forEach(([tenantKey, formKey]) => {
        const value = data[tenantKey] || "";
        if (value) setF(formKey, value);
      });
    };

    const tenantId = user.tenant?.id || user.tenant;

    // Apply from cache immediately if available (no flicker)
    if (_cache[tenantId]) {
      applySettings(_cache[tenantId]);
    }

    // Always fetch to ensure freshness
    getTenantSettings(tenantId)
      .then(applySettings)
      .catch((e) => logger.error("[useContractorDefaults] Error loading contractor defaults", e));

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenant?.id]);
}
