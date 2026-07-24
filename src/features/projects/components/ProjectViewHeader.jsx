import { memo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronLeft, FiDownload, FiEdit3, FiImage } from "react-icons/fi";
import Button from "../../../components/common/Button";
import ActionMenu from "../../../components/common/ActionMenu";
import { formatDate } from "../../../utils/formatters";
import { formatInternalCode } from "../../../utils/formatters/id";
import { buildFileUrl } from "../../../utils/helpers/file";
import { api, updateFile } from "../../../services/api";
import { useNotifications } from "../../../contexts/NotificationContext";
import { useLanguage } from "../../../hooks";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDateWithMonth = (dateStr) => {
  if (!dateStr) return "—";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";

    const dd = String(date.getDate()).padStart(2, "0");
    const month = MONTH_LABELS[date.getMonth()];
    const yyyy = date.getFullYear();
    return `${dd}/ ${month} / ${yyyy}`;
  } catch {
    return "—";
  }
};

const ProjectViewHeader = memo(function ProjectViewHeader({
  project,
  projectId,
  projectPermissions,
  activeTab: _activeTab,
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
  projectSchedule,
  extensions = [],
}) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [monthDateIds, setMonthDateIds] = useState({});
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
    } catch (_error) {
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
  const canonicalCode = project?.project_code || project?.internal_code;
  const titleText = canonicalCode
    ? `${t("project_view_internal_code")}: ${formatInternalCode(canonicalCode)}`
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
      handover_stage: { label: t("status_handover_stage"), variant: "warning" },
      pending_financial_closure: { label: t("status_pending_financial_closure"), variant: "warning" },
      completed: { label: t("status_completed"), variant: "success" },
      draft: { label: t("draft"), variant: "default" },
      in_progress: { label: t("in_progress"), variant: "primary" },
    };
    return statusMap[project.status] || null;
  };

  const statusInfo = getStatusInfo();
  const legacyCode = String(project?.legacy_code || "").trim();
  const hasDurationExtensions = (items) =>
    Array.isArray(items) && items.some((ext) => (Number(ext?.days) || 0) > 0 || (Number(ext?.months) || 0) > 0);
  const hasScheduleExtensions = hasDurationExtensions(extensions);
  const headerDates = [
    projectSchedule?.project_start_date && {
      id: "schedule-start-date",
      label: t("schedule_start_date_label"),
      value: monthDateIds["schedule-start-date"]
        ? formatDateWithMonth(projectSchedule.project_start_date)
        : formatDate(projectSchedule.project_start_date),
    },
    projectSchedule?.project_end_date && {
      id: "schedule-end-date",
      label: t(hasScheduleExtensions ? "project_end_date_calculated" : "schedule_end_date_label"),
      value: monthDateIds["schedule-end-date"]
        ? formatDateWithMonth(projectSchedule.project_end_date)
        : formatDate(projectSchedule.project_end_date),
    },
  ].filter(Boolean);

  const toggleHeaderDateFormat = (dateId) => {
    setMonthDateIds((prev) => ({
      ...prev,
      [dateId]: !prev[dateId],
    }));
  };

  const handleHeaderDateKeyDown = (event, dateId) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleHeaderDateFormat(dateId);
  };

  // Consolidated workflow actions for the "..." menu — same conditions as before, just relocated
  const menuItems = [];

  if (!permissionsLoading && projectPermissions?.can_submit && project?.approval_status === "draft" && !isSuperAdmin) {
    menuItems.push({ label: t("submit_for_approval"), onClick: onSubmitClick, type: "button", variant: "success" });
  }

  const showFinalApprove =
    ((project?.approval_status === "draft" || project?.approval_status === "pending") && isSuperAdmin) ||
    (project?.approval_status === "draft" && !isSuperAdmin && !permissionsLoading && projectPermissions?.can_final_approve) ||
    (project?.approval_status === "approved" && (isSuperAdmin || (!isSuperAdmin && !permissionsLoading && projectPermissions?.can_final_approve)));

  if (showFinalApprove) {
    menuItems.push({ label: t("final_approve"), onClick: onFinalApproveClick, type: "button", variant: "success" });
  }

  if (project?.approval_status === "pending" && !isSuperAdmin && (isManager || (!isManager && !permissionsLoading && projectPermissions?.can_approve))) {
    menuItems.push({ label: t("approve_stage"), onClick: onApproveClick, type: "button", variant: "success" });
    if (isManager || projectPermissions?.can_reject) {
      menuItems.push({ label: t("reject"), onClick: onRejectClick, type: "button", variant: "danger" });
    }
  }

  if (project?.approval_status === "final_approved" && !permissionsLoading && projectPermissions?.can_revoke_final_approval) {
    menuItems.push({ label: t("revoke_final_approval"), onClick: onRevokeFinalApprovalClick, type: "button", variant: "danger" });
  }

  if (canDeleteProject) {
    if (menuItems.length > 0) {
      menuItems.push({ type: "divider" });
    }
    menuItems.push({ label: t("delete_project"), onClick: onDeleteClick, type: "button", variant: "danger" });
  }

  return (
    <div className="prj-view-header">

      {/* Topbar: back link + attachments/edit/kebab actions */}
      <div className="prj-view-header__topbar">
        <div className="prj-view-header__topbar-left">
          <Button
            as={Link}
            variant="ghost"
            to="/projects"
            size="sm"
            className="prj-view-header__back-link"
            startIcon={<FiChevronLeft aria-hidden="true" />}
          >
            {t("back_to_projects")}
          </Button>
        </div>
        <div className="prj-view-header__topbar-right">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            loading={downloading}
            startIcon={<FiDownload />}
          >
            {downloading ? t("downloading") : t("attachments")}
          </Button>
          {projectPermissions?.can_edit && (
            <Button as={Link} to={`/projects/${projectId}/wizard?step=setup&mode=edit`} variant="accent" size="sm" startIcon={<FiEdit3 />}>
              {t("edit")}
            </Button>
          )}
          {menuItems.length > 0 && <ActionMenu items={menuItems} />}
        </div>
      </div>

      <div className="prj-view-header__main">

        {/* Identity: badges, name, codes */}
        <div className="prj-view-header__main-left">
          <div className="prj-view-header__badges">
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
            {statusInfo && (
              <span className={`prj-view-header__status prj-view-header__status--${statusInfo.variant}`}>
                {statusInfo.label}
              </span>
            )}
          </div>

          <div className="prj-view-header__identity">
            {(nameAr || nameEn) ? (
              <h1 className="prj-view-header__name-primary">
                {isAR ? (nameAr || nameEn) : (nameEn || nameAr)}
              </h1>
            ) : (
              <h1 className="prj-view-header__name-primary">{titleText}</h1>
            )}
          </div>

          {nameAr && nameEn && nameAr !== nameEn && (
            <p className="prj-view-header__name-secondary">
              {isAR ? nameEn : nameAr}
            </p>
          )}

          {legacyCode && (
            <div className="prj-view-header__codes">
              <span
                className="prj-view-header__legacy-code"
                tabIndex={0}
                aria-label={`${t("legacy_project_code")}: ${legacyCode}`}
              >
                <span className="prj-view-header__legacy-label">
                  {t("legacy_project_code")}:
                </span>
                <span className="prj-view-header__legacy-value">{legacyCode}</span>
              </span>
            </div>
          )}
        </div>

        {/* Stats: contract code + schedule dates */}
        {(canonicalCode || headerDates.length > 0) && (
          <div className="prj-view-header__stats" aria-label={t("project_schedule")}>
            {canonicalCode && (
              <div className="prj-view-header__date-item">
                <span className="prj-view-header__date-label">{t("project_view_internal_code")}</span>
                <span className="prj-view-header__date-value">{formatInternalCode(canonicalCode)}</span>
              </div>
            )}
            {headerDates.map((item) => (
              <div className={`prj-view-header__date-item prj-view-header__date-item--${item.id}`} key={item.id}>
                <span className="prj-view-header__date-label">{item.label}</span>
                <span
                  className="prj-view-header__date-value prj-view-header__date-value--toggle"
                  onDoubleClick={() => toggleHeaderDateFormat(item.id)}
                  onKeyDown={(event) => handleHeaderDateKeyDown(event, item.id)}
                  role="button"
                  tabIndex={0}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Project image or upload zone */}
        <div className="prj-view-header__photo">
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
                <FiImage />
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
