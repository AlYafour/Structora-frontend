import { useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { consultantApi, projectApi } from "../../../services";
import { logger } from "../../../utils/logger";
import { useState, useEffect } from "react";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import ViewRow from "../../../components/forms/ViewRow";
import FormSection from "../../../components/forms/FormSection";
import FormGrid from "../../../components/forms/FormGrid";
import { FaArrowRight, FaArrowLeft, FaEdit, FaUser, FaPhone, FaPen, FaProjectDiagram } from "react-icons/fa";
import "./ConsultantDetailPage.css";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function ConsultantDetailPage() {
    const { consultantId } = useParams();
    const location = useLocation();
    const navigate = useTenantNavigate();
    const { t, i18n } = useTranslation();
    const isAR = /^ar\b/i.test(i18n.language || "");
    const BackArrow = isAR ? FaArrowRight : FaArrowLeft;

    const [consultantData, setConsultantData] = useState(location.state?.consultantData || null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadConsultant();
    }, [consultantId]);

    const loadConsultant = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await consultantApi.getById(consultantId);
            setConsultantData(data);

            if (data.projects && Array.isArray(data.projects)) {
                const projectDetails = await Promise.all(
                    data.projects.map(async (pc) => {
                        try {
                            const projectData = await projectApi.getById(pc.project_id);
                            return { ...pc, ...projectData };
                        } catch (e) {
                            return pc;
                        }
                    })
                );

                const projectMap = new Map();
                projectDetails.forEach((p) => {
                    const pid = p.project_id || p.id;
                    if (!pid) return;
                    if (!projectMap.has(pid)) {
                        projectMap.set(pid, { ...p, roles: new Set() });
                    }
                    projectMap.get(pid).roles.add(p.role);
                });

                const grouped = Array.from(projectMap.values()).map((p) => ({
                    ...p,
                    roles: Array.from(p.roles),
                }));

                setProjects(grouped);
            }
        } catch (e) {
            logger.error("Error loading consultant", e);
            setError(t("consultant_data_not_found"));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <PageLayout loading={true} loadingText={t("loading")} />;
    }

    if (error || !consultantData) {
        return (
            <PageLayout>
                <div className="container">
                    <div className="card">
                        <h2>{t("error")}</h2>
                        <p>{error || t("consultant_data_not_found")}</p>
                        <Button as={Link} to="/consultants" variant="primary">
                            {t("back_to_consultants")}
                        </Button>
                    </div>
                </div>
            </PageLayout>
        );
    }
    console.log(projects);
    return (
        <PageLayout>
            <div className="container">
                <div className="card">
                    {/* Header */}
                    <div className="consultant-detail__header">
                        <div className="consultant-detail__header-info">
                            <Button as={Link} to="/consultants" variant="ghost" size="sm">
                                <BackArrow
                                    className={isAR ? "ds-mr-2 consultant-detail__back-icon" : "ds-ml-2 consultant-detail__back-icon"}
                                />
                                {t("back_to_consultants")}
                            </Button>
                            <h1 className="consultant-detail__name">
                                {isAR
                                    ? (consultantData.name || consultantData.name_en || t("empty_value"))
                                    : (consultantData.name_en || consultantData.name || t("empty_value"))
                                }
                            </h1>

                            {isAR ? (
                                consultantData.name_en &&
                                consultantData.name_en !== consultantData.name && (
                                    <p className="consultant-detail__name-en">
                                        {consultantData.name_en}
                                    </p>
                                )
                            ) : (
                                consultantData.name &&
                                consultantData.name !== consultantData.name_en && (
                                    <p className="consultant-detail__name-en">
                                        {consultantData.name}
                                    </p>
                                )
                            )}
                        </div>
                        <div className="consultant-detail__header-actions">
                            <Button
                                variant="primary"
                                onClick={() => navigate(`/consultants/${consultantData.id}/edit`)}
                            >
                                <FaEdit className={isAR ? "ds-ml-2" : "ds-mr-2"} />
                                {t("edit")}
                            </Button>
                        </div>
                    </div>

                    {/* Consultant Details */}
                    <FormSection title={t("consultant_details")} icon={<FaUser />}>
                        <FormGrid cols={2}>
                            <ViewRow
                                label={t("consultant_name")}
                                value={
                                    isAR
                                        ? (consultantData.name || consultantData.name_en || t("empty_value"))
                                        : (consultantData.name_en || consultantData.name || t("empty_value"))
                                }
                            />

                            {isAR ? (
                                consultantData.name_en &&
                                consultantData.name_en !== consultantData.name && (
                                    <ViewRow
                                        label={t("consultant_name_en")}
                                        value={consultantData.name_en}
                                    />
                                )
                            ) : (
                                consultantData.name &&
                                consultantData.name !== consultantData.name_en && (
                                    <ViewRow
                                        label={t("consultant_name_ar")}
                                        value={consultantData.name}
                                    />
                                )
                            )}
                        </FormGrid>
                    </FormSection>

                    {/* Contact Information */}
                    <FormSection title={t("contact_info")} icon={<FaPhone />}>
                        <FormGrid cols={2}>
                            {consultantData.phone && (
                                <ViewRow label={t("phone")} value={consultantData.phone} />
                            )}
                            {consultantData.office_phone && (
                                <ViewRow label={t("consultant_office_phone")} value={consultantData.office_phone} />
                            )}
                            {consultantData.email && (
                                <ViewRow label={t("email")} value={consultantData.email} />
                            )}
                            {consultantData.address && (
                                <ViewRow label={t("address")} value={consultantData.address} />
                            )}
                        </FormGrid>
                        {consultantData.notes && (
                            <div className="ds-mt-4">
                                <ViewRow label={t("notes")} value={consultantData.notes} />
                            </div>
                        )}
                    </FormSection>

                    {/* Signature */}
                    {consultantData.signature_url && (
                        <FormSection title={t("signature")} icon={<FaPen />}>
                            <div className="consultant-detail__signature-wrap">
                                <img
                                    src={consultantData.signature_url}
                                    alt={t("signature")}
                                    className="consultant-detail__signature-img"
                                />
                            </div>
                        </FormSection>
                    )}

                    {/* Projects */}
                    <FormSection
                        title={`${t("projects")} (${projects.length})`}
                        icon={<FaProjectDiagram />}
                        noBorder
                    >
                        {projects.length === 0 ? (
                            <div className="prj-alert">
                                <div className="prj-alert__title">{t("no_projects_found")}</div>
                            </div>
                        ) : (
                            <div className="prj-table__wrapper">
                                <table className="prj-table">
                                    <thead>
                                        <tr>
                                            <th>{t("project_name")}</th>
                                            <th>{t("internal_code")}</th>
                                            <th>{t("role")}</th>
                                            <th>{t("project_type")}</th>
                                            <th>{t("action")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projects.map((p) => (
                                            <tr key={p.project_id || p.id}>
                                                <td>
                                                    <div className="ds-font-medium">
                                                        {isAR
                                                            ? (
                                                                p.project_name ||
                                                                p.name ||
                                                                p.display_name ||
                                                                p.project_name_en ||
                                                                `Project #${p.project_id || p.id}`
                                                            )
                                                            : (
                                                                p.project_name_en ||
                                                                p.name_en ||
                                                                p.display_name_en ||
                                                                p.project_name ||
                                                                p.name ||
                                                                p.display_name ||
                                                                `Project #${p.project_id || p.id}`
                                                            )
                                                        }
                                                    </div>

                                                    {/* {isAR ? (
                                                        p.project_name_en &&
                                                        p.project_name_en !== p.project_name && (
                                                            <div className="consultants-page__name-en">
                                                                {p.project_name_en}
                                                            </div>
                                                        )
                                                    ) : (
                                                        p.project_name &&
                                                        p.project_name !== p.project_name_en && (
                                                            <div className="consultants-page__name-en">
                                                                {p.project_name}
                                                            </div>
                                                        )
                                                    )} */}
                                                </td>
                                                <td>
                                                    <code>{p.internal_code || `PRJ-${p.project_id || p.id}`}</code>
                                                </td>
                                                <td>
                                                    <div className="ds-flex ds-gap-2 ds-flex-wrap">
                                                        {(p.roles || [p.role]).map((r) => (
                                                            <span key={r} className="prj-badge is-on">
                                                                {r === "design" ? t("design_consultant") : t("supervision_consultant")}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>{p.project_type || t("empty_value")}</td>
                                                <td>
                                                    <div className="ds-flex ds-gap-2">
                                                        <Button as={Link} to={`/projects/${p.project_id || p.id}`} variant="primary" size="sm">
                                                            {t("view")}
                                                        </Button>
                                                        <Button as={Link} to={`/projects/${p.project_id || p.id}/wizard`} variant="ghost" size="sm">
                                                            {t("edit")}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </FormSection>
                </div>
            </div>
        </PageLayout>
    );
}
