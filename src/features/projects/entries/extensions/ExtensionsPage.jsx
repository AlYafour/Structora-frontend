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
import Button from "../../../../components/common/Button";
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
  letter_attachments: [],
};

export default function ExtensionsPage() {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startOrderId, setStartOrderId] = useState(null);
  const [extensions, setExtensions] = useState([]);
  const [project, setProject] = useState(null);
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
    try {
      projectApi.getById(projectId).then(setProject).catch((err) => {
        logger.debug("Failed to load project", err);
      });
      const raw = await projectApi.getStartOrder(projectId);
      // API returns array for list endpoint; extract first item
      const data = Array.isArray(raw) && raw.length ? raw[0] : raw;
      if (data && data.id) {
        setStartOrderId(data.id);
        const currentExtensions = data.extensions
          ? data.extensions.map((ext) => ({
              reason: ext.reason || "",
              days: ext.days || 0,
              months: ext.months || 0,
              extension_date: ext.extension_date || "",
              approval_number: ext.approval_number || "",
              extension_period_from: ext.extension_period_from || "",
              extension_period_to: ext.extension_period_to || "",
              note: ext.note || "",
              file: null,
              file_url: ext.file_url || null,
              file_name: ext.file_name || null,
              letter_attachments: Array.isArray(ext.letter_attachments)
                ? ext.letter_attachments.map(a => ({ url: a.url || null, name: a.name || null, newFile: null }))
                : ext.letter_attachment_url
                  ? [{ url: ext.letter_attachment_url, name: ext.letter_attachment_name || null, newFile: null }]
                  : [],
              _isExisting: true,
            }))
          : [];
        // If no extensions yet, start with one empty
        setExtensions(currentExtensions.length > 0 ? currentExtensions : [{ ...EMPTY_EXTENSION }]);
      }
    } catch (err) {
      logger.debug("ExtensionsPage: load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExtension = () => {
    setExtensions((prev) => [...prev, { ...EMPTY_EXTENSION }]);
  };

  const handleUpdateExtension = (extIndex, field, value) => {
    setExtensions((prev) => {
      const updated = [...prev];
      updated[extIndex] = { ...updated[extIndex], [field]: value };
      return updated;
    });
  };

  const handleRemoveExtension = (extIndex) => {
    setExtensions((prev) => prev.filter((_, i) => i !== extIndex));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startOrderId) {
      showToast("error", t("start_order_required_for_extensions"));
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();

      // Clean extensions before sending (remove empty ones)
      const cleanExtensions = extensions
        .filter((ext) => {
          if (!ext || typeof ext !== "object") return false;
          const hasReason = ext.reason && String(ext.reason).trim() !== "";
          const hasDays = ext.days !== undefined && ext.days !== null && Number(ext.days) > 0;
          const hasMonths = ext.months !== undefined && ext.months !== null && Number(ext.months) > 0;
          const hasDate = ext.extension_date && String(ext.extension_date).trim() !== "";
          const hasApproval = ext.approval_number && String(ext.approval_number).trim() !== "";
          const hasFile = ext.file instanceof File || (ext.file_url && String(ext.file_url).trim() !== "");
          return hasReason || hasDays || hasMonths || hasDate || hasApproval || hasFile;
        })
        .map((ext) => ({
          reason: String(ext.reason || "").trim(),
          days: Number(ext.days) || 0,
          months: Number(ext.months) || 0,
          extension_date: ext.extension_date ? String(ext.extension_date).trim() : null,
          approval_number: ext.approval_number ? String(ext.approval_number).trim() : null,
          extension_period_from: ext.extension_period_from ? String(ext.extension_period_from).trim() : null,
          extension_period_to: ext.extension_period_to ? String(ext.extension_period_to).trim() : null,
          note: ext.note ? String(ext.note).trim() : null,
          file_url: ext.file_url || null,
          file_name: ext.file_name || null,
          letter_attachments: (ext.letter_attachments || [])
            .filter(a => a.url || a.newFile)
            .map(a => ({ url: a.url || null, name: a.name || null, is_new: a.newFile instanceof File })),
          _letter_attachment_files: (ext.letter_attachments || [])
            .filter(a => a.url || a.newFile)
            .map(a => (a.newFile instanceof File ? a.newFile : null)),
          _file: ext.file instanceof File ? ext.file : null,
        }));

      // Convert extensions to JSON (without _file fields)
      const extensionsForJson = cleanExtensions.map((ext) => ({
        reason: ext.reason,
        days: ext.days,
        months: ext.months,
        extension_date: ext.extension_date,
        approval_number: ext.approval_number,
        extension_period_from: ext.extension_period_from,
        extension_period_to: ext.extension_period_to,
        note: ext.note,
        file_url: ext.file_url,
        file_name: ext.file_name,
        letter_attachments: ext.letter_attachments || [],
      }));

      formData.append("extensions", JSON.stringify(extensionsForJson));

      // Add extension files
      cleanExtensions.forEach((ext, idx) => {
        if (ext._file instanceof File) {
          formData.append(`extensions[${idx}][file]`, ext._file);
        }
        // Send new attachment files with consecutive keys (no gaps)
        let newAttCounter = 0;
        (ext._letter_attachment_files || []).forEach((f) => {
          if (f instanceof File) {
            formData.append(`extensions[${idx}][letter_attachment_new][${newAttCounter}]`, f);
            newAttCounter++;
          }
        });
      });

      await projectApi.updateStartOrder(projectId, startOrderId, formData);

      showToast("success", t("save_success"));
      navTimerRef.current = setTimeout(() => navigate(`/projects/${projectId}?tab=extensions`), 1200);
    } catch (error) {
      const handledError = handleError(error, "ExtensionsPage.handleSubmit");
      logger.error("Error saving extensions", handledError);
      showToast("error", handledError.message || t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => navigate(`/projects/${projectId}?tab=extensions`);

  if (!loading && !startOrderId) {
    return (
      <PageLayout>
        <div className="entry-form">
          <FinancialActionBar onBack={handleBack} saving={false} formId={FORM_ID}>
            <ProjectEntryInfo project={project} />
          </FinancialActionBar>
          <div className="card">
            <div className="card__header">{t("extensions")}</div>
            <div className="card__body">
              <div className="prj-empty-state">
                {t("start_order_required_for_extensions")}
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout loading={loading} loadingText={t("loading")}>
      <div className="entry-form">
        <FinancialActionBar onBack={handleBack} saving={saving} formId={FORM_ID}>
          <ProjectEntryInfo project={project} />
        </FinancialActionBar>
        <form id={FORM_ID} onSubmit={handleSubmit}>
          <div className="card">
            <div className="card__header">
              <span>{t("extensions")}</span>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddExtension}>
                + {t("add_extension")}
              </Button>
            </div>
            <div className="card__body">
              {extensions.length > 0 ? (
                extensions.map((ext, idx) => (
                  <ContractExtension
                    key={ext.id || idx}
                    extension={ext}
                    index={idx}
                    extensionIndex={idx}
                    isView={false}
                    onUpdate={handleUpdateExtension}
                    onRemove={handleRemoveExtension}
                    canRemove={extensions.length > 1}
                    projectId={projectId}
                  />
                ))
              ) : (
                <div className="prj-empty-state">{t("no_extensions")}</div>
              )}
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
