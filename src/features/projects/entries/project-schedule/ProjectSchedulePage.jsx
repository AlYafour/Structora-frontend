import { useState, useEffect, useRef } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../../contexts/NotificationContext";
import { projectApi } from "../../../../services/projects";
import { logger } from "../../../../utils/logger";
import { handleError } from "../../../../utils/errorHandler";
import { formatDate } from "../../../../utils/formatters";
import PageLayout from "../../../../components/layout/PageLayout";
import FinancialActionBar from "../../../../components/common/FinancialActionBar";
import ProjectEntryInfo from "../../../../components/common/ProjectEntryInfo";
import DateInput from "../../../../components/forms/DateInput";
import StaticContractAttachmentFile from "../../wizard/components/StaticContractAttachmentFile";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';
import "../entries.css";

const FORM_ID = "project-schedule-form";

export default function ProjectSchedulePage() {
  const { projectId, itemId } = useParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(itemId || null);
  const [formData, setFormData] = useState({
    project_start_date: "",
    project_end_date: "",
    schedule_file: null,
    schedule_file_url: null,
    schedule_file_name: null,
  });
  const { success, error: showError } = useNotifications();
  const showToast = (type, msg) => type === "success" ? success(msg) : showError(msg);
  const navTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(navTimerRef.current);
  }, []);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    projectApi.getById(projectId).then(setProject).catch((err) => {
      logger.debug("Failed to load project", err);
    });
    try {
      const data = await projectApi.getProjectSchedule(projectId);
      if (data) {
        setExistingId(data.id);
        setFormData({
          project_start_date: data.project_start_date || "",
          project_end_date: data.project_end_date || "",
          schedule_file: null,
          schedule_file_url: data.schedule_file || null,
          schedule_file_name: data.schedule_file_name || null,
        });
      }
    } catch (err) {
      logger.debug("ProjectSchedulePage: load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.project_start_date) {
      showToast("error", t("project_start_date_required"));
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("project_start_date", formData.project_start_date);
      if (formData.schedule_file instanceof File) fd.append("schedule_file", formData.schedule_file);

      if (existingId) {
        await projectApi.updateProjectSchedule(projectId, existingId, fd);
      } else {
        await projectApi.saveProjectSchedule(projectId, fd);
      }
      showToast("success", t("save_success"));
      navTimerRef.current = setTimeout(() => navigate(`/projects/${projectId}?tab=project_schedule`), 1200);
    } catch (error) {
      const handledError = handleError(error, "ProjectSchedulePage.handleSubmit");
      logger.error("Error saving project schedule", handledError);
      showToast("error", handledError.message || t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => navigate(`/projects/${projectId}?tab=project_schedule`);

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="entry-form">
        <FinancialActionBar onBack={handleBack} saving={saving} formId={FORM_ID}>
          <ProjectEntryInfo project={project} />
        </FinancialActionBar>
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <div className="card">
            <div className="card__header">
              {existingId ? t("edit_project_schedule") : t("add_project_schedule")}
            </div>
            <div className="card__body">
              <div className="form-field">
                <label className="form-label required">{t("project_start_date")}</label>
                <DateInput
                  className="prj-input"
                  value={formData.project_start_date}
                  onChange={(value) => setFormData((prev) => ({ ...prev, project_start_date: value }))}
                />
              </div>
              
              <div className="form-field">
                <label className="form-label">{t("project_end_date")}</label>
                {formData.project_end_date && !formData.project_end_date?.includes("Invalid") ? (
                  <div className="date-display-readonly">
                    {formatDate(formData.project_end_date)}
                  </div>
                ) : (
                  <DateInput
                    className="prj-input"
                    value={formData.project_end_date}
                    onChange={(value) => setFormData((prev) => ({ ...prev, project_end_date: value }))}
                  />
                )}
              </div>
              
              <div className="form-field form-field-full">
                <StaticContractAttachmentFile
                  label={t("schedule_file")}
                  value={formData.schedule_file}
                  fileUrl={formData.schedule_file_url}
                  fileName={formData.schedule_file_name}
                  onChange={(file) => setFormData((prev) => ({ ...prev, schedule_file: file }))}
                  onRemoveExisting={() => setFormData((prev) => ({ ...prev, schedule_file: null, schedule_file_url: null, schedule_file_name: null }))}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  maxSizeMB={30}
                  isView={false}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/project-schedule/`}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}