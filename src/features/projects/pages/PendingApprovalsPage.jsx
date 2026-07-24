import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import PageLayout from "../../../components/layout/PageLayout";
import { formatInternalCode } from "../../../utils/formatters/id";
import { getProjectStatusLabel, getProjectStatusColor } from "../../../utils/ui/status";
import { enrichProjectsWithTranslations } from "../utils/projectHelpers";
import { logger } from "../../../utils/logger";
import "./PendingApprovalsPage.css";
import useTenantNavigate from "../../../hooks/useTenantNavigate";
import PageHeader from "../../../components/layout/PageHeader";

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

            const { data } = await api.get(
                "projects/?approval_status=pending&include=siteplan,license,contract,awarding"
            );
            const items = Array.isArray(data)
                ? data
                : data?.results || data?.items || data?.data || [];

            setProjects(enrichProjectsWithTranslations(items, t));
        } catch (e) {
            logger.error("Error loading pending approvals", e);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const pickLang = (ar, en, fallback = t("empty_value")) => {
        if (isAR) {
            return ar || en || fallback;
        }

        return en || ar || fallback;
    };

    const getOwnerName = (p) => {
        const owner = p?.siteplan_data?.owners?.[0] || p?.__owners_data?.[0];

        return pickLang(
            owner?.owner_name_ar || p?.name,
            owner?.owner_name_en || p?.display_name_en || p?.display_name,
            ""
        );
    };

    const getOwnerLabel = (p) => {
        const ownerName = getOwnerName(p);

        return ownerName
            ? `${t("villa_mr_ms")} ${ownerName}`
            : t("villa_mr_ms_empty");
    };

    const getProjectName = (p, index) => {
        const ownerName = getOwnerName(p);

        if (ownerName) {
            return `${t("villa_mr_ms")} ${ownerName}`;
        }

        return pickLang(
            p?.name,
            p?.display_name_en || p?.display_name,
            `${t("wizard_project_prefix")} #${p?.id ?? index + 1}`
        );
    };

    const getConsultantName = (p) => {
        const license = p?.license_data;

        return pickLang(
            p?.__consultant_name_ar ||
            license?.design_consultant?.name ||
            license?.supervision_consultant?.name ||
            license?.design_consultant_name ||
            p?.consultant?.name ||
            p?.consultant_name,

            p?.__consultant_name_en ||
            license?.design_consultant?.name_en ||
            license?.supervision_consultant?.name_en ||
            license?.design_consultant_name_en ||
            p?.consultant?.name_en ||
            p?.consultant_name_en
        );
    };

    return (
        <PageLayout loading={loading} loadingText={t("loading")}>
            <div className="container ds-p-6">
                <PageHeader
                    onBack={() => navigate(-1)}
                    title={t("pending_approvals")}
                    subtitle={t("pending_approvals_description")}
                />

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
                                    <th className="ds-text-left ds-font-semibold ds-text-sm ds-py-3 ds-px-4">
                                        #
                                    </th>

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
                                    const title = getProjectName(p, index);

                                    const statusDisplay = p?.status
                                        ? {
                                            label: getProjectStatusLabel(
                                                p.status,
                                                i18n.language
                                            ),
                                            color: getProjectStatusColor(p.status),
                                        }
                                        : {
                                            label: t("empty_value"),
                                            color: "#6b7280",
                                        };

                                    return (
                                        <tr key={p.id} className="pending-approvals__row">
                                            <td className="ds-text-sm ds-py-3 ds-px-4">
                                                {index + 1}
                                            </td>

                                            <td className="ds-text-sm ds-py-3 ds-px-4">
                                                {p?.project_code || p?.internal_code ? (
                                                    <code className="pending-approvals__code">
                                                        {formatInternalCode(p.project_code || p.internal_code)}
                                                    </code>
                                                ) : (
                                                    <span className="ds-text-muted">
                                                        {t("empty_value")}
                                                    </span>
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
                                                        style={{
                                                            backgroundColor:
                                                                statusDisplay.color,
                                                        }}
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
