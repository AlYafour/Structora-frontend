/**
 * BrandLogo — Single unified logo component for the entire system.
 *
 * Usage:
 *   <BrandLogo type="structora" size={48} />    → STRUCTORA bars icon (admin, landing, login)
 *   <BrandLogo type="tenant" size={48} />       → Tenant logo from theme (auto-fallback to initials)
 *   <BrandLogo type="auto" size={48} />         → Auto: superuser sees STRUCTORA, tenant sees their logo
 *
 * This is the SINGLE SOURCE for all logo rendering.
 * Never render logos with raw <img> or <svg> elsewhere.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import BRAND from '../../config/brand';
import { FaTruck } from 'react-icons/fa';

/** STRUCTORA SVG bars — inline, no external file */
function StructoraSVG({ size, className }) {
  const c = BRAND.primaryColor;
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      width={size}
      height={size}
    >
      <rect x="4" y="30" width="7" height="14" rx="1.5" fill={c} opacity=".45" />
      <rect x="14" y="20" width="7" height="24" rx="1.5" fill={c} opacity=".6" />
      <rect x="24" y="10" width="7" height="34" rx="1.5" fill={c} opacity=".8" />
      <rect x="34" y="4" width="7" height="40" rx="1.5" fill={c} />
      <line x1="2" y1="46" x2="46" y2="46" stroke={c} strokeWidth="1.5" opacity=".2" />
    </svg>
  );
}

/** Initials fallback for tenant without logo */
function InitialsFallback({ name, size, className }) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  return (
    <div
      className={`brand-logo__initials ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export default function BrandLogo({
  type = 'auto',      // 'structora' | 'tenant' | 'auto'
  size = 48,
  className = '',
  logoUrl: externalLogoUrl,  // Override: pass a specific URL (e.g. from companyInfo)
  companyName,               // Override: for alt text & initials fallback
}) {
  const { user, tenantTheme } = useAuth();
  const [imgError, setImgError] = useState(false);

  // Determine resolved logo URL
  const resolvedUrl = externalLogoUrl || tenantTheme?.logo_url || null;
  const resolvedName = companyName || tenantTheme?.company_name || '';

  // Reset error when URL changes
  useEffect(() => { setImgError(false); }, [resolvedUrl]);

  // Determine what to show
  const showStructora =
    type === 'structora' ||
    (type === 'auto' && user?.is_superuser);

  // STRUCTORA logo
  if (showStructora) {
    return <StructoraSVG size={size} className={className} />;
  }

  // Tenant logo — show image if available
  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={resolvedName || 'Company'}
        className={className}
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
        loading="eager"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }

  // Tenant fallback — company initials or truck icon
  if (resolvedName) {
    return <InitialsFallback name={resolvedName} size={size} className={className} />;
  }

  return <FaTruck size={size * 0.6} className={className} style={{ color: BRAND.primaryColor }} />;
}

// Re-export StructoraSVG for backward compatibility
export { StructoraSVG as StructoraLogo };
