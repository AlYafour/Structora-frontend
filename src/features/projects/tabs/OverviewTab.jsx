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
     {/* Project Site Ribbon */}
<div className="overview-ribbon ds-mt-6">
  <div className="overview-ribbon__top-stripe" />

  <div
    className="overview-ribbon__hero"
    style={{ backgroundImage: "url('/construction-1.jpg')" }}
  >
    <div className="overview-ribbon__hero-overlay" />

    <div className="overview-ribbon__hero-label">
      ▲ SITE · {contractTypeLabel || t("contract_type_label")} · {allocationTypeLabel || t("project_type_label")}
    </div>

    <div className="overview-ribbon__hero-content">
      <div className="overview-ribbon__hero-title">
        {project?.internal_code
          ? `PROJECT ${formatInternalCode(project.internal_code)}`
          : project?.name || t("project_view_internal_code")}
      </div>

      <div className="overview-ribbon__hero-subtitle">
        · {project?.name || t("project_type_label")} · {contractClassificationLabel}
      </div>
    </div>

    {project?.status && (
      <div className="overview-ribbon__status-badge">
        <span
          className="overview-ribbon__status-dot"
          style={{ backgroundColor: getProjectStatusColor(project.status) }}
        />
        {getProjectStatusLabel(project.status, i18n.language)}
      </div>
    )}
  </div>

  <div className="overview-ribbon__data">
    <div className="overview-ribbon__slots">
      {project?.internal_code && (
        <div className="overview-ribbon__slot">
          <div className="overview-ribbon__slot-top">
            <span className="overview-ribbon__slot-num">/ 01</span>
          </div>

          <div className="overview-ribbon__slot-label">
            {t("project_view_internal_code")}
          </div>

          <div className="overview-ribbon__slot-value overview-ribbon__slot-value--mono">
            {formatInternalCode(project.internal_code)}
          </div>

          <div className="overview-ribbon__slot-subrow">
            <div className="overview-ribbon__slot-sub">Reference ID</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className={`overview-ribbon__copy-btn ${copied ? "overview-ribbon__copy-btn--copied" : ""}`}
              title={copied ? t("copied") : t("copy_code")}
            >
              {copied ? t("copied") : t("copy_code")}
            </Button>
          </div>
        </div>
      )}

      <div className="overview-ribbon__slot">
        <div className="overview-ribbon__slot-top">
          <span className="overview-ribbon__slot-num">/ 02</span>
        </div>

        <div className="overview-ribbon__slot-label">{t("project_type_label")}</div>

        <div className="overview-ribbon__slot-value">
          {hasNewClassification
            ? [categoryLabel, buildingTypeLabel].filter(Boolean).join(" · ")
            : allocationTypeLabel || t("empty_value")}
        </div>

        <div className="overview-ribbon__slot-sub">
          {hasNewClassification
            ? subClassLabel || landUseLabel || t("empty_value")
            : landUseLabel || t("empty_value")}
        </div>
      </div>

      {project?.status && (
        <div className="overview-ribbon__slot">
          <div className="overview-ribbon__slot-top">
            <span className="overview-ribbon__slot-num">/ 03</span>
          </div>

          <div className="overview-ribbon__slot-label">{t("project_status")}</div>

          <div className="overview-ribbon__slot-value overview-ribbon__slot-value--status">
            <span
              className="overview-ribbon__status-dot overview-ribbon__status-dot--inline"
              style={{ backgroundColor: getProjectStatusColor(project.status) }}
            />
            {getProjectStatusLabel(project.status, i18n.language)}
          </div>

          <div className="overview-ribbon__slot-sub">Awaiting approval</div>
        </div>
      )}

      {contractTypeLabel && (
        <div className="overview-ribbon__slot">
          <div className="overview-ribbon__slot-top">
            <span className="overview-ribbon__slot-num">/ 04</span>
          </div>

          <div className="overview-ribbon__slot-label">{t("contract_type_label")}</div>

          <div className="overview-ribbon__slot-value">{contractTypeLabel}</div>

          <div className="overview-ribbon__slot-sub">Project contract structure</div>
        </div>
      )}

      <div className="overview-ribbon__slot overview-ribbon__slot--last">
        <div className="overview-ribbon__slot-top">
          <span className="overview-ribbon__slot-num">/ 05</span>
        </div>

        <div className="overview-ribbon__slot-label">
          {t("contract.sections.classification")}
        </div>

        <div className="overview-ribbon__slot-value">
          {contractClassificationLabel}
        </div>

        <div className="overview-ribbon__slot-sub">Funding classification</div>
      </div>
    </div>

    <div className="overview-ribbon__bottom-stripe" />
  </div>
</div>
    </div>
  );
});

export default OverviewTab;
