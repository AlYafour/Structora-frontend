import { useEffect, useMemo, useState } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import { formatInternalCode } from "../../../utils/formatters/id";
import { getProjectStatusLabel, getProjectStatusColor } from "../../../utils/ui/status";
import { enrichProjectsWithTranslations } from "../utils/projectHelpers";
import { logger } from "../../../utils/logger";
import "./PendingApprovalsPage.css";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

/**
 * صفحة موافقات المدير - تعرض المشاريع في حالة pending
 */
export default function PendingApprovalsPage() {
 const { t, i18n } = useTranslation();
 const navigate = useTenantNavigate();
 const isAR = /^ar\b/i.test(i18n.language || "");
 const [projects, setProjects] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 loadProjects();
 }, []);

 const loadProjects = async () => {
 try {
 setLoading(true);
 const { data } = await api.get("projects/?approval_status=pending&include=siteplan,license,contract,awarding");
 const items = Array.isArray(data) ? data : (data?.results || data?.items || data?.data || []);
 setProjects(enrichProjectsWithTranslations(items, t));
 } catch (e) {
 logger.error("Error loading pending approvals", e);
 setProjects([]);
 } finally {
 setLoading(false);
 }
 };

 const getOwnerLabel = (p) =>
 p?.__owner_label ||
 (p?.display_name 
 ? `${t("villa_mr_ms")} ${p.display_name}`
 : t("villa_mr_ms_empty"));

 const getConsultantName = (p) =>
 p?.__consultant_name || p?.consultant?.name || p?.consultant_name || t("empty_value");

 return (
 <PageLayout loading={loading} loadingText={t("loading")}>
 <div className="container ds-p-6">
 {/* Header */}
 <div className="ds-mb-6">
 <h1 className="ds-text-xl ds-font-semibold ds-mb-2">
 {t("pending_approvals")}
 </h1>
 <p className="ds-text-sm ds-text-muted">
 {t("pending_approvals_description")}
 </p>
 </div>

 {/* Projects Table */}
 {projects.length === 0 ? (
 <div className="ds-text-center ds-p-10 pending-approvals__empty-state">
 <div className="ds-mb-4 pending-approvals__empty-icon">📋</div>
 <h3 className="ds-font-semibold ds-mb-2 pending-approvals__empty-title">
 {t("no_pending_approvals")}
 </h3>
 <p className="ds-text-sm ds-text-muted">
 {t("no_pending_approvals_description")}
 </p>
 </div>
 ) : (
 <div className="pending-approvals__table-wrapper">
 <table className="pending-approvals__table">
 <thead>
 <tr className="pending-approvals__header-row">
 <th className="ds-text-left ds-font-semibold ds-text-sm ds-py-3 ds-px-4">#</th>
 <th className="ds-text-left ds-font-semibold ds-text-sm ds-py-3 ds-px-4">
 {t("project_view_internal_code").replace(":", "")}
 </th>
 <th className="ds-text-left ds-font-semibold ds-text-sm ds-py-3 ds-px-4">
 {t("project_name")}
 </th>
 <th className="ds-text-left ds-font-semibold ds-text-sm ds-py-3 ds-px-4">
 {t("owner")}
 </th>
 <th className="ds-text-left ds-font-semibold ds-text-sm ds-py-3 ds-px-4">
 {t("consultant")}
 </th>
 <th className="ds-text-left ds-font-semibold ds-text-sm ds-py-3 ds-px-4">
 {t("project_status")}
 </th>
 <th className="ds-text-left ds-font-semibold ds-text-sm ds-py-3 ds-px-4">
 {t("action")}
 </th>
 </tr>
 </thead>
 <tbody>
 {projects.map((p, index) => {
 const title = p?.display_name || p?.name || `${t("wizard_project_prefix")} #${p?.id ?? index + 1}`;
 const statusDisplay = p?.status ? {
 label: getProjectStatusLabel(p.status, i18n.language),
 color: getProjectStatusColor(p.status),
 } : { label: t("empty_value"), color: "#6b7280" };

 return (
 <tr
 key={p.id}
 className="pending-approvals__row"
 >
 <td className="ds-text-sm ds-py-3 ds-px-4">{index + 1}</td>
 <td className="ds-text-sm ds-py-3 ds-px-4">
 {p?.internal_code ? (
 <code className="pending-approvals__code">
 {formatInternalCode(p.internal_code)}
 </code>
 ) : (
 <span className="ds-text-muted">{t("empty_value")}</span>
 )}
 </td>
 <td className="ds-text-sm ds-font-medium ds-py-3 ds-px-4">
 {title}
 </td>
 <td className="ds-text-sm ds-py-3 ds-px-4">
 {getOwnerLabel(p)}
 </td>
 <td className="ds-text-sm ds-py-3 ds-px-4">
 {getConsultantName(p)}
 </td>
 <td className="ds-text-sm ds-py-3 ds-px-4">
 <div className="ds-flex ds-items-center ds-gap-2">
 <span
 className="pending-approvals__status-dot"
 style={{ backgroundColor: statusDisplay.color }}
 />
 <span>{statusDisplay.label}</span>
 </div>
 </td>
 <td className="ds-text-sm ds-py-3 ds-px-4">
 <Link
 to={`/projects/${p.id}`}
 className="ds-font-medium pending-approvals__review-link"
 >
 {t("review")}
 </Link>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </PageLayout>
 );
}

