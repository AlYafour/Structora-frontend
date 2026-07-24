import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { projectApi } from "../../../services/projects";
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
  FaCamera,
  FaEdit,
  FaFolderOpen,
  FaIdCard,
  FaUser,
} from "react-icons/fa";
import { calculateAgeFromEmiratesId } from "../../../utils/formatters/id";
import { logger } from "../../../utils/logger";
import "./OwnerDetailPage.css";

export default function OwnerDetailPage() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isAR = i18n.language === "ar";
  const [ownerData] = useState(location.state?.ownerData || null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileImage, setProfileImage] = useState("");

  const getTranslated = (value, arValue, enValue) => {
    if (!value && !arValue && !enValue) return t("empty_value");
    if (isAR && arValue) return arValue;
    if (!isAR && enValue) return enValue;
    return value || t("empty_value");
  };

  const getDisplayName = () => {
    if (!ownerData) return "";
    return getTranslated(ownerData.name, ownerData.nameAr, ownerData.nameEn);
  };

  const getProjectName = (project) => {
    if (!project) return "";

    const arabicName = project.display_name || project.name_ar || project.name;
    const englishName = project.display_name_en || project.name_en;

    return getTranslated(project.name || project.display_name, arabicName, englishName);
  };

  const getProjectType = (project) => {
    if (!project) return "";
    return getTranslated(project.project_type, project.project_type_ar, project.project_type_en);
  };

  const loadProjects = useCallback(async () => {
    if (!ownerData) return;
    setLoading(true);
    try {
      const projectDetails = await Promise.all(
        ownerData.projects.map(async (project) => {
          try {
            const data = await projectApi.getById(project.id);
            return { ...project, ...data };
          } catch {
            return project;
          }
        })
      );
      setProjects(projectDetails);
    } catch (e) {
      logger.error("Error loading projects", e);
      setError(t("error_loading_projects"));
    } finally {
      setLoading(false);
    }
  }, [ownerData, t]);

  useEffect(() => {
    if (ownerData) {
      loadProjects();
      const savedImage = localStorage.getItem(`owner_${ownerData.name}_image`);
      if (savedImage) setProfileImage(savedImage);
    } else {
      setError(t("owner_data_not_found"));
      setLoading(false);
    }
  }, [ownerData, loadProjects, t]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !ownerData) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result;
      setProfileImage(url);
      localStorage.setItem(`owner_${ownerData.name}_image`, url);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <PageLayout loading={true} loadingText={t("loading")} />;
  }

  if (error || !ownerData) {
    return (
      <PageLayout>
        <div className="container">
          <div className="card">
            <h2>{t("error")}</h2>
            <p>{error || t("owner_data_not_found")}</p>
            <Button as={Link} to="/owners" variant="primary">
              {t("back_to_owners")}
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const fullOwnerData = ownerData.fullData || {};
  const age = fullOwnerData.age ?? calculateAgeFromEmiratesId(fullOwnerData.id_number);
  const displayName = getDisplayName();
  const secondaryName = isAR ? ownerData.nameEn : ownerData.nameAr;
  const secondaryLabel = isAR ? t("owner_name_en") : t("owner_name_ar");

  const sidebar = (
    <ProfileIdentityCard
      avatar={
        <label className="owner-detail__avatar-shell">
          {profileImage ? (
            <img src={profileImage} alt={displayName} className="owner-detail__avatar-img" />
          ) : (
            <FaUser className="owner-detail__avatar-icon" />
          )}
          <span className="owner-detail__avatar-edit" aria-hidden="true">
            {profileImage ? <FaEdit /> : <FaCamera />}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="ds-hidden"
          />
        </label>
      }
      name={displayName}
      role={t("owner_singular", "Owner")}
      email={fullOwnerData.email}
      actions={
        <label className="owner-detail__upload-action">
          <Button as="span" variant="secondary" size="sm" startIcon={<FaCamera />}>
            {profileImage ? t("change_image", "Change Image") : t("upload_image")}
          </Button>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="ds-hidden"
          />
        </label>
      }
    />
  );

  return (
    <PageLayout>
      <div className="owner-detail-page">
        <ProfileLayout
          dir={isAR ? "rtl" : "ltr"}
          sidebar={sidebar}
          header={
            <ProfilePageHeader
              title={displayName}
              subtitle={t("owner_profile_subtitle", "Owner profile, identification details and related projects")}
              backIcon={isAR ? <FaArrowRight /> : <FaArrowLeft />}
              onBack={() => window.history.back()}
            />
          }
        >
          <ProfilePanel
            icon={<FaIdCard />}
            title={t("owner_details")}
            subtitle={secondaryName ? `${secondaryLabel}: ${secondaryName}` : t("owner_profile_details_hint", "Identity and contact information")}
          >
            <div className="owner-detail__details-grid">
              <ViewRow label={t("owner_name")} value={displayName} />
              {secondaryName && <ViewRow label={secondaryLabel} value={secondaryName} />}
              {fullOwnerData.nationality && (
                <ViewRow
                  label={t("nationality")}
                  value={getTranslated(
                    fullOwnerData.nationality,
                    fullOwnerData.nationality_ar,
                    fullOwnerData.nationality_en
                  )}
                />
              )}
              {fullOwnerData.id_number && (
                <ViewRow label={t("id_number")} value={fullOwnerData.id_number} />
              )}
              {age !== null && (
                <ViewRow label={t("age")} value={`${age} ${isAR ? t("year") : t("years")}`} />
              )}
              {fullOwnerData.phone && <ViewRow label={t("phone")} value={fullOwnerData.phone} />}
              {fullOwnerData.email && <ViewRow label={t("email")} value={fullOwnerData.email} />}
              {fullOwnerData.share_percent && (
                <ViewRow label={t("share_percent")} value={`${fullOwnerData.share_percent}%`} />
              )}
              {fullOwnerData.right_hold_type && (
                <ViewRow
                  label={t("right_hold_type")}
                  value={getTranslated(
                    fullOwnerData.right_hold_type,
                    fullOwnerData.right_hold_type_ar,
                    fullOwnerData.right_hold_type_en
                  )}
                />
              )}
            </div>
          </ProfilePanel>

          <ProfilePanel
            icon={<FaFolderOpen />}
            title={`${t("projects")} (${projects.length})`}
            subtitle={t("owner_projects_subtitle", "Projects connected to this owner")}
          >
            {projects.length === 0 ? (
              <p className="owner-detail__empty">{t("no_projects_found")}</p>
            ) : (
              <div className="owner-detail__table-wrap">
                <table className="prj-table owner-detail__table">
                  <thead>
                    <tr>
                      <th>{t("project_name")}</th>
                      <th>{t("internal_code")}</th>
                      <th>{t("type")}</th>
                      <th>{t("action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td>{getProjectName(project)}</td>
                        <td><code>{project.project_code || project.internal_code || `PRJ-${project.id}`}</code></td>
                        <td>{getProjectType(project) || t("empty_value")}</td>
                        <td>
                          <div className="owner-detail__table-actions">
                            <Button as={Link} to={`/projects/${project.id}`} variant="primary" size="sm">
                              {t("view")}
                            </Button>
                            <Button as={Link} to={`/projects/${project.id}/wizard`} variant="ghost" size="sm">
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
          </ProfilePanel>
        </ProfileLayout>
      </div>
    </PageLayout>
  );
}
