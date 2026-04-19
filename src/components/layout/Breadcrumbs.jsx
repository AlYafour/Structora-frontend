import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { api } from "../../services/api";

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const { projectId } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === "ar";
  const [projectName, setProjectName] = useState(null);

  // ✅ Fetch project name (owner name) if projectId is present
  useEffect(() => {
    if (projectId) {
      let mounted = true;
      api.get(`projects/${projectId}/`)
        .then(({ data }) => {
          if (mounted && data) {
            // Use display_name which contains the owner name
            setProjectName(data.display_name || data.name || `Project #${projectId}`);
          }
        })
        .catch(() => {
          if (mounted) {
            setProjectName(`Project #${projectId}`);
          }
        });
      return () => { mounted = false; };
    }
  }, [projectId]);

  // ✅ Decode pathname for display only, but use original pathname for links
  const parts = pathname.split("/").filter(Boolean);

  const dict = {
    projects: t("bc_projects"),
    wizard: t("bc_wizard"),
    siteplan: t("bc_siteplan"),
    license: t("bc_license"),
    view: t("bc_view"),
    setup: t("bc_setup"),
    contract: t("bc_contract"),
    summary: t("bc_summary"),
    owners: t("bc_owners"),
    consultants: t("bc_consultants"),
    contractors: t("bc_contractors"),
    awarding: t("bc_awarding"),
    // Admin pages
    admin: t("bc_admin"),
    dashboard: t("bc_dashboard"),
    tenants: t("bc_tenants"),
    users: t("bc_users"),
    analytics: t("bc_analytics"),
    settings: t("bc_settings"),
    'audit-log': t("bc_audit_log"),
    'create-company': t("bc_create_company"),
  };

  // ✅ Decode each segment for display only
  const paths = parts.map((p, i) => {
    let decodedPart = p;
    try {
      decodedPart = decodeURIComponent(p);
    } catch (e) {
      decodedPart = p;
    }
    
    // ✅ If this segment is projectId, use the project name (owner name)
    let displayName = dict[decodedPart] || dict[p] || decodedPart;
    if (p === projectId && projectName) {
      displayName = projectName;
    } else if (p === projectId && !projectName) {
      // While loading, temporarily show the project number
      displayName = `Project #${p}`;
    }
    
    // ✅ Use the original (encoded) pathname for links
    const originalPath = "/" + parts.slice(0, i + 1).join("/");
    
    return {
      name: displayName,
      to: originalPath,
      last: i === parts.length - 1,
    };
  });

  if (!parts.length) return null;

  const isAdminArea = parts[0] === 'admin';
  const homePath = isAdminArea ? '/admin/dashboard' : '/dashboard';
  const homeLabel = isAdminArea ? t('bc_admin_home') : t('bc_home');

  return (
    <div className="breadcrumbs" dir={isRTL ? "rtl" : "ltr"}>
      <div className="breadcrumbs-in">
        <Link className="breadcrumbs-link" to={homePath}>
          {homeLabel}
        </Link>
        {paths.filter(p => !(isAdminArea && p.name === dict.admin)).map((p) => (
          <span key={p.to} className="breadcrumbs-item">
            <span className="breadcrumbs-sep ds-icon-gap">
              {isRTL ? '‹' : '›'}
            </span>
            {p.last ? (
              <span className="breadcrumbs-current">{p.name}</span>
            ) : (
              <Link className="breadcrumbs-link" to={p.to}>
                {p.name}
              </Link>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
