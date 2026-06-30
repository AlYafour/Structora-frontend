/**
 * useThemeManager — STRUCTORA unified branding
 * No dynamic tenant colors. Single brand identity: Navy + Gold (#C8A84E).
 * Still loads tenant logo + company_name from API for display purposes.
 */
import { useState, useCallback } from "react";
import { api } from "../services/api";
import { logger } from "../utils/logger";
import { buildFileUrl } from "../utils/helpers/file";
import BRAND from "../config/brand";

/** STRUCTORA admin theme — only for superuser / logged-out context */
const STRUCTORA_THEME = {
  company_name: BRAND.name,
  logo_url: BRAND.logoPath,
  primary_color: BRAND.primaryColor,
  secondary_color: BRAND.secondaryColor,
};

/** Empty theme for tenant users — fills in after loadTenantTheme() resolves */
const EMPTY_TENANT_THEME = {
  company_name: '',
  logo_url: null,
  primary_color: BRAND.primaryColor,
  secondary_color: BRAND.secondaryColor,
};

/** Get initial theme — use cached tenant theme if available and not STRUCTORA-branded */
function getInitialTheme() {
  try {
    const cached = localStorage.getItem("tenant_theme");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object' && parsed.company_name !== BRAND.name) {
        return parsed;
      }
    }
  } catch { /* ignore parse errors */ }
  return EMPTY_TENANT_THEME;
}

export default function useThemeManager(userRef) {
  const [tenantTheme, setTenantTheme] = useState(getInitialTheme);

  const loadTenantTheme = useCallback(async (useStoredAsFallback = false) => {
    try {
      // Use userRef or localStorage — cookie-based isLoggedIn() is unreliable
      // in cross-domain setups (cookie on railway.app, JS on vercel.app)
      const hasUser = userRef.current;
      if (!hasUser) {
        setTenantTheme(STRUCTORA_THEME);
        return STRUCTORA_THEME;
      }

      const response = await api.get("auth/tenant-settings/theme/");
      const themeData = response.data;

      // Tenant context: use tenant's own name & logo, NEVER STRUCTORA's
      const merged = {
        ...EMPTY_TENANT_THEME,
        company_name: themeData?.company_name || "",
        contractor_name_en: themeData?.contractor_name_en || "",
        tenant_id: themeData?.tenant_id || null,
        logo_url: null,
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
        const currentUser = userRef.current || {};
        merged.company_name = currentUser?.tenant?.name || "";
      }

      // Ensure tenant_id
      if (!merged.tenant_id) {
        const currentUser = userRef.current || {};
        if (currentUser?.tenant?.id) {
          merged.tenant_id = String(currentUser.tenant.id);
        }
      }

      // Flush any stale STRUCTORA-branded cache before saving tenant data
      const existing = localStorage.getItem("tenant_theme");
      if (existing) {
        try {
          const prev = JSON.parse(existing);
          if (prev?.company_name === BRAND.name) localStorage.removeItem("tenant_theme");
        } catch { /* ignore */ }
      }
      setTenantTheme(merged);
      localStorage.setItem("tenant_theme", JSON.stringify(merged));
      return merged;
    } catch (error) {
      logger.debug("Theme load fallback", error?.message);
      const currentUser = userRef.current || {};
      const fallback = {
        ...EMPTY_TENANT_THEME,
        company_name: currentUser?.tenant?.name || "",
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
