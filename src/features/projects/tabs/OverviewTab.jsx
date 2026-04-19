import { memo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { formatInternalCode } from "../../../utils/formatters/id";
import { getProjectStatusLabel, getProjectStatusColor } from "../../../utils/ui/status";
import { CONTRACT_TYPES } from "../../../utils/constants";
import { toLocalizedUse, LAND_USE_LABEL_KEYS } from "../../../utils/licenseHelpers";
import { logger } from "../../../utils/logger";
import "./OverviewTab.css";

// Wizard classification labels — bilingual, resolved at render time via t()
const CATEGORY_LABEL_KEYS = {
  construction: "cat_construction",
  maintenance:  "cat_maintenance",
  fitout:       "cat_fitout",
  renovation:   "cat_renovation",
};

const BUILDING_TYPE_LABEL_KEYS = {
  residential:    "btype_residential",
  commercial:     "btype_commercial",
  industrial:     "btype_industrial",
  government:     "btype_government",
  health:         "btype_health",
  religious:      "btype_religious",
  agricultural:   "btype_agricultural",
  infrastructure: "btype_infrastructure",
};

const OverviewTab = memo(function OverviewTab({ projectId, project, contract, siteplan, projectPermissions, onDeleteClick, onReload }) {
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");

  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(copyTimerRef.current);
  }, []);

  // Allocation type from siteplan (project classification)
  const allocationTypeLabel = siteplan?.allocation_type
    ? toLocalizedUse(siteplan.allocation_type, i18n.language) || t(`allocation_${siteplan.allocation_type.toLowerCase()}`) || siteplan.allocation_type
    : null;

  // Land use from siteplan (subcategory)
  const landUseLabel = siteplan?.land_use
    ? t(LAND_USE_LABEL_KEYS[siteplan.land_use] || siteplan.land_use)
    : null;

  // Get contract type label
  const contractTypeLabel = project?.contract_type
    ? (CONTRACT_TYPES[isAR ? "ar" : "en"].find(([val]) => val === project.contract_type)?.[1] || project.contract_type)
    : null;

  // New wizard classification data
  const cd = project?.classification_data || {};
  const categoryLabel = CATEGORY_LABEL_KEYS[cd.projectCategory] ? t(CATEGORY_LABEL_KEYS[cd.projectCategory]) : null;
  const buildingTypeLabel = BUILDING_TYPE_LABEL_KEYS[cd.constructionType] ? t(BUILDING_TYPE_LABEL_KEYS[cd.constructionType]) : null;
  const subClassLabel = Array.isArray(cd.subClassifications) && cd.subClassifications.length > 0
    ? cd.subClassifications.join("، ")
    : null;
  const hasNewClassification = !!(categoryLabel || buildingTypeLabel || subClassLabel);

  const contractClassificationLabel =
    contract?.contract_classification === "housing_loan_program"
      ? t("contract.classification.housing_loan_program.label")
      : contract?.contract_classification === "private_funding"
      ? t("contract.classification.private_funding.label")
      : contract?.contract_classification === "ruler_court_funding"
      ? t("contract.classification.ruler_court_funding.label")
      : t("empty_value");
  
  const handleCopyCode = async () => {
    if (project?.internal_code) {
      const code = formatInternalCode(project.internal_code);
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          setCopied(true);
          copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
        } catch (e) {
          logger.error("Failed to copy", e);
        }
        document.body.removeChild(textArea);
      }
    }
  };

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions ds-flex ds-gap-3">
          <Button
            as={Link}
            to={`/projects/${projectId}/wizard?step=setup&mode=view&sectionOnly=true`}
            variant="secondary"
            size="md"
          >
            {t("view")}
          </Button>
          <Button
            as={Link}
            to={`/projects/${projectId}/wizard?step=setup&mode=edit&sectionOnly=true`}
            variant="primary"
            size="md"
            disabled={!projectPermissions?.can_edit}
          >
            {t("edit")}
          </Button>
        </div>
      </div>
      
      {/* Project Information Cards - Compact Professional Layout */}
      <div className="ds-grid-auto-240 ds-mt-6">
        {project?.internal_code && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("project_view_internal_code")}</div>
            <div className="prj-info-value overview-tab__code-value">
              <span className="mono overview-tab__code-text">
                {formatInternalCode(project.internal_code)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className={`overview-tab__copy-btn ${copied ? "overview-tab__copy-btn--copied" : ""}`}
                title={copied ? t("copied") : t("copy_code")}
              >
                {copied ? t("copied") : t("copy_code")}
              </Button>
            </div>
          </Card>
        )}
        
        <Card className="ds-info-card">
          <div className="prj-info-label">{t("project_type_label")}</div>
          <div className="prj-info-value">
            {hasNewClassification ? (
              <div className="overview-tab__classification">
                <span>
                  {[categoryLabel, buildingTypeLabel].filter(Boolean).join(" • ")}
                </span>
                {subClassLabel && (
                  <div className="overview-tab__classification-sub">{subClassLabel}</div>
                )}
              </div>
            ) : (
              allocationTypeLabel || t("empty_value")
            )}
          </div>
        </Card>

        
        {project?.status && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("project_status")}</div>
            <div className="prj-info-value">
              <div className="ds-flex ds-items-center ds-gap-2">
                <span
                  className="overview-tab__status-dot"
                  style={{ backgroundColor: getProjectStatusColor(project.status) }}
                />
                <span>{getProjectStatusLabel(project.status, i18n.language)}</span>
              </div>
            </div>
          </Card>
        )}
        
        {contractTypeLabel && (
          <Card className="ds-info-card">
            <div className="prj-info-label">{t("contract_type_label")}</div>
            <div className="prj-info-value">
              {contractTypeLabel}
            </div>
          </Card>
        )}
        
        <Card className="ds-info-card">
          <div className="prj-info-label">{t("contract.sections.classification")}</div>
          <div className="prj-info-value">
            {contractClassificationLabel}
          </div>
        </Card>
      </div>
    </div>
  );
});

export default OverviewTab;
