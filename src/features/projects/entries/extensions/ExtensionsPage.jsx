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
  letter_attachments: [],
};

export default function ExtensionsPage() {
  const { projectId, extensionIdx } = useParams();
  const { t } = useTranslation();
  const navigate = useTenantNavigate();

  const isNew = extensionIdx === undefined;
  const idx = isNew ? null : parseInt(extensionIdx, 10);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startOrderId, setStartOrderId] = useState(null);
  const [allExtensions, setAllExtensions] = useState([]);
  const [extension, setExtension] = useState({ ...EMPTY_EXTENSION });
  const [project, setProject] = useState(null);
  const { success, error: showError } = useNotifications();
  const navTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(navTimerRef.current);
  }, []);

  useEffect(() => {
    loadData();
  }, [projectId, extensionIdx]);

  const loadData = async () => {
    try {
      projectApi.getById(projectId).then(setProject).catch((err) => {
        logger.debug("Failed to load project", err);
      });
      const raw = await projectApi.getStartOrder(projectId);
      const data = Array.isArray(raw) && raw.length ? raw[0] : raw;
      if (data && data.id) {
        setStartOrderId(data.id);
        const existing = Array.isArray(data.extensions)
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
        setAllExtensions(existing);
        if (!isNew && idx !== null && existing[idx]) {
          setExtension(existing[idx]);
        } else {
          setExtension({ ...EMPTY_EXTENSION });
        }
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

    if (!startOrderId) {
      showError(t("start_order_required_for_extensions"));
      return;
    }

    setSaving(true);
    try {
      const updated = [...allExtensions];
      if (isNew) {
        updated.push(extension);
      } else {
        updated[idx] = extension;
      }

      const cleanExtensions = updated
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

      const formData = new FormData();

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

      cleanExtensions.forEach((ext, i) => {
        if (ext._file instanceof File) {
          formData.append(`extensions[${i}][file]`, ext._file);
        }
        let newAttCounter = 0;
        (ext._letter_attachment_files || []).forEach((f) => {
          if (f instanceof File) {
            formData.append(`extensions[${i}][letter_attachment_new][${newAttCounter}]`, f);
            newAttCounter++;
          }
        });
      });

      await projectApi.updateStartOrder(projectId, startOrderId, formData);

      success(t("save_success"));
      navTimerRef.current = setTimeout(() => navigate(`/projects/${projectId}?tab=extensions`), 1200);
    } catch (error) {
      const handledError = handleError(error, "ExtensionsPage.handleSubmit");
      logger.error("Error saving extensions", handledError);
      showError(handledError.message || t("save_error"));
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
              <span>{isNew ? t("add_extension") : t("edit_extension")}</span>
            </div>
            <div className="card__body">
              <ContractExtension
                extension={extension}
                index={isNew ? allExtensions.length : idx}
                extensionIndex={isNew ? allExtensions.length : idx}
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
