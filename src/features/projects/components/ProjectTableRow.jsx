import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DirhamsIcon from '../../../components/common/DirhamsIcon';
import Checkbox from '../../../components/forms/Checkbox';
import ActionMenu from '../../../components/common/ActionMenu';
import { formatInternalCode } from '../../../utils/formatters/id';
import { getProjectStatusLabel, getProjectStatusColor } from '../../../utils/ui/status';
import StatusBadge from '../../../components/common/StatusBadge';
import DurationCell from './DurationCell';
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import {
  getProjectName,
  getConsultantNameShort,
  formatLocation,
  getPaymentStatusDisplay,
  getFinancialExecutionStatusIcon,
} from '../utils/projectHelpers';

/**
 * ProjectTableRow Component
 * Optimized table row for project display with React.memo
 */
const ProjectTableRow = React.memo(({
  project,
  index,
  isSelected,
  onToggle,
  onDelete,
  onApprove,
  onReject,
  onFinalApprove,
  onProgressClick,
  showApprove,
  showReject,
  showFinalApprove,
  showDelete,
  compact = false,
  formatDate,
  isRTL,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();

  const handleRowClick = useCallback((e) => {
    // Don't navigate if clicking checkbox, action menu, or progress badges
    if (
      e.target.closest('.col-checkbox') ||
      e.target.closest('.col-actions') ||
      e.target.closest('.col-pct') ||
      e.target.closest('input') ||
      e.target.closest('button') ||
      e.target.closest('a')
    ) return;
    navigate(`/projects/${project?.id}`);
  }, [navigate, project?.id]);

  // Memoize computed values
  const projectName = useMemo(() => getProjectName(project, t), [project, t]);
  const consultantInfo = useMemo(() => getConsultantNameShort(project, t), [project, t]);
  const location = useMemo(() => formatLocation(project), [project]);
  const title = useMemo(() =>
    project?.display_name || project?.name || `${t("wizard_project_prefix")} #${project?.id ?? index + 1}`,
    [project, t, index]
  );
  const statusDisplay = useMemo(() => {
    if (!project?.status) return { label: t("empty_value"), color: "#6b7280" };
    return {
      label: getProjectStatusLabel(project.status, i18n.language),
      color: getProjectStatusColor(project.status),
    };
  }, [project?.status, i18n.language, t]);

  const fmt = (v) => v != null ? `${Number(v).toFixed(1)}%` : '-';
  const fmtGap = (v) => v != null ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%` : '-';
  const finGap = (paid, invoiced) => (paid != null && invoiced != null) ? Number(paid) - Number(invoiced) : null;
  // Financial gap colors: negative = money short (red), positive = excess (yellow), zero = balanced (green)
  const finGapClass = (v) =>
    v != null && Number(v) < 0 ? 'progress-gap--warning' :
      v != null && Number(v) > 0 ? 'progress-gap--excess' :
        v != null && Number(v) === 0 ? 'progress-gap--positive' : '';

  return (
    <tr className={isSelected ? "is-selected" : ""} onClick={handleRowClick}>
      <td className="col-checkbox">
        <Checkbox
          checked={isSelected}
          onChange={onToggle}
          aria-label={`${t("select")} ${title}`}
        />
      </td>

      <td className="col-number">{index + 1}</td>

      <td className="col-code">
        <div className="ds-table__code">
          {project?.internal_code
            ? formatInternalCode(project.internal_code)
            : `PRJ-${project?.id ?? index + 1}`}
        </div>
      </td>

      <td className="col-name">
        <div className="ds-table__cell-stack">
          <div className="ds-table__cell-primary">
            {isRTL
              ? (projectName.ar || projectName.full)
              : (projectName.en || projectName.full)
              || t("empty_value")}
          </div>

          {projectName.en && projectName.ar && projectName.en !== projectName.ar && (
            <div className="ds-table__cell-secondary">
              {isRTL ? projectName.en : projectName.ar}
            </div>
          )}
        </div>
      </td>

      <td className="col-consultant">
        <div className="ds-table__cell-stack">
          <div className="ds-table__cell-primary">
            {isRTL
              ? (consultantInfo.ar || consultantInfo.full)
              : (consultantInfo.en || consultantInfo.full)
              || t("empty_value")}
          </div>

          {consultantInfo.en && consultantInfo.ar && consultantInfo.en !== consultantInfo.ar && (
            <div className="ds-table__cell-secondary">
              {isRTL ? consultantInfo.en : consultantInfo.ar}
            </div>
          )}
        </div>
      </td>

      {!compact && (
        <>
          <td className="col-date">
            <div className="ds-table__cell-text">
              {project?.__contract_data?.project_end_date
                ? formatDate(project.__contract_data.project_end_date)
                : t("empty_value")}
            </div>
          </td>

          <td className="col-status">
            <div className="ds-table__cell-text">
              <span className="prj-badge">
                {statusDisplay.label}
              </span>
            </div>
          </td>

          <td className="col-location">
            {!location.hasAny ? '-' : (
              <div className="ds-table__cell-stack">
                {location.municipality && (
                  <div className="ds-table__cell-primary">
                    {location.municipality}
                  </div>
                )}
                {location.zone && (
                  <div className="ds-table__cell-secondary">
                    {location.zone}
                  </div>
                )}
              </div>
            )}
          </td>

          <td className="col-date">
            <div className="ds-table__cell-text">
              {project.start_order_date ? formatDate(project.start_order_date) : '-'}
            </div>
          </td>

          <td className="col-date">
            <div className="ds-table__cell-text">
              {project.planned_completion_date ? formatDate(project.planned_completion_date) : '-'}
            </div>
          </td>

          <td className="col-days">
            <DurationCell duration={project.elapsed_duration} />
          </td>

          <td className="col-days">
            <DurationCell duration={project.time_delay} />
          </td>

          <td className="col-pct ds-cursor-pointer" onClick={onProgressClick}>
            <div className="pct-stack">
              <span className="pct-row"><span className="pct-lbl">{t("progress_overall_short")}</span> {fmt(project.overall_actual_current)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_owner_short")}</span> {fmt(project.owner_actual_current)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_bank_short")}</span> {fmt(project.bank_actual_current)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_variations_short")}</span> {fmt(project.variations_actual_current)}</span>
            </div>
          </td>
          <td className="col-pct ds-cursor-pointer" onClick={onProgressClick}>
            <div className="pct-stack">
              <span className="pct-row"><span className="pct-lbl">{t("progress_overall_short")}</span> {fmt(project.overall_technical_current)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_owner_short")}</span> {fmt(project.owner_technical_current)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_bank_short")}</span> {fmt(project.bank_technical_current)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_variations_short")}</span> {fmt(project.variations_technical_current)}</span>
            </div>
          </td>
          <td className="col-pct ds-cursor-pointer" onClick={onProgressClick}>
            <div className="pct-stack">
              <span className="pct-row"><span className="pct-lbl">{t("progress_overall_short")}</span> {fmt(project.overall_technical_approved)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_owner_short")}</span> {fmt(project.owner_technical_approved)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_bank_short")}</span> {fmt(project.bank_technical_approved)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_variations_short")}</span> {fmt(project.variations_technical_approved)}</span>
            </div>
          </td>
          <td className="col-pct ds-cursor-pointer" onClick={onProgressClick}>
            <div className="pct-stack">
              <span className="pct-row"><span className="pct-lbl">{t("progress_overall_short")}</span> {fmt(project.overall_financial)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_owner_short")}</span> {fmt(project.owner_financial)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_bank_short")}</span> {fmt(project.bank_financial)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_variations_short")}</span> {fmt(project.variations_financial)}</span>
            </div>
          </td>
          <td className="col-pct ds-cursor-pointer" onClick={onProgressClick}>
            <div className="pct-stack">
              <span className="pct-row"><span className="pct-lbl">{t("progress_overall_short")}</span> {fmt(project.overall_invoice_approved)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_owner_short")}</span> {fmt(project.owner_invoice_approved)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_bank_short")}</span> {fmt(project.bank_invoice_approved)}</span>
              <span className="pct-row"><span className="pct-lbl">{t("progress_variations_short")}</span> {fmt(project.variations_invoice_approved)}</span>
            </div>
          </td>
          <td className="col-pct ds-cursor-pointer" onClick={onProgressClick}>
            <div className="pct-stack">
              <span className={`pct-row ${finGapClass(finGap(project.overall_financial, project.overall_invoice_approved))}`}><span className="pct-lbl">{t("progress_overall_short")}</span> {fmtGap(finGap(project.overall_financial, project.overall_invoice_approved))}</span>
              <span className={`pct-row ${finGapClass(finGap(project.owner_financial, project.owner_invoice_approved))}`}><span className="pct-lbl">{t("progress_owner_short")}</span> {fmtGap(finGap(project.owner_financial, project.owner_invoice_approved))}</span>
              <span className={`pct-row ${finGapClass(finGap(project.bank_financial, project.bank_invoice_approved))}`}><span className="pct-lbl">{t("progress_bank_short")}</span> {fmtGap(finGap(project.bank_financial, project.bank_invoice_approved))}</span>
              <span className={`pct-row ${finGapClass(finGap(project.variations_financial, project.variations_invoice_approved))}`}><span className="pct-lbl">{t("progress_variations_short")}</span> {fmtGap(finGap(project.variations_financial, project.variations_invoice_approved))}</span>
            </div>
          </td>

          <td className="col-status">
            {project.payment_status && (
              <StatusBadge
                status={
                  project.payment_status === 'balanced' ? 'positive' :
                    project.payment_status === 'due' ? 'pending' :
                      project.payment_status === 'overdue' ? 'negative' :
                        'neutral'
                }
                label={getPaymentStatusDisplay(project.payment_status, isRTL).text}
                size="sm"
              />
            )}
          </td>

          <td className="col-amount">
            <div className="ds-table__cell-text">
              {project.current_due_amount !== null && project.current_due_amount !== undefined ? (
                Number.isFinite(Number(project.current_due_amount))
                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      {Number(project.current_due_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {i18n.language === "ar" ? " د.إ" : <DirhamsIcon size={10} color="#374151" />}
                    </span>
                  : '-'
              ) : '-'}
            </div>
          </td>

          <td className="col-days">
            <div className="ds-table__cell-text">
              {project.payment_delay_days !== null && project.payment_delay_days !== undefined ? (
                <span className={
                  project.payment_delay_days <= 5 ? 'delay-days--green' :
                    project.payment_delay_days <= 10 ? 'delay-days--yellow' :
                      'delay-days--red'
                }>
                  {project.payment_delay_days} {project.payment_delay_days === 1 ? t("day") : t("days")}
                </span>
              ) : '-'}
            </div>
          </td>

          <td className="col-status">
            <div className="ds-table__cell-text">
              {project.project_closure_status || '-'}
            </div>
          </td>

          <td className="col-icon">
            {getFinancialExecutionStatusIcon(project.financial_execution_status)}
          </td>
        </>
      )}

      <td className="col-actions">
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
      </td>
    </tr>
  );
});

ProjectTableRow.displayName = 'ProjectTableRow';

export default ProjectTableRow;
