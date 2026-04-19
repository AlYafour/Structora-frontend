import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";

const ProjectFinancialEntitlementsTab = memo(function ProjectFinancialEntitlementsTab({ projectId }) {
  const { t } = useTranslation();

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
      </div>

      {/* Financial Entitlement Section */}
      <div className="prj-tab-section">
        <div className="prj-tab-section__title">{t("project_financial_entitlements")}</div>
        <div className="prj-info-grid">
          <div className="prj-info-item">
            <div className="prj-info-label">{t("description")}</div>
            <div className="prj-info-value">{t("financial_entitlement_desc")}</div>
          </div>
        </div>
        <div className="prj-tab-actions">
          <Button as={Link} variant="primary" to={`/projects/${projectId}/financial-entitlement`} size="md">
            {t("view")} {t("project_financial_entitlements")}
          </Button>
        </div>
      </div>
    </div>
  );
});

export default ProjectFinancialEntitlementsTab;
