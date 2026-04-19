/**
 * useThemeManager — STRUCTORA unified branding
 * No dynamic tenant colors. Single brand identity: Navy + Gold (#C8A84E).
 * Still loads tenant logo + company_name from API for display purposes.
 */
import { useState, useCallback } from "react";
import { api } from "../services/api";
import { logger } from "../utils/logger";
import { isLoggedIn } from "../utils/cookies";
import { buildFileUrl } from "../utils/helpers/file";
import BRAND from "../config/brand";

/** STRUCTORA fixed theme — never overridden by tenant settings */
const STRUCTORA_THEME = {
  company_name: BRAND.name,
  logo_url: BRAND.logoPath,
  primary_color: BRAND.primaryColor,
  secondary_color: BRAND.secondaryColor,
};

/** Get initial theme — use cached tenant theme if available, otherwise STRUCTORA */
function getInitialTheme() {
  try {
    const cached = localStorage.getItem("tenant_theme");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.company_name) return parsed;
    }
  } catch { /* ignore parse errors */ }
  return STRUCTORA_THEME;
}

export default function useThemeManager(userRef) {
  const [tenantTheme, setTenantTheme] = useState(getInitialTheme);

  const loadTenantTheme = useCallback(async (useStoredAsFallback = false) => {
    try {
      if (!isLoggedIn()) {
        setTenantTheme(STRUCTORA_THEME);
        return STRUCTORA_THEME;
      }

      const response = await api.get("auth/tenant-settings/theme/");
      const themeData = response.data;

      // Tenant context: use tenant's own name & logo, NEVER STRUCTORA's
      const merged = {
        ...STRUCTORA_THEME,
        company_name: themeData?.company_name || "",
        contractor_name_en: themeData?.contractor_name_en || "",
        tenant_id: themeData?.tenant_id || null,
        logo_url: null, // Start with no logo — only set if tenant has one
      };

      // Build full logo URL from tenant settings
      if (themeData?.logo_url) {
        const fullUrl = buildFileUrl(themeData.logo_url);
        if (fullUrl) {
          merged.logo_url = fullUrl;
        }
      }

      // Fallback: try public company-info for logo
      if (!merged.logo_url) {
        try {
          const slug = localStorage.getItem("tenant_slug");
          if (slug) {
            const companyRes = await api.get(`public/company-info/${slug}/`);
            if (companyRes.data?.logo) {
              merged.logo_url = companyRes.data.logo;
            }
          }
        } catch {
          // Logo fallback is not critical
        }
      }

      // Use tenant name from user object as final fallback for company_name
      if (!merged.company_name) {
        const currentUser = userRef.current || JSON.parse(localStorage.getItem("user") || "{}");
        merged.company_name = currentUser?.tenant?.name || "";
      }

      // Ensure tenant_id
      if (!merged.tenant_id) {
        const currentUser = userRef.current || JSON.parse(localStorage.getItem("user") || "{}");
        if (currentUser?.tenant?.id) {
          merged.tenant_id = String(currentUser.tenant.id);
        }
      }

      setTenantTheme(merged);
      localStorage.setItem("tenant_theme", JSON.stringify(merged));
      return merged;
    } catch (error) {
      logger.debug("Theme load fallback", error?.message);
      // On error, use tenant name from user object — never STRUCTORA for tenant users
      const currentUser = userRef.current || JSON.parse(localStorage.getItem("user") || "{}");
      const fallback = {
        ...STRUCTORA_THEME,
        company_name: currentUser?.tenant?.name || "",
        logo_url: null,
      };
      setTenantTheme(fallback);
      return fallback;
    }
  }, [userRef]);

  const applyAdminTheme = useCallback(() => {
    // Admin uses same STRUCTORA theme — no separate admin palette
    setTenantTheme(STRUCTORA_THEME);
    localStorage.setItem("tenant_theme", JSON.stringify(STRUCTORA_THEME));
  }, []);

  const resetTheme = useCallback(() => {
    setTenantTheme(STRUCTORA_THEME);
  }, []);

  return { tenantTheme, setTenantTheme, loadTenantTheme, applyAdminTheme, resetTheme };
}
