import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";
import { formatDate } from "../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import "./LicenseTab.css";

const LicenseTab = memo(function LicenseTab({ projectId, license }) {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const hasLicense = !!license;

  // License types mapping - same LICENSE_TYPES as in LicenseStep
  const LICENSE_TYPES = [
    { value: "new_build_empty_land", label: t("license_type_new_build") },
    { value: "new_build_existing", label: t("license_type_new_build_existing") },
    { value: "extension", label: t("license_type_extension") },
    { value: "renovation", label: t("license_type_renovation") },
  ];

  const getLicenseTypeLabel = (value) => {
    if (!value) return "";
    const type = LICENSE_TYPES.find(x => x.value === value);
    return type?.label || value;
  };

  if (!hasLicense) {
    return (
      <div className="prj-tab-panel">
        <div className="prj-tab-header">
          <div className="prj-tab-actions ds-flex ds-gap-3">
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
            >
              {t("edit")}
            </Button>
          </div>
        </div>
        <div className="prj-empty-state">
          {t("license_not_added")}
        </div>
      </div>
    );
  }

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions ds-flex ds-gap-3">
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
          >
            {t("edit")}
          </Button>
        </div>
      </div>

      {/* License Information Cards - Compact Professional Layout */}
      <div className="ds-grid-auto-240 ds-mt-6">
        {license?.license_type && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("license_type")}</div>
            <div className="prj-info-value">
              {getLicenseTypeLabel(license.license_type)}
            </div>
          </Card>
        )}

        {license?.license_project_no && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("license_project_no")}</div>
            <div className="prj-info-value">
              {license.license_project_no}
            </div>
          </Card>
        )}

        {license?.issue_date && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("issue_date_first")}</div>
            <div className="prj-info-value">
              {formatDate(license.issue_date, i18n.language)}
            </div>
          </Card>
        )}

        {license?.license_no && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("license_no")}</div>
            <div className="prj-info-value license-tab__license-no-value">
              {license.license_no}
            </div>
          </Card>
        )}

        {license?.contractor_name && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("contractor_name")}</div>
            <div className="prj-info-value">
              {license.contractor_name}
            </div>
          </Card>
        )}

        {license?.contractor_name_en && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("contractor_name_en")}</div>
            <div className="prj-info-value">
              {license.contractor_name_en}
            </div>
          </Card>
        )}

        {license?.contractor_license_no && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("contractor_lic")}</div>
            <div className="prj-info-value">
              {license.contractor_license_no}
            </div>
          </Card>
        )}

        {license?.contractor_phone && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("phone")}</div>
            <div className="prj-info-value">
              {license.contractor_phone}
            </div>
          </Card>
        )}

        {license?.contractor_email && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("email")}</div>
            <div className="prj-info-value">
              {license.contractor_email}
            </div>
          </Card>
        )}

        {license?.design_consultant_name && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("design_consultant")}</div>
            <div className="prj-info-value">
              {license.design_consultant_name}
            </div>
          </Card>
        )}

        {license?.supervision_consultant_name && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("supervision_consultant")}</div>
            <div className="prj-info-value">
              {license.supervision_consultant_name}
            </div>
          </Card>
        )}
      </div>

      {/* Attachments Section - Always visible even if empty */}
      <div className="ds-mt-6">
        <h3 className="prj-section-heading">
          {t("attachments")}
        </h3>
        <Card className="ds-p-5">
          <div className="ds-mb-4">
            <div className="prj-info-label ds-mb-3">
              {t("attach_building_license")}
            </div>
            <FileAttachmentView
              fileUrl={license?.building_license_file || null}
              fileName={license?.building_license_file ? extractFileNameFromUrl(license.building_license_file) : ""}
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
