/**
 * useTenantNavigate — tenant-aware navigation hook
 *
 * Auto-prefixes all paths with /:tenantSlug for multi-tenant routing.
 * Admin routes (/admin/*), login routes (/login/*), and public routes are NOT prefixed.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';

const PUBLIC_PATHS = ['/', '/landing', '/pricing', '/register-company', '/onboarding'];
const PUBLIC_PREFIXES = ['/admin', '/login'];

/**
 * Check if a path should NOT be tenant-prefixed
 */
function isPublicPath(path) {
  if (PUBLIC_PATHS.includes(path)) return true;
  return PUBLIC_PREFIXES.some(p => path.startsWith(p));
}

/**
 * Returns a navigate() function that auto-prefixes tenant slug.
 *
 * Usage:
 *   const navigate = useTenantNavigate();
 *   navigate('/dashboard');      // → /alyafour/dashboard
 *   navigate('/admin/users');    // → /admin/users (no prefix)
 *   navigate(-1);                // → go back (no prefix)
 */
export default function useTenantNavigate() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const slug = tenantSlug || localStorage.getItem('tenant_slug');

  return useCallback((to, options) => {
    // Handle navigate(-1), navigate(1) etc
    if (typeof to === 'number') {
      return navigate(to, options);
    }

    if (typeof to === 'string') {
      // Don't prefix public/admin routes
      if (isPublicPath(to)) {
        return navigate(to, options);
      }
      // Already has slug prefix
      if (slug && (to.startsWith(`/${slug}/`) || to === `/${slug}`)) {
        return navigate(to, options);
      }
      // Prefix with tenant slug
      if (slug) {
        const path = to.startsWith('/') ? to : `/${to}`;
        return navigate(`/${slug}${path}`, options);
      }
    }

    // Fallback — navigate as-is
    return navigate(to, options);
  }, [navigate, slug]);
}

/**
 * Returns a function that converts a path to its tenant-scoped version.
 * Useful for <Link to={...}> and other non-imperative navigation.
 *
 * Usage:
 *   const tp = useTenantPath();
 *   <Link to={tp('/dashboard')}>Home</Link>   // → /alyafour/dashboard
 *   <Link to={tp('/admin/users')}>Users</Link> // → /admin/users (no prefix)
 */
export function useTenantPath() {
  const { tenantSlug } = useParams();
  const slug = tenantSlug || localStorage.getItem('tenant_slug');

  return useCallback((path) => {
    if (!path || !slug || isPublicPath(path)) return path;
    if (path.startsWith(`/${slug}/`) || path === `/${slug}`) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `/${slug}${p}`;
  }, [slug]);
}

/**
 * Get the tenant slug from URL params or localStorage.
 */
export function useTenantSlug() {
  const { tenantSlug } = useParams();
  return tenantSlug || localStorage.getItem('tenant_slug') || '';
}

/**
 * Strip tenant slug from a pathname to get the "logical" path.
 * e.g. "/alyafour/dashboard" → "/dashboard"
 */
export function stripTenantSlug(pathname, slug) {
  if (!slug) return pathname;
  const prefix = `/${slug}`;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(prefix + '/')) {
    return pathname.slice(prefix.length);
  }
  return pathname;
}
