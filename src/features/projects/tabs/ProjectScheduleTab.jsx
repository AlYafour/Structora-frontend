import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { formatDate } from "../../../utils/formatters";
import { extractFileNameFromUrl } from "../../../utils/helpers/file";
import FileAttachmentView from "../../../components/file-upload/FileAttachmentView";
import { useAuth } from "../../../contexts/AuthContext";

const hasDurationExtensions = (extensions) =>
  Array.isArray(extensions) && extensions.some((ext) => (Number(ext?.days) || 0) > 0 || (Number(ext?.months) || 0) > 0);

const ProjectScheduleTab = memo(function ProjectScheduleTab({ projectId, projectSchedule, startOrder, extensions = [] }) {
  const { t } = useTranslation();
  const { hasPermission, isAdmin } = useAuth();
  const hasData = !!projectSchedule;
  const hasExtensions = hasDurationExtensions(extensions) || hasDurationExtensions(startOrder?.extensions);
  const canAddProjectSchedule = isAdmin || hasPermission("projects.add_project_schedule");

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          {hasData ? (
            <>
              <Button as={Link} to={`/projects/${projectId}/project-schedule/view`} variant="secondary" size="md">
                {t("view")}
              </Button>
              <Button as={Link} to={`/projects/${projectId}/project-schedule/${projectSchedule.id}/edit`} variant="primary" size="md">
                {t("edit")}
              </Button>
            </>
          ) : canAddProjectSchedule ? (
            <Button as={Link} to={`/projects/${projectId}/project-schedule/create`} variant="primary" size="md">
              {t("add")}
            </Button>
          ) : null}
        </div>
      </div>
      {hasData ? (
        <>
          <div className="ds-grid-auto-240 ds-mt-4">
            {projectSchedule.project_start_date && (
              <Card className="ds-info-card">
                <div className="prj-info-label">{t("project_start_date")}</div>
                <div className="prj-info-value">{formatDate(projectSchedule.project_start_date)}</div>
              </Card>
            )}
            {projectSchedule.project_end_date && (
              <Card className="ds-info-card">
                <div className="prj-info-label">
                  {t(hasExtensions ? "project_end_date_calculated" : "project_end_date")}
                </div>
                <div className="prj-info-value">{formatDate(projectSchedule.project_end_date)}</div>
              </Card>
            )}
          </div>

          {projectSchedule.schedule_file && (
            <div className="ds-mt-5">
              <h3 className="prj-section-heading">{t("attachments")}</h3>
              <Card className="ds-p-5">
                <div className="prj-info-label ds-mb-3">{t("schedule_file")}</div>
                <FileAttachmentView
                  fileUrl={projectSchedule.schedule_file}
                  fileName={projectSchedule.schedule_file_name || extractFileNameFromUrl(projectSchedule.schedule_file)}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/project-schedule/`}
                />
              </Card>
            </div>
          )}
        </>
      ) : (
        <div className="prj-empty-state">
          {t("project_schedule_not_added")}
        </div>
      )}
    </div>
  );
});

export default ProjectScheduleTab;
