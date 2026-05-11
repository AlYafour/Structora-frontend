import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DirhamsIcon from '../../../components/common/DirhamsIcon';
import Checkbox from '../../../components/forms/Checkbox';
import ActionMenu from '../../../components/common/ActionMenu';
import { formatInternalCode } from '../../../utils/formatters/id';
import { getProjectStatusLabel } from '../../../utils/ui/status';
import {
  getProjectName,
  getConsultantNameShort,
  formatLocation,
} from '../utils/projectHelpers';

/**
 * ProjectCard Component
 * Mobile view card for project display
 */
const ProjectCard = React.memo(({
  project,
  index,
  isSelected,
  onToggle,
  onDelete,
  onApprove,
  onReject,
  onFinalApprove,
  showApprove,
  showReject,
  showFinalApprove,
  showDelete,
}) => {
  const { t, i18n } = useTranslation();

  // Memoize computed values
  const projectName = useMemo(() => getProjectName(project, t), [project, t]);
  const consultantInfo = useMemo(() => getConsultantNameShort(project, t), [project, t]);
  const location = useMemo(() => formatLocation(project), [project]);

  const statusLabel = useMemo(() =>
    project?.status ? getProjectStatusLabel(project.status, i18n.language) : t("empty_value"),
    [project?.status, i18n.language, t]
  );

  return (
    <div className="projects-mobile-card">
      <div className="projects-mobile-card-header">
        <div>
          <div className="projects-mobile-card-title">
            {projectName.ar || projectName.full || t("empty_value")}
          </div>
          <div className="projects-mobile-card-code">
            {project?.internal_code
              ? formatInternalCode(project.internal_code)
              : `PRJ-${project?.id ?? index + 1}`}
          </div>
        </div>
        <Checkbox
          checked={isSelected}
          onChange={onToggle}
          aria-label={`${t("select")} ${projectName.full}`}
        />
      </div>

      <div className="projects-mobile-card-row">
        <div className="projects-mobile-card-label">{t("consultant")}</div>
        <div className="projects-mobile-card-value">
          {consultantInfo.ar || consultantInfo.full || t("empty_value")}
        </div>
      </div>

      {location.hasAny && (
        <div className="projects-mobile-card-row">
          <div className="projects-mobile-card-label">{t("table_location")}</div>
          <div className="projects-mobile-card-value">
            {location.municipality && <div>{location.municipality}</div>}
            {location.zone && <div>{location.zone}</div>}
          </div>
        </div>
      )}

      <div className="projects-mobile-card-row">
        <div className="projects-mobile-card-label">{t("project_status")}</div>
        <div className="projects-mobile-card-value">
          {statusLabel}
        </div>
      </div>

      {project.technical_progress_current !== null && (
        <div className="projects-mobile-card-row">
          <div className="projects-mobile-card-label">{t("mobile_technical_progress")}</div>
          <div className="projects-mobile-card-value">
            {Number(project.technical_progress_current).toFixed(2)}%
          </div>
        </div>
      )}

      {project.current_due_amount !== null && (
        <div className="projects-mobile-card-row">
          <div className="projects-mobile-card-label">{t("table_current_due_amount")}</div>
          <div className="projects-mobile-card-value">
            {Number.isFinite(Number(project.current_due_amount))
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  {Number(project.current_due_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {i18n.language === "ar" ? " د.إ" : <DirhamsIcon size={10} color="#374151" />}
                </span>
              : '-'}
          </div>
        </div>
      )}

      <div className="projects-mobile-card-row">
        <div className="projects-mobile-card-label">{t("action")}</div>
        <div className="projects-mobile-card-value">
          <ActionMenu
            project={project}
            onApprove={onApprove}
            onReject={onReject}
            onFinalApprove={onFinalApprove}
            onDelete={onDelete}
            showApprove={showApprove}
            showReject={showReject}
            showFinalApprove={showFinalApprove}
            showDelete={showDelete}
          />
        </div>
      </div>
    </div>
  );
});

ProjectCard.displayName = 'ProjectCard';

export default ProjectCard;
