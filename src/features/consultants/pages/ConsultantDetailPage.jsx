import { useParams, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { consultantApi, projectApi } from "../../../services";
import { logger } from "../../../utils/logger";
import { useState, useEffect, useCallback } from "react";
import PageLayout from "../../../components/layout/PageLayout";
import Button from "../../../components/common/Button";
import ViewRow from "../../../components/forms/ViewRow";
import {
  ProfileIdentityCard,
  ProfileLayout,
  ProfilePageHeader,
  ProfilePanel,
} from "../../../components/profile/ProfileLayout";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBriefcase,
  FaBuilding,
  FaEdit,
  FaFolderOpen,
  FaPen,
  FaPhone,
} from "react-icons/fa";
import "./ConsultantDetailPage.css";
import useTenantNavigate from "../../../hooks/useTenantNavigate";

export default function ConsultantDetailPage() {
  const { consultantId } = useParams();
  const location = useLocation();
  const navigate = useTenantNavigate();
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");

  const [consultantData, setConsultantData] = useState(location.state?.consultantData || null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConsultant = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await consultantApi.getById(consultantId);
      setConsultantData(data);

      if (data.projects && Array.isArray(data.projects)) {
        const projectDetails = await Promise.all(
          data.projects.map(async (projectConsultant) => {
            try {
              const projectData = await projectApi.getById(projectConsultant.project_id);
              return { ...projectConsultant, ...projectData };
            } catch {
              return projectConsultant;
            }
          })
        );

        const projectMap = new Map();
        projectDetails.forEach((project) => {
          const projectId = project.project_id || project.id;
          if (!projectId) return;
          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, { ...project, roles: new Set() });
          }
          projectMap.get(projectId).roles.add(project.role);
        });

        setProjects(
          Array.from(projectMap.values()).map((project) => ({
            ...project,
            roles: Array.from(project.roles),
          }))
        );
      } else {
        setProjects([]);
      }
    } catch (e) {
      logger.error("Error loading consultant", e);
      setError(t("consultant_data_not_found"));
    } finally {
      setLoading(false);
    }
  }, [consultantId, t]);

  useEffect(() => {
    loadConsultant();
  }, [loadConsultant]);

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

  const primaryName = isAR
    ? consultantData.name || consultantData.name_en || t("empty_value")
    : consultantData.name_en || consultantData.name || t("empty_value");
  const secondaryName = isAR
    ? consultantData.name_en && consultantData.name_en !== consultantData.name ? consultantData.name_en : ""
    : consultantData.name && consultantData.name !== consultantData.name_en ? consultantData.name : "";
  const secondaryLabel = isAR ? t("consultant_name_en") : t("consultant_name_ar");

  const sidebar = (
    <ProfileIdentityCard
      avatar={
        <div className="consultant-detail__avatar">
          <FaBuilding className="consultant-detail__avatar-building" />
          <FaBriefcase className="consultant-detail__avatar-badge" />
        </div>
      }
      name={primaryName}
      role={t("consultant_singular", "Consultant")}
      email={consultantData.email}
    />
  );

  return (
    <PageLayout>
      <div className="consultant-detail-page">
        <ProfileLayout
          dir={isAR ? "rtl" : "ltr"}
          sidebar={sidebar}
          header={
            <ProfilePageHeader
              title={primaryName}
              subtitle={t("consultant_profile_subtitle", "Consultant profile, contact details and related projects")}
              backIcon={isAR ? <FaArrowRight /> : <FaArrowLeft />}
              onBack={() => navigate("/consultants")}
            />
          }
        >
          <ProfilePanel
            icon={<FaBuilding />}
            title={t("consultant_details")}
            subtitle={secondaryName ? `${secondaryLabel}: ${secondaryName}` : t("consultant_profile_details_hint", "Company identity and registration details")}
            actions={
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/consultants/${consultantData.id}/edit`)}
                startIcon={<FaEdit />}
                className="consultant-detail__primary-action"
              >
                {t("edit")}
              </Button>
            }
          >
            <div className="consultant-detail__details-grid">
              <ViewRow label={t("consultant_name")} value={primaryName} />
              {secondaryName && <ViewRow label={secondaryLabel} value={secondaryName} />}
              {consultantData.municipality_license && (
                <ViewRow
                  label={t("consultant_municipality_license")}
                  value={consultantData.municipality_license}
                />
              )}
              {consultantData.fab_registration && (
                <ViewRow
                  label={t("consultant_fab_registration")}
                  value={consultantData.fab_registration}
                />
              )}
            </div>
          </ProfilePanel>

          <ProfilePanel
            icon={<FaPhone />}
            title={t("contact_info")}
            subtitle={t("consultant_contact_subtitle", "Phone, email and office location")}
          >
            <div className="consultant-detail__details-grid">
              {consultantData.phone && <ViewRow label={t("phone")} value={consultantData.phone} />}
              {consultantData.office_phone && (
                <ViewRow label={t("consultant_office_phone")} value={consultantData.office_phone} />
              )}
              {consultantData.email && <ViewRow label={t("email")} value={consultantData.email} />}
              {consultantData.address && <ViewRow label={t("address")} value={consultantData.address} />}
              {consultantData.notes && (
                <div className="consultant-detail__span-all">
                  <ViewRow label={t("notes")} value={consultantData.notes} />
                </div>
              )}
            </div>
          </ProfilePanel>

          {consultantData.signature_url && (
            <ProfilePanel
              icon={<FaPen />}
              title={t("signature")}
              subtitle={t("consultant_signature_subtitle", "Registered consultant signature")}
            >
              <div className="consultant-detail__signature-wrap">
                <img
                  src={consultantData.signature_url}
                  alt={t("signature")}
                  className="consultant-detail__signature-img"
                />
              </div>
            </ProfilePanel>
          )}

          <ProfilePanel
            icon={<FaFolderOpen />}
            title={`${t("projects")} (${projects.length})`}
            subtitle={t("consultant_projects_subtitle", "Projects connected to this consultant")}
          >
            {projects.length === 0 ? (
              <p className="consultant-detail__empty">{t("no_projects_found")}</p>
            ) : (
              <div className="consultant-detail__table-wrap">
                <table className="prj-table consultant-detail__table">
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
                    {projects.map((project) => {
                      const projectId = project.project_id || project.id;
                      return (
                        <tr key={projectId}>
                          <td>
                            <div className="ds-font-medium">
                              {isAR
                                ? (
                                    project.project_name ||
                                    project.name ||
                                    project.display_name ||
                                    project.project_name_en ||
                                    `Project #${projectId}`
                                  )
                                : (
                                    project.project_name_en ||
                                    project.name_en ||
                                    project.display_name_en ||
                                    project.project_name ||
                                    project.name ||
                                    project.display_name ||
                                    `Project #${projectId}`
                                  )}
                            </div>
                          </td>
                          <td><code>{project.internal_code || `PRJ-${projectId}`}</code></td>
                          <td>
                            <div className="consultant-detail__roles">
                              {(project.roles || [project.role]).map((role) => (
                                <span key={role} className="prj-badge is-on">
                                  {role === "design" ? t("design_consultant") : t("supervision_consultant")}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>{project.project_type || t("empty_value")}</td>
                          <td>
                            <div className="consultant-detail__table-actions">
                              <Button as={Link} to={`/projects/${projectId}`} variant="primary" size="sm">
                                {t("view")}
                              </Button>
                              <Button as={Link} to={`/projects/${projectId}/wizard`} variant="ghost" size="sm">
                                {t("edit")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ProfilePanel>
        </ProfileLayout>
      </div>
    </PageLayout>
  );
}
