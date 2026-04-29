import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";
import { formatDate } from "../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";

const LicenseTab = memo(function LicenseTab({
  projectId,
  license,
  projectPermissions,
}) {
  const { t, i18n } = useTranslation();
  const hasLicense = !!license;
  const isAR = i18n.language === "ar";

  const getTranslated = (value, arValue, enValue) => {
    if (!value) return t("empty_value");
    if (isAR && arValue) return arValue;
    if (!isAR && enValue) return enValue;
    return value;
  };

  const LICENSE_TYPES = [
    { value: "new_build_empty_land", label: t("license_type_new_build") },
    { value: "new_build_existing", label: t("license_type_new_build_existing") },
    { value: "extension", label: t("license_type_extension") },
    { value: "renovation", label: t("license_type_renovation") },
  ];

  const getLicenseTypeLabel = (value) => {
    if (!value) return "";
    const type = LICENSE_TYPES.find((x) => x.value === value);
    return type?.label || value;
  };

  const bannerActions = (
    <div className="overview-ribbon__hero-actions">
      <Button
        as={Link}
        to={`/projects/${projectId}/wizard?step=license&mode=view&sectionOnly=true`}
        variant="secondary"
        size="md"
      >
        {t("view")}
      </Button>

      <Button
        as={Link}
        to={`/projects/${projectId}/wizard?step=license&mode=edit&sectionOnly=true`}
        variant="primary"
        size="md"
        disabled={!projectPermissions?.can_edit}
      >
        {t("edit")}
      </Button>
    </div>
  );

  const RibbonInfoCard = ({
    label,
    value,
    isLast = false,
    mono = false,
  }) => {
    const hasValue = value !== null && value !== undefined && value !== "";

    return (
      <div
        className={`overview-ribbon__slot ${
          isLast ? "overview-ribbon__slot--last" : ""
        }`}
      >
        <div className="overview-ribbon__slot-label">{label}</div>
        <div
          className={`overview-ribbon__slot-value ${
            mono ? "overview-ribbon__slot-value--mono" : ""
          }`}
        >
          {hasValue ? value : t("empty_value")}
        </div>
      </div>
    );
  };

  if (!hasLicense) {
    return (
      <div className="prj-tab-panel">
        <div className="prj-tab-header">
          <div className="prj-tab-actions ds-flex ds-gap-3" />
        </div>

        <div className="overview-ribbon ds-mt-6">
          <div
            className="overview-ribbon__hero"
            style={{ backgroundImage: "url('/construction-1.jpg')" }}
          >
            <div className="overview-ribbon__hero-overlay" />

            {bannerActions}

            <div className="overview-ribbon__hero-label">
              ▲ LICENSE · {t("license")}
            </div>

            <div className="overview-ribbon__hero-content">
              <div className="overview-ribbon__hero-title">{t("license")}</div>
              <div className="overview-ribbon__hero-subtitle">
                · {t("license_not_added")}
              </div>
            </div>
          </div>
        </div>

        <div className="prj-empty-state">{t("license_not_added")}</div>
      </div>
    );
  }

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions ds-flex ds-gap-3" />
      </div>

      <div className="overview-ribbon ds-mt-6">
        <div
          className="overview-ribbon__hero"
          style={{ backgroundImage: "url('/construction-1.jpg')" }}
        >
          <div className="overview-ribbon__hero-overlay" />

          {bannerActions}

          <div className="overview-ribbon__hero-label">
            ▲ LICENSE · {getLicenseTypeLabel(license?.license_type) || t("license")}
          </div>

          <div className="overview-ribbon__hero-content">
            <div className="overview-ribbon__hero-title">
              {license?.license_no || license?.license_project_no || t("license")}
            </div>

            <div className="overview-ribbon__hero-subtitle">
              · {license?.contractor_name || t("attach_building_license")}
            </div>
          </div>
        </div>

        <div className="overview-ribbon__data">
          <div className="overview-ribbon__slots">
            <RibbonInfoCard
              label={t("license_type")}
              value={getLicenseTypeLabel(license?.license_type)}
            />

            <RibbonInfoCard
              label={t("license_project_no")}
              value={license?.license_project_no}
            />

            <RibbonInfoCard
              label={t("issue_date_first")}
              value={
                license?.issue_date
                  ? formatDate(license.issue_date, i18n.language)
                  : ""
              }
            />

            <RibbonInfoCard
              label={t("license_no")}
              value={license?.license_no}
              mono
            />

            <RibbonInfoCard
              label={t("contractor_name")}
              value={license?.contractor_name}
            />

            <RibbonInfoCard
              label={t("contractor_name_en")}
              value={license?.contractor_name_en}
            />

            <RibbonInfoCard
              label={t("contractor_lic")}
              value={license?.contractor_license_no}
            />

            <RibbonInfoCard
              label={t("phone")}
              value={license?.contractor_phone}
            />

            <RibbonInfoCard
              label={t("email")}
              value={license?.contractor_email}
            />

            <RibbonInfoCard
              label={t("design_consultant")}
              value={getTranslated(
                license?.design_consultant_name,
                license?.design_consultant_name_ar,
                license?.design_consultant_name_en
              )}
            />

            <RibbonInfoCard
              label={t("supervision_consultant")}
              value={getTranslated(
                license?.supervision_consultant_name,
                license?.supervision_consultant_name_ar,
                license?.supervision_consultant_name_en
              )}
              isLast
            />
          </div>
        </div>
      </div>

      <div className="ds-mt-6">
        <h3 className="prj-section-heading">{t("attachments")}</h3>
        <Card className="ds-p-5">
          <div className="ds-mb-4">
            <div className="prj-info-label ds-mb-3">
              {t("attach_building_license")}
            </div>
            <FileAttachmentView
              fileUrl={license?.building_license_file || null}
              fileName={
                license?.building_license_file
                  ? extractFileNameFromUrl(license.building_license_file)
                  : ""
              }
              projectId={projectId}
              endpoint={`projects/${projectId}/license/`}
            />
          </div>
        </Card>
      </div>
    </div>
  );
});

export default LicenseTab;