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

const FORM_ID = "start-order-form";

export default function StartOrderPage() {
  const { projectId, itemId } = useParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();
  const isEditMode = !!itemId;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(itemId || null);
  const [formData, setFormData] = useState({
    start_order_date: "",
    start_order_notes: "",
    start_order_file: null,
    start_order_file_url: null,
    start_order_file_name: null,
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
      const raw = await projectApi.getStartOrder(projectId);
      // API returns array for list endpoint; extract first item
      const data = Array.isArray(raw) && raw.length ? raw[0] : raw;
      if (data) {
        setExistingId(data.id);
        setFormData({
          start_order_date: data.start_order_date || "",
          start_order_notes: data.start_order_notes || "",
          start_order_file: null,
          start_order_file_url: data.start_order_file || null,
          start_order_file_name: data.start_order_file_name || null,
        });
      }
    } catch (err) {
      logger.debug("StartOrderPage: load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      if (formData.start_order_date) fd.append("start_order_date", formData.start_order_date);
      if (formData.start_order_notes) fd.append("start_order_notes", formData.start_order_notes);
      if (formData.start_order_file instanceof File) fd.append("start_order_file", formData.start_order_file);

      if (existingId) {
        await projectApi.updateStartOrder(projectId, existingId, fd);
      } else {
        await projectApi.createStartOrder(projectId, fd);
      }
      showToast("success", t("save_success"));
      navTimerRef.current = setTimeout(() => navigate(`/projects/${projectId}?tab=start_order`), 1200);
    } catch (error) {
      const handledError = handleError(error, "StartOrderPage.handleSubmit");
      logger.error("Error saving start order", handledError);
      showToast("error", handledError.message || t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => navigate(`/projects/${projectId}?tab=start_order`);

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="entry-form">
        <FinancialActionBar onBack={handleBack} saving={saving} formId={FORM_ID}>
          <ProjectEntryInfo project={project} />
        </FinancialActionBar>
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <div className="card">
            <div className="card__header">
              {existingId ? t("edit_start_order") : t("add_start_order")}
            </div>
            <div className="card__body">
              <div>
                <label className="form-label">{t("start_order_date")}</label>
                <DateInput
                  className="prj-input"
                  value={formData.start_order_date}
                  onChange={(value) => setFormData((prev) => ({ ...prev, start_order_date: value }))}
                />
              </div>
              <StaticContractAttachmentFile
                label={t("start_order_file")}
                value={formData.start_order_file}
                fileUrl={formData.start_order_file_url}
                fileName={formData.start_order_file_name}
                onChange={(file) => setFormData((prev) => ({ ...prev, start_order_file: file }))}
                onRemoveExisting={() => setFormData((prev) => ({ ...prev, start_order_file: null, start_order_file_url: null, start_order_file_name: null }))}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                maxSizeMB={10}
                isView={false}
                projectId={projectId}
                endpoint={`projects/${projectId}/start-order/`}
              />
              <div>
                <label className="form-label">{t("start_order_notes")}</label>
                <textarea
                  className="prj-input"
                  rows={4}
                  value={formData.start_order_notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_order_notes: e.target.value }))}
                  placeholder={t("start_order_notes_placeholder")}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
