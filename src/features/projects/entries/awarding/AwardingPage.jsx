import { useState, useEffect, useRef } from "react";
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../../contexts/NotificationContext";
import { api } from "../../../../services/api";
import { projectApi } from "../../../../services/projects";
import { logger } from "../../../../utils/logger";
import { handleError, getErrorMessage } from "../../../../utils/errorHandler";
import { toIsoDate, toInputDate } from "../../../../utils/formatters";
import PageLayout from "../../../../components/layout/PageLayout";
import FinancialActionBar from "../../../../components/common/FinancialActionBar";
import ProjectEntryInfo from "../../../../components/common/ProjectEntryInfo";
import DateInput from "../../../../components/forms/DateInput";
import StaticContractAttachmentFile from "../../wizard/components/StaticContractAttachmentFile";
import useContractorDefaults from "../../wizard/hooks/useContractorDefaults";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';
import "../entries.css";

const FORM_ID = "awarding-form";

export default function AwardingPage() {
  const { projectId, itemId } = useParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(itemId || null);
  const [formData, setFormData] = useState({
    award_date: "",
    project_number: "",
    consultant_registration_number: "",
    contractor_registration_number: "",
    awarding_file: null,
    awarding_file_url: null,
    awarding_file_name: null,
    awarding_file_cleared: false,
  });
  const { success, error: showError } = useNotifications();
  const showToast = (type, msg) => type === "success" ? success(msg) : showError(msg);
  const navTimerRef = useRef(null);

  const setAwardingField = (key, value) => {
    setFormData(prev => {
      if (prev[key]) return prev;
      return { ...prev, [key]: value };
    });
  };
  useContractorDefaults(projectId, setAwardingField, {
    contractor_registration_number: "contractor_registration_number",
  });

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
      const { data } = await api.get(`projects/${projectId}/awarding/`);
      if (Array.isArray(data) && data.length) {
        const s = data[0];
        setExistingId(s.id);
        setFormData({
          award_date: toInputDate(s.award_date) || "",
          project_number: s.project_number || "",
          consultant_registration_number: s.consultant_registration_number || "",
          contractor_registration_number: s.contractor_registration_number || "",
          awarding_file: null,
          awarding_file_url: s.awarding_file || null,
          awarding_file_name: s.awarding_file_name || null,
        });
      }
    } catch (e) {
      if (e?.response?.status !== 404) {
        logger.error("Error loading awarding", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      if (formData.award_date) fd.append("award_date", toIsoDate(formData.award_date));
      if (formData.project_number) fd.append("project_number", formData.project_number);
      if (formData.consultant_registration_number) fd.append("consultant_registration_number", formData.consultant_registration_number);
      if (formData.contractor_registration_number) fd.append("contractor_registration_number", formData.contractor_registration_number);
      if (formData.awarding_file instanceof File) {
        fd.append("awarding_file", formData.awarding_file);
      } else if (formData.awarding_file_cleared) {
        fd.append("awarding_file_delete", "true");
      }

      if (existingId) {
        await api.patch(`projects/${projectId}/awarding/${existingId}/`, fd);
      } else {
        const response = await api.post(`projects/${projectId}/awarding/`, fd);
        if (response?.data?.id) setExistingId(response.data.id);
      }

      window.dispatchEvent(new CustomEvent("awarding-updated", { detail: { projectId } }));
      showToast("success", t("save_success"));
      navTimerRef.current = setTimeout(() => navigate(`/projects/${projectId}?tab=awarding`), 1200);
    } catch (error) {
      const msg = getErrorMessage(error);
      logger.error("Error saving awarding", error);
      showToast("error", msg || t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => navigate(`/projects/${projectId}?tab=awarding`);

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="entry-form">
        <FinancialActionBar onBack={handleBack} saving={saving} formId={FORM_ID}>
          <ProjectEntryInfo project={project} />
        </FinancialActionBar>
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <div className="card">
            <div className="card__header">
              {existingId ? t("edit_awarding") : t("add_awarding")}
            </div>
            <div className="card__body">
              <div className="form-field">
                <label className="form-label">{t("award_date")}</label>
                <DateInput
                  className="prj-input"
                  value={formData.award_date}
                  onChange={(value) => setFormData((prev) => ({ ...prev, award_date: value }))}
                />
              </div>
              
              <div className="form-field">
                <label className="form-label">{t("project_number")}</label>
                <input
                  className="prj-input"
                  type="text"
                  value={formData.project_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, project_number: e.target.value }))}
                  placeholder={t("enter_project_number")}
                />
              </div>
              
              <div className="form-field">
                <label className="form-label">{t("consultant_registration_number")}</label>
                <input
                  className="prj-input"
                  type="text"
                  value={formData.consultant_registration_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, consultant_registration_number: e.target.value }))}
                  placeholder={t("enter_consultant_registration_number")}
                />
              </div>
              
              <div className="form-field">
                <label className="form-label">{t("contractor_registration_number")}</label>
                <input
                  className="prj-input"
                  type="text"
                  value={formData.contractor_registration_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contractor_registration_number: e.target.value }))}
                  placeholder={t("enter_contractor_registration_number")}
                />
              </div>
              
              <div className="form-field form-field-full">
                <StaticContractAttachmentFile
                  label={t("awarding_file")}
                  value={formData.awarding_file}
                  fileUrl={formData.awarding_file_url}
                  fileName={formData.awarding_file_name}
                  onChange={(file) => setFormData((prev) => ({ ...prev, awarding_file: file }))}
                  onRemoveExisting={() => setFormData((prev) => ({ ...prev, awarding_file: null, awarding_file_url: null, awarding_file_name: null, awarding_file_cleared: true }))}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  maxSizeMB={30}
                  isView={false}
                  projectId={projectId}
                  endpoint={`projects/${projectId}/awarding/`}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}