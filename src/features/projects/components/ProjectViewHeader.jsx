import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiDownload } from "react-icons/fi";
import Button from "../../../components/common/Button";
import { formatInternalCode } from "../../../utils/formatters/id";
import { buildFileUrl } from "../../../utils/helpers/file";
import { api } from "../../../services/api";
import { useNotifications } from "../../../contexts/NotificationContext";

const ProjectViewHeader = memo(function ProjectViewHeader({
  project,
  projectId,
  projectPermissions,
  activeTab,
  isManager,
  isSuperAdmin,
  permissionsLoading,
  onDeleteClick,
  onSubmitClick,
  onApproveClick,
  onRejectClick,
  onFinalApproveClick,
  siteplan,
}) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const { error: showError } = useNotifications();

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`projects/${projectId}/download-attachments/`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project?.name || "project"}_attachments.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError(t("download_error"));
    } finally {
      setDownloading(false);
    }
  };

  // Use internal code or project ID as title
  const titleText = project?.internal_code
    ? `${t("project_view_internal_code")}: ${formatInternalCode(project.internal_code)}`
    : t("wizard_project_prefix") + ` #${projectId}`;

  // Extract owner name (Arabic + English) from siteplan
  const getOwnerNames = () => {
    if (!siteplan?.owners || !Array.isArray(siteplan.owners) || siteplan.owners.length === 0) {
      return { nameAr: null, nameEn: null };
    }

    const authorizedOwners = siteplan.owners.filter(o => o.is_authorized === true);
    const owner = authorizedOwners.length > 0 ? authorizedOwners[0] : siteplan.owners[0];

    const nameAr = owner?.owner_name_ar || owner?.owner_name || "";
    const nameEn = owner?.owner_name_en || "";

    return { nameAr: nameAr || null, nameEn: nameEn || null };
  };

  const { nameAr, nameEn } = getOwnerNames();

  // Project image URL
  const rawImageUrl = project?.project_image || null;
  const imageUrl = rawImageUrl
    ? (rawImageUrl.startsWith("http") ? rawImageUrl : buildFileUrl(rawImageUrl))
    : null;

  // Status display
  const getStatusInfo = () => {
    if (!project?.status) return null;
    const statusMap = {
      not_started: { label: t("status_not_started"), variant: "default" },
      execution_started: { label: t("status_execution_started"), variant: "info" },
      under_execution: { label: t("status_under_execution"), variant: "primary" },
      temporarily_suspended: { label: t("status_temporarily_suspended"), variant: "warning" },
      handover_stage: { label: t("status_handover_stage"), variant: "success" },
      pending_financial_closure: { label: t("status_pending_financial_closure"), variant: "warning" },
      completed: { label: t("status_completed"), variant: "success" },
      draft: { label: t("draft"), variant: "default" },
      in_progress: { label: t("in_progress"), variant: "primary" },
    };
    return statusMap[project.status] || null;
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="prj-view-header">
      {/* Top Bar with image, info, and actions */}
      <div className="prj-view-header__top">
        {/* Project Image */}
        {imageUrl && (
          <div className="prj-view-header__image">
            <img src={imageUrl} alt={t("project_image")} />
          </div>
        )}

        <div className="prj-view-header__top-content">
          {/* Owner Names */}
          {(nameAr || nameEn) ? (
            <div className="prj-view-header__owner-names">
              {nameAr && <div className="prj-view-header__owner-name">{nameAr}</div>}
              {nameEn && <div className="prj-view-header__owner-name prj-view-header__owner-name--en">{nameEn}</div>}
            </div>
          ) : (
            <h1 className="prj-view-header__top-title">{titleText}</h1>
          )}

          {/* Meta row: code + status */}
          <div className="prj-view-header__meta">
            {project?.internal_code && (
              <div className="prj-view-header__top-code">
                <span>{t("project_view_internal_code")}:</span>
                <span className="mono">
                  {formatInternalCode(project.internal_code)}
                </span>
              </div>
            )}
            {statusInfo && (
              <span className={`prj-view-header__status prj-view-header__status--${statusInfo.variant}`}>
                {statusInfo.label}
              </span>
            )}
          </div>
        </div>

        <div className="prj-view-header__top-back">
          <Button
            variant="secondary"
            size="md"
            className="prj-view-header__btn--light"
            onClick={handleDownloadAll}
            loading={downloading}
            startIcon={<FiDownload />}
          >
            {downloading ? t("downloading") : t("download_all_attachments")}
          </Button>
          {projectPermissions?.can_edit && (
            <Button as={Link} to={`/projects/${projectId}/wizard?step=setup&mode=edit`} variant="secondary" size="md" className="prj-view-header__btn--light">
              {t("edit")}
            </Button>
          )}
          <Button as={Link} variant="secondary" to="/projects" size="md" className="prj-view-header__btn--light">
            {t("back_projects")}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="prj-view-header__body">
        <div className="prj-view-header__content">
          {/* Status Banner */}
          {project?.approval_status && project.approval_status !== 'final_approved' && (
            <div className="prj-status-banner" data-status={project.approval_status}>
              <span className={`prj-status-banner__dot prj-status-banner__dot--${project.approval_status}`} />
              <div className="prj-status-banner__content">
                <div className="prj-status-banner__title">
                  {project.approval_status === 'pending' ? t("pending_approval_banner") :
                   project.approval_status === 'approved' ? t("pending_final_approval_banner") :
                   project.approval_status === 'draft' ? t("draft_banner") :
                   t("rejected_banner")}
                </div>
                {project.approval_status === 'pending' && project.last_approved_by && (
                  <div className="prj-status-banner__subtitle">
                    {t("submitted_by")}: {project.last_approved_by.full_name || project.last_approved_by.email}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="prj-view-header__actions">

          {/* Approval Actions Group */}
          <div className="prj-view-actions-group">
            <div className="prj-view-actions-group__label">{t("approval_actions")}</div>
            <div className="prj-view-actions-group__buttons">
              {/* Submit for Approval */}
              {!permissionsLoading && projectPermissions?.can_submit && project?.approval_status === "draft" && !isSuperAdmin && (
                <Button variant="primary" onClick={onSubmitClick} size="md" fullWidth>
                  {t("submit_for_approval")}
                </Button>
              )}

              {/* Final Approve - Super Admin (from draft or pending) */}
              {(project?.approval_status === "draft" || project?.approval_status === "pending") && isSuperAdmin && (
                <Button variant="primary" onClick={onFinalApproveClick} size="md" fullWidth>
                  {t("final_approve")}
                </Button>
              )}

              {/* Final Approve - Other users with permission (from draft) */}
              {project?.approval_status === "draft" && !isSuperAdmin && !permissionsLoading && projectPermissions?.can_final_approve && (
                <Button variant="primary" onClick={onFinalApproveClick} size="md" fullWidth>
                  {t("final_approve")}
                </Button>
              )}

              {/* Approve/Reject Actions - Manager */}
              {project?.approval_status === "pending" && !isSuperAdmin && (isManager || (!isManager && !permissionsLoading && projectPermissions?.can_approve)) && (
                <div className="prj-view-actions-row">
                  <Button variant="primary" onClick={onApproveClick} size="md" className="flex-1">
                    {t("approve_stage")}
                  </Button>
                  {(isManager || projectPermissions?.can_reject) && (
                    <Button variant="danger" onClick={onRejectClick} size="md" className="flex-1">
                      {t("reject")}
                    </Button>
                  )}
                </div>
              )}

              {/* Final Approve - from approved status */}
              {project?.approval_status === "approved" && (isSuperAdmin || (!isSuperAdmin && !permissionsLoading && projectPermissions?.can_final_approve)) && (
                <Button variant="primary" onClick={onFinalApproveClick} size="md" fullWidth>
                  {t("final_approve")}
                </Button>
              )}
            </div>
          </div>

          {/* Delete Action */}
          {projectPermissions?.can_delete && (
            <div className="prj-view-actions-group">
              <div className="prj-view-actions-group__label">{t("danger_zone")}</div>
              <div className="prj-view-actions-group__buttons">
                <Button variant="danger" onClick={onDeleteClick} size="md" fullWidth>
                  {t("delete_project")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProjectViewHeader;
