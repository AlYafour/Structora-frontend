import { memo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiDownload, FiUpload } from "react-icons/fi";
import Button from "../../../components/common/Button";
import { formatInternalCode } from "../../../utils/formatters/id";
import { buildFileUrl } from "../../../utils/helpers/file";
import { api, updateFile } from "../../../services/api";
import { useNotifications } from "../../../contexts/NotificationContext";
import { useLanguage } from "../../../hooks";

const ProjectViewHeader = memo(function ProjectViewHeader({
  project,
  projectId,
  projectPermissions,
  activeTab,
  isManager,
  isSuperAdmin,
  canDeleteProject,
  permissionsLoading,
  onDeleteClick,
  onSubmitClick,
  onApproveClick,
  onRejectClick,
  onFinalApproveClick,
  onRevokeFinalApprovalClick,
  siteplan,
}) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const { error: showError } = useNotifications();
  const { isArabic: isAR } = useLanguage();


  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`projects/${projectId}/download-attachments/`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const projectName = isAR
        ? (project?.display_name || project?.name || "project")
        : (project?.display_name_en || project?.display_name || project?.name || "project");
      link.download = `${projectName}_attachments.zip`;
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

  const handleImageUpload = async (file) => {
    if (!file.type.startsWith("image/")) {
      showError(t("invalid_file_type"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError(t("file_too_large"));
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setLocalImageUrl(previewUrl);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("project_image", file, file.name);
      await updateFile(`projects/${projectId}/`, formData);
    } catch {
      setLocalImageUrl(null);
      URL.revokeObjectURL(previewUrl);
      showError(t("upload_error"));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
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
  const remoteImageUrl = rawImageUrl
    ? (rawImageUrl.startsWith("http") ? rawImageUrl : buildFileUrl(rawImageUrl))
    : null;
  const displayImageUrl = localImageUrl || remoteImageUrl;

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
      <div className="prj-view-header__split">

        {/* Left panel: all info + actions */}
        <div className="prj-view-header__left">

          {/* Status row: approval badge or banner */}
          <div className="prj-view-header__status-row">
            {project?.approval_status === 'final_approved' && (
              <div className="prj-approval-status-badge prj-approval-status-badge--final-approved">
                <span className="prj-approval-status-badge__icon">✓</span>
                <span className="prj-approval-status-badge__text">{t("final_approved")}</span>
              </div>
            )}
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

          {/* Identity: name */}
          <div className="prj-view-header__identity">
            {(nameAr || nameEn) ? (
              <>
                <h1 className="prj-view-header__name-primary">
                  {isAR ? (nameAr || nameEn) : (nameEn || nameAr)}
                </h1>
                {nameAr && nameEn && nameAr !== nameEn && (
                  <p className="prj-view-header__name-secondary">
                    {isAR ? nameEn : nameAr}
                  </p>
                )}
              </>
            ) : (
              <h1 className="prj-view-header__name-primary">{titleText}</h1>
            )}
          </div>

          {/* Meta: internal code + execution status */}
          <div className="prj-view-header__meta">
            {project?.internal_code && (
              <div className="prj-view-header__top-code">
                <span className="mono">{formatInternalCode(project.internal_code)}</span>
              </div>
            )}
            {statusInfo && (
              <span className={`prj-view-header__status prj-view-header__status--${statusInfo.variant}`}>
                {statusInfo.label}
              </span>
            )}
          </div>

          {/* Spacer: pushes buttons to bottom */}
          <div className="prj-view-header__spacer" />

          {/* Nav buttons */}
          <div className="prj-view-header__nav">
            <Button
              variant="secondary"
              size="sm"
              className="prj-view-header__btn--light"
              onClick={handleDownloadAll}
              loading={downloading}
              startIcon={<FiDownload />}
            >
              {downloading ? t("downloading") : t("download_all_attachments")}
            </Button>
            {projectPermissions?.can_edit && (
              <Button as={Link} to={`/projects/${projectId}/wizard?step=setup&mode=edit`} variant="secondary" size="sm" className="prj-view-header__btn--light">
                {t("edit")}
              </Button>
            )}
            <Button as={Link} variant="secondary" to="/projects" size="sm" className="prj-view-header__btn--light">
              {t("back_projects")}
            </Button>
          </div>

          {/* Action buttons */}
          <div className="prj-view-header__actions-row">
            {!permissionsLoading && projectPermissions?.can_submit && project?.approval_status === "draft" && !isSuperAdmin && (
              <Button variant="primary" onClick={onSubmitClick} size="sm">
                {t("submit_for_approval")}
              </Button>
            )}

            {(project?.approval_status === "draft" || project?.approval_status === "pending") && isSuperAdmin && (
              <Button variant="primary" onClick={onFinalApproveClick} size="sm">
                {t("final_approve")}
              </Button>
            )}

            {project?.approval_status === "draft" && !isSuperAdmin && !permissionsLoading && projectPermissions?.can_final_approve && (
              <Button variant="primary" onClick={onFinalApproveClick} size="sm">
                {t("final_approve")}
              </Button>
            )}

            {project?.approval_status === "pending" && !isSuperAdmin && (isManager || (!isManager && !permissionsLoading && projectPermissions?.can_approve)) && (
              <>
                <Button variant="primary" onClick={onApproveClick} size="sm">
                  {t("approve_stage")}
                </Button>
                {(isManager || projectPermissions?.can_reject) && (
                  <Button variant="danger" onClick={onRejectClick} size="sm">
                    {t("reject")}
                  </Button>
                )}
              </>
            )}

            {project?.approval_status === "approved" && (isSuperAdmin || (!isSuperAdmin && !permissionsLoading && projectPermissions?.can_final_approve)) && (
              <Button variant="primary" onClick={onFinalApproveClick} size="sm">
                {t("final_approve")}
              </Button>
            )}

            {project?.approval_status === "final_approved" && !permissionsLoading && projectPermissions?.can_revoke_final_approval && (
              <Button variant="danger" onClick={onRevokeFinalApprovalClick} size="sm">
                {t("revoke_final_approval")}
              </Button>
            )}

            {canDeleteProject && <div className="prj-view-header__action-sep" />}

            {canDeleteProject && (
              <Button variant="danger" onClick={onDeleteClick} size="sm">
                {t("delete_project")}
              </Button>
            )}
          </div>

        </div>

        {/* Right panel: project image or upload zone */}
        <div className="prj-view-header__right">
          {displayImageUrl ? (
            <>
              <img src={displayImageUrl} alt={t("project_image")} className="prj-view-header__right-img" />
              {uploading && <div className="prj-view-header__upload-overlay"><div className="prj-view-header__upload-spinner" /></div>}
            </>
          ) : (
            <div
              className={`prj-view-header__right-placeholder${isDragOver ? " prj-view-header__right-placeholder--dragover" : ""}${projectPermissions?.can_edit ? " prj-view-header__right-placeholder--editable" : ""}`}
              onClick={() => projectPermissions?.can_edit && fileInputRef.current?.click()}
              onDragOver={(e) => { if (projectPermissions?.can_edit) { e.preventDefault(); setIsDragOver(true); } }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={projectPermissions?.can_edit ? handleDrop : undefined}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
              />
              <div className="prj-view-header__upload-icon">
                <FiUpload />
              </div>
              <div className="prj-view-header__upload-body">
                <p className="prj-view-header__upload-label">
                  {projectPermissions?.can_edit ? t("no_render_uploaded_yet") : t("no_image")}
                </p>
                {projectPermissions?.can_edit && (
                  <p className="prj-view-header__upload-hint">{t("drag_or_click_upload")}</p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
});

export default ProjectViewHeader;
