import { useState, useEffect, useRef } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../../contexts/NotificationContext";
import { projectApi } from "../../../../services/projects";
import { logger } from "../../../../utils/logger";
import { handleError } from "../../../../utils/errorHandler";
import PageLayout from "../../../../components/layout/PageLayout";
import FinancialActionBar from "../../../../components/common/FinancialActionBar";
import ProjectEntryInfo from "../../../../components/common/ProjectEntryInfo";
import DateInput from "../../../../components/forms/DateInput";
import StaticContractAttachmentFile from "../../wizard/components/StaticContractAttachmentFile";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';
import "../entries.css";

const FORM_ID = "excavation-notice-form";

export default function ExcavationNoticePage() {
  const { projectId, itemId } = useParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(itemId || null);
  const [formData, setFormData] = useState({
    notice_date: "",
    notice_file: null,
    notice_file_url: null,
    notice_file_name: null
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
      const data = await projectApi.getExcavationNotice(projectId);

      const item = itemId
        ? data.find((x) => String(x.id) === String(itemId))
        : data[0];

      if (item) {
        setExistingId(item.id);
        setFormData({
          notice_date: item.notice_date || "",
          notice_file: null,
          notice_file_url: item.notice_file || null,
          notice_file_name: item.notice_file_name || null,
        });
      }
    } catch (err) {
      // No data yet - that's fine for create mode
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      if (formData.notice_date) fd.append("notice_date", formData.notice_date);
      if (formData.notice_file instanceof File) fd.append("notice_file", formData.notice_file);

      if (existingId) {
        await projectApi.updateExcavationNotice(projectId, existingId, fd);
      } else {
        await projectApi.saveExcavationNotice(projectId, fd);
      }
      showToast("success", t("save_success"));
      navTimerRef.current = setTimeout(() => navigate(`/projects/${projectId}?tab=excavation_notice`), 1200);
    } catch (error) {
      const handledError = handleError(error, "ExcavationNoticePage.handleSubmit");
      logger.error("Error saving excavation notice", handledError);
      showToast("error", handledError.message || t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => navigate(`/projects/${projectId}?tab=excavation_notice`);

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="entry-form">
        <FinancialActionBar onBack={handleBack} saving={saving} formId={FORM_ID}>
          <ProjectEntryInfo project={project} />
        </FinancialActionBar>
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <div className="card">
            <div className="card__header">
              {existingId ? t("edit_excavation_notice") : t("add_excavation_notice")}
            </div>
            <div className="card__body">
              <div className="form-field">
                <label className="form-label">{t("notice_date")}</label>
                <DateInput
                  className="prj-input"
                  value={formData.notice_date}
                  onChange={(value) => setFormData((prev) => ({ ...prev, notice_date: value }))}
                />
              </div>

              {/* Placeholder for symmetry - you can add another field here if needed */}
              <div className="form-field">
                {/* Empty field to maintain two-column layout */}
              </div>

              <div className="form-field form-field-full">
                <StaticContractAttachmentFile
                  label={t("notice_file")}
                  value={formData.notice_file}
                  fileUrl={formData.notice_file_url}
                  fileName={formData.notice_file_name}
                  onChange={(file) => setFormData((prev) => ({ ...prev, notice_file: file }))}
                  onRemoveExisting={() => setFormData((prev) => ({ ...prev, notice_file: null, notice_file_url: null, notice_file_name: null }))}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  maxSizeMB={30}
                  isView={false}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/excavation-notice/`}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}