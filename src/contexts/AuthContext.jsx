import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { logger } from '../utils/logger';
import useThemeManager from '../hooks/useThemeManager';
import useAdminSessionGuard from '../hooks/useAdminSessionGuard';

const AuthContext = createContext(null);

const apiClient = api;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use useRef to store the latest user value without causing re-render
  const userRef = useRef(null);

  // Update userRef when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Extract theme management into dedicated hook
  const { tenantTheme, setTenantTheme, loadTenantTheme, applyAdminTheme, resetTheme } = useThemeManager(userRef);

  // Load user data on mount — check cookie signal then verify with API
  useEffect(() => {
    const loadInitialData = async () => {
      const storedUser = localStorage.getItem('user');
      const storedPermissions = localStorage.getItem('permissions');

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);

          // If we have stored user data, trust it initially and verify with API in background
          // This fixes cross-domain cookie issues where is_logged_in cookie
          // is set on API domain but not readable from frontend domain
          setUser(userData);

          if (storedPermissions) {
            setPermissions(JSON.parse(storedPermissions));
          } else if (userData.permissions) {
            setPermissions(userData.permissions);
          }

          userRef.current = userData;

          // Load theme immediately after loading user
          if (userData.is_superuser) {
            localStorage.removeItem('tenant_theme');
            localStorage.removeItem('tenant_id');
            setTenantTheme(null);
            applyAdminTheme();
          } else if (userData.tenant) {
            try {
              await loadTenantTheme(true);
            } catch (err) {
              // Silent fail
            }
          }

          // Verify session is still valid with API (in background)
          try {
            const response = await apiClient.get('auth/users/profile/', {
              _skipAuthRedirect: true,
            });
            const freshData = response.data;
            setUser(freshData);
            setPermissions(freshData.permissions || []);
            localStorage.setItem('user', JSON.stringify(freshData));
            localStorage.setItem('permissions', JSON.stringify(freshData.permissions || []));
            userRef.current = freshData;
          } catch (verifyErr) {
            // If API returns 401, the session is truly expired - clear everything
            if (verifyErr?.response?.status === 401) {
              localStorage.removeItem('user');
              localStorage.removeItem('permissions');
              localStorage.removeItem('tenant_theme');
              setUser(null);
              setPermissions([]);
              userRef.current = null;
            }
            // For other errors (network, 500), keep the stored user data
          }
        } catch (e) {
          localStorage.removeItem('user');
          localStorage.removeItem('permissions');
          localStorage.removeItem('tenant_theme');
        }
      }

      setLoading(false);
    };

    loadInitialData();
  }, []); // Runs only once on mount

  // Separate theme loading when user state changes
  useEffect(() => {
    if (!user) {
      return;
    }

    if (tenantTheme && tenantTheme.tenant_id === String(user?.tenant?.id)) {
      logger.debug('Theme already loaded for this tenant, skipping');
      return;
    }

    logger.debug('useEffect triggered for theme load', {
      userEmail: user?.email,
      tenantId: user?.tenant?.id
    });

    if (user.is_superuser) {
      logger.debug('Super Admin detected, applying admin theme');
      localStorage.removeItem('tenant_theme');
      localStorage.removeItem('tenant_id');
      setTenantTheme(null);
      applyAdminTheme();
    } else if (user.tenant) {
      logger.debug('Tenant User detected, loading theme from API', { tenantId: user.tenant.id });

      loadTenantTheme(true)
        .then((theme) => {
          if (theme) {
            logger.debug('Theme loaded successfully', {
              company_name: theme.company_name,
              logo_url: theme.logo_url ? 'Present' : 'Missing',
              primary_color: theme.primary_color,
              secondary_color: theme.secondary_color,
            });
          } else {
            logger.warn('Theme load returned null/undefined');
          }
        })
        .catch(err => {
          logger.error('Failed to load tenant theme from API', err);
        });
    } else {
      logger.warn('User has no tenant, skipping theme load');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenant?.id]);

  // Refresh user data from API
  const refreshUser = async () => {
    const response = await apiClient.get('auth/users/profile/');
    const freshData = response.data;

    // Preserve tenant from current user if the profile endpoint didn't return it
    // (guards against ProfileSerializer not including tenant in some edge cases)
    const currentUser = userRef.current;
    const userData = {
      ...freshData,
      tenant: freshData.tenant || currentUser?.tenant || null,
    };

    setUser(userData);
    setPermissions(userData.permissions || []);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('permissions', JSON.stringify(userData.permissions || []));

    if (userData.preferred_language && (userData.preferred_language === 'ar' || userData.preferred_language === 'en')) {
      try {
        const { default: i18n } = await import('../config/i18n');
        // if (i18n.language !== userData.preferred_language) {
        //   i18n.changeLanguage(userData.preferred_language);
        // }
      } catch { /* i18n import may fail during SSR or test */ }
    }

    if (userData.is_superuser) {
      applyAdminTheme();
    } else if (userData.tenant) {
      await loadTenantTheme(false);
    }

    return userData;
  };

  // Login
  const login = async (email, password) => {
    try {
      const response = await apiClient.post('auth/login/', {
        email,
        password,
      });

      // Tokens are now in httpOnly cookies — only user data comes in JSON
      const { user: userData, role, tenant_id, tenant_slug, is_super_admin } = response.data;

      // Save non-sensitive data to localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('permissions', JSON.stringify(userData.permissions || []));
      localStorage.setItem('user_role', role);
      localStorage.setItem('is_super_admin', is_super_admin ? 'true' : 'false');

      // Load theme based on user type
      if (is_super_admin || userData.is_superuser) {
        localStorage.removeItem('tenant_theme');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('tenant_slug');
        setTenantTheme(null);
        applyAdminTheme();
      } else if (userData.tenant) {
        if (tenant_id) {
          localStorage.setItem('tenant_id', tenant_id);
        }

        const slug = tenant_slug || userData.tenant?.slug;
        if (slug) {
          localStorage.setItem('tenant_slug', slug);
        } else if (userData.tenant?.name) {
          const generatedSlug = userData.tenant.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          localStorage.setItem('tenant_slug', generatedSlug);
        }

        await loadTenantTheme(false);
      }

      setUser(userData);
      setPermissions(userData.permissions || []);

      if (userData.preferred_language && (userData.preferred_language === 'ar' || userData.preferred_language === 'en')) {
        try {
          const { default: i18n } = await import('../config/i18n');
          // if (i18n.language !== userData.preferred_language) {
          //   i18n.changeLanguage(userData.preferred_language);
          // }
        } catch (e) {
          // Silent fail
        }
      }

      return {
        success: true,
        user: userData,
        role,
        tenant_id,
        tenant_slug: tenant_slug || userData.tenant?.slug,
        is_super_admin
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.detail || 'Login failed',
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Server reads refresh_token from cookie and clears all auth cookies
      try {
        await apiClient.post('auth/users/logout/', {}, {
          validateStatus: (status) => status < 500,
        });
      } catch (error) {
        // Ignore errors on logout - continue logout process
      }
    } catch (error) {
      // Ignore errors - continue in finally
    } finally {
      // Save user type before clearing data
      const isSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
      const tenantSlug = localStorage.getItem('tenant_slug');

      // Clear all session data
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
      localStorage.removeItem('tenant_theme');
      localStorage.removeItem('tenant_id');
      localStorage.removeItem('tenant_slug');
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_super_admin');
      sessionStorage.removeItem('admin_last_activity');

      setUser(null);
      setPermissions([]);
      resetTheme();

      // Redirect based on user type
      if (isSuperAdmin) {
        window.location.href = '/admin/login';
      } else if (tenantSlug) {
        window.location.href = `/login/${tenantSlug}`;
      } else {
        window.location.href = '/';
      }
    }
  };

  // Admin session idle timeout (30 min)
  useAdminSessionGuard(user, logout);

  // ─── Permission helpers ───────────────────────────────────
  // ─── Permission helpers ───────────────────────────────────
const hasPermission = (permissionCode) => {
  if (!user) return false;
  if (user.is_superuser) return true;

  // Handle singular ↔ plural mismatch (project vs projects)
  const altCode = permissionCode.endsWith('s')
    ? permissionCode.slice(0, -1)
    : permissionCode + 's';

  return (
    permissions.includes(permissionCode) ||
    permissions.includes(altCode)
  );
};

const hasAnyPermission = (permissionCodes) =>
  permissionCodes.some(code => hasPermission(code));

const hasAllPermissions = (permissionCodes) =>
  permissionCodes.every(code => hasPermission(code));

// ─── Role shortcut helpers ────────────────────────────────
const roleName = user?.role?.name || null;

/** True for company_super_admin and Admin (full company access) */
const isCompanyAdmin = !!(
  user && !user.is_superuser &&
  (roleName === 'company_super_admin' || roleName === 'Admin')
);

/** True for any admin-level user (super or company) */
const isAdmin = !!(user && (user.is_superuser || isCompanyAdmin));

/** Can manage roles and users */
const canManageRoles = isAdmin || hasPermission('roles.view');
const canManageUsers = isAdmin || hasPermission('users.view');

  const value = {
    user,
    permissions,
    loading,
    tenantTheme,
    login,
    logout,
    refreshUser,
    loadTenantTheme,
    // Permission helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // Role shortcuts
    roleName,
    isCompanyAdmin,
    isAdmin,
    canManageRoles,
    canManageUsers,
    apiClient,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Export apiClient for direct use
export { apiClient };
