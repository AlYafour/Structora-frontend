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
import ContractExtension from "../../wizard/components/ContractExtension";
import useTenantNavigate from '../../../../hooks/useTenantNavigate';

const FORM_ID = "extensions-form";

const EMPTY_EXTENSION = {
  reason: "",
  days: 0,
  months: 0,
  extension_date: "",
  approval_number: "",
  extension_period_from: "",
  extension_period_to: "",
  note: "",
  file: null,
  file_url: null,
  file_name: null,
  extension_file_delete: false,
  letter_attachments: [],
};

export default function ExtensionsPage() {
  const { projectId, extensionId } = useParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();

  const isNew = extensionId === undefined;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [extension, setExtension] = useState({ ...EMPTY_EXTENSION });
  const [project, setProject] = useState(null);
  const { success, error: showError } = useNotifications();
  const navTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(navTimerRef.current);
  }, []);

  useEffect(() => {
    projectApi.getById(projectId).then(setProject).catch((err) => {
      logger.debug("Failed to load project", err);
    });

    if (!isNew) {
      loadExtension();
    }
  }, [projectId, extensionId]);

  const loadExtension = async () => {
    setLoading(true);
    try {
      const data = await projectApi.getExtensions(projectId);
      const found = Array.isArray(data) ? data.find((e) => String(e.id) === String(extensionId)) : null;
      if (found) {
        setExtension({
          reason: found.reason || "",
          days: found.days || 0,
          months: found.months || 0,
          extension_date: found.extension_date || "",
          approval_number: found.approval_number || "",
          extension_period_from: found.extension_period_from || "",
          extension_period_to: found.extension_period_to || "",
          note: found.note || "",
          file: null,
          file_url: found.file_url || null,
          file_name: found.file_name || null,
          extension_file_delete: false,
          letter_attachments: Array.isArray(found.letter_attachments)
            ? found.letter_attachments.map((a) => ({ url: a.url || null, name: a.name || null, newFile: null }))
            : [],
        });
      }
    } catch (err) {
      logger.debug("ExtensionsPage: load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (_, field, value) => {
    setExtension((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();

      const payload = {
        reason: String(extension.reason || "").trim(),
        days: Number(extension.days) || 0,
        months: Number(extension.months) || 0,
        extension_date: extension.extension_date || null,
        approval_number: extension.approval_number || null,
        extension_period_from: extension.extension_period_from || null,
        extension_period_to: extension.extension_period_to || null,
        note: extension.note || null,
        file_url: extension.file_url || null,
        file_name: extension.file_name || null,
        extension_file_delete: Boolean(extension.extension_file_delete),
        letter_attachments: (extension.letter_attachments || [])
          .filter((a) => a.url || a.newFile)
          .map((a) => ({ url: a.url || null, name: a.name || null, is_new: a.newFile instanceof File })),
      };

      // Append scalar fields
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'letter_attachments') {
          formData.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      // Main approval file
      if (extension.file instanceof File) {
        formData.append("file", extension.file);
      }

      // New letter attachment files
      let newAttCounter = 0;
      (extension.letter_attachments || []).forEach((a) => {
        if (a.newFile instanceof File) {
          formData.append(`letter_attachment_new[${newAttCounter}]`, a.newFile);
          newAttCounter++;
        }
      });

      if (isNew) {
        await projectApi.createExtension(projectId, formData);
      } else {
        await projectApi.updateExtension(projectId, extensionId, formData);
      }

      success(t("save_success"));
      navTimerRef.current = setTimeout(() => navigate(`/projects/${projectId}?tab=extensions`), 1200);
    } catch (error) {
      const handledError = handleError(error, "ExtensionsPage.handleSubmit");
      logger.error("Error saving extension", handledError);
      showError(handledError.message || t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => navigate(`/projects/${projectId}?tab=extensions`);

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="entry-form">
        <FinancialActionBar onBack={handleBack} saving={saving} formId={FORM_ID}>
          <ProjectEntryInfo project={project} />
        </FinancialActionBar>
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <div className="card">
            <div className="card__header">
              <span>{isNew ? t("add_extension") : t("edit_extension")}</span>
            </div>
            <div className="card__body">
              <ContractExtension
                extension={extension}
                index={0}
                extensionIndex={0}
                isView={false}
                onUpdate={handleUpdate}
                onRemove={null}
                canRemove={false}
                projectId={projectId}
              />
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
