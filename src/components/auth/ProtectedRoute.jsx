/**
 * ProtectedRoute Component (v3.0 — tenant-scoped)
 * Protects routes based on authentication, permissions, and tenant slug validation.
 */

import { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import BrandedLoader from '../common/BrandedLoader';
import './ProtectedRoute.css';

function AccessDenied({ message }) {
  const { t } = useTranslation();
  return (
    <div className="access-denied">
      <div className="access-denied__icon">
        🔒
      </div>
      <h2 className="access-denied__title">
        {t('access_denied', 'غير مصرح لك بالوصول')}
      </h2>
      <p className="access-denied__message">
        {message || t('access_denied_message', 'ليس لديك الصلاحية للوصول إلى هذه الصفحة.')}
      </p>
    </div>
  );
}

function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="loading-state">
      <div className="loading-state__inner">
        <BrandedLoader size={80} />
        <div className="loading-state__text">
          {t('loading', 'جاري التحميل...')}
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  permission,
  permissions = [],
  requireAll = false,
  requireAdmin = false,
  requireSuperAdmin = false,
  fallback,
  redirectTo,
  showAccessDenied = true,
}) {
  const { user, loading, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const { tenantSlug } = useParams();

  // Re-validate session on browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser && user) {
        window.location.reload();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Loading
  if (loading) {
    return <LoadingState />;
  }

  // Not authenticated
  if (!user) {
    const isAdminRoute = location.pathname.startsWith('/admin');
    const slug = tenantSlug || localStorage.getItem('tenant_slug');
    const loginPath = redirectTo || (isAdminRoute ? '/admin/login' : (slug ? `/login/${slug}` : '/'));
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Super admin trying to access tenant routes → redirect to admin
  if (user.is_superuser && !requireSuperAdmin && tenantSlug) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Tenant user accessing wrong slug → redirect to their own slug
  if (tenantSlug && !user.is_superuser) {
    const userSlug = user.tenant?.slug || localStorage.getItem('tenant_slug');
    if (userSlug && tenantSlug.toLowerCase() !== userSlug.toLowerCase()) {
      // Strip the wrong slug and re-route to correct slug
      const pathWithoutSlug = location.pathname.replace(`/${tenantSlug}`, '');
      return <Navigate to={`/${userSlug}${pathWithoutSlug}${location.search}`} replace />;
    }
  }

  // Super admin check
  if (requireSuperAdmin && !user.is_superuser) {
    if (showAccessDenied) {
      return fallback || <AccessDenied message={t('super_admin_required', 'هذه الصفحة للمدير العام فقط')} />;
    }
    const slug = localStorage.getItem('tenant_slug');
    return <Navigate to={redirectTo || (slug ? `/${slug}/dashboard` : '/')} replace />;
  }

  // Admin check
  const isCompanyAdmin = user.role?.name === 'company_super_admin' || user.role?.name === 'Admin';
  if (requireAdmin && !user.is_superuser && !user.is_staff && !isCompanyAdmin) {
    if (showAccessDenied) {
      return fallback || <AccessDenied message={t('admin_required', 'هذه الصفحة للمديرين فقط')} />;
    }
    const slug = tenantSlug || localStorage.getItem('tenant_slug');
    return <Navigate to={redirectTo || (slug ? `/${slug}/dashboard` : '/')} replace />;
  }

  // Super users bypass permission checks
  if (user.is_superuser) {
    return children;
  }

  // Permission check
  const permList = permission ? [permission] : permissions;
  if (permList.length > 0) {
    let hasAccess = false;
    if (isCompanyAdmin && requireAdmin) {
      hasAccess = true;
    } else {
      if (permList.length === 1) {
        hasAccess = hasPermission(permList[0]);
      } else if (requireAll) {
        hasAccess = hasAllPermissions(permList);
      } else {
        hasAccess = hasAnyPermission(permList);
      }
    }
    if (!hasAccess) {
      if (showAccessDenied) {
        return fallback || <AccessDenied />;
      }
      const slug = tenantSlug || localStorage.getItem('tenant_slug');
      return <Navigate to={redirectTo || (slug ? `/${slug}/dashboard` : '/')} replace />;
    }
  }

  return children;
}

export { AccessDenied, LoadingState };
