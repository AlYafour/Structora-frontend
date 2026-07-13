import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { aiAssistantApi } from "./aiAssistantApi";
import useTenantNavigate from "../../hooks/useTenantNavigate";
import { useDownloadVariationPDFs } from "../../hooks/useDownloadVariationPDFs";
import { useDownloadFinancialPDFs } from "../../hooks/useDownloadFinancialPDFs";
import { downloadFile } from "../../utils/helpers/file";
import FileUpload from "../../components/file-upload/FileUpload";
import "./AiAssistantModal.css";

const SESSION_KEY = "ai_assistant_shown";
const MESSAGES_KEY  = "ai_assistant_messages";
const OPEN_KEY      = "ai_assistant_open";

const EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
].join(",");

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
const MAX_IMAGE_MB = 10;

function FileSlot({ label, required, file, onChange, disabled }) {
  const { t } = useTranslation();
  return (
    <div className="ai-file-slot">
      <div className="ai-file-slot-label">
        {label}
        {required ? (
          <span className="ai-file-badge required">{t("ai_assistant_required")}</span>
        ) : (
          <span className="ai-file-badge optional">{t("ai_assistant_optional")}</span>
        )}
      </div>
      <FileUpload
        value={file}
        onChange={onChange}
        accept="application/pdf,image/jpeg,image/png,image/webp"
        maxSizeMB={30}
        disabled={disabled}
        showPreview={false}
        label=""
      />
    </div>
  );
}

function ActionConfirmBar({ pendingAction, onConfirm, onCancel, loading, language }) {
  const isAR = language === "ar";
  return (
    <div className="ai-action-confirm-bar">
      <button
        className="ai-confirm-btn"
        onClick={onConfirm}
        disabled={loading}
      >
        {isAR ? "✓ تأكيد" : "✓ Confirm"}
      </button>
      <button
        className="ai-cancel-action-btn"
        onClick={onCancel}
        disabled={loading}
      >
        {isAR ? "✕ إلغاء" : "✕ Cancel"}
      </button>
    </div>
  );
}

function ExcelPreviewBlock({ preview, onConfirm, onCancel, loading, language }) {
  const isAR = language === "ar";
  const { data_type, count, records } = preview;
  return (
    <div className="ai-excel-preview">
      <div className="ai-excel-preview-header">
        {isAR
          ? `تم قراءة ${count} سجل من نوع "${data_type}". هل تريد الحفظ؟`
          : `Found ${count} ${data_type} record(s). Confirm to save?`}
      </div>
      <div className="ai-excel-preview-rows">
        {records.slice(0, 5).map((rec, i) => (
          <div key={i} className="ai-excel-preview-row">
            {Object.entries(rec.input)
              .filter(([k, v]) => v !== null && v !== "" && k !== "project_id")
              .map(([k, v]) => (
                <span key={k} className="ai-excel-chip">
                  <b>{k}</b>: {String(v)}
                </span>
              ))}
          </div>
        ))}
        {records.length > 5 && (
          <div className="ai-excel-more">
            {isAR ? `... و ${records.length - 5} سجل آخر` : `... and ${records.length - 5} more`}
          </div>
        )}
      </div>
      <div className="ai-action-confirm-bar">
        <button className="ai-confirm-btn" onClick={onConfirm} disabled={loading}>
          {isAR ? "✓ حفظ الكل" : "✓ Save All"}
        </button>
        <button className="ai-cancel-action-btn" onClick={onCancel} disabled={loading}>
          {isAR ? "✕ إلغاء" : "✕ Cancel"}
        </button>
      </div>
    </div>
  );
}

export default function AiAssistantModal({ projectId = null }) {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const lang = isAR ? "ar" : "en";

  // Restore open/closed state — fall back to login auto-open logic if never saved
  const [isOpen, setIsOpen] = useState(() => {
    const saved = sessionStorage.getItem(OPEN_KEY);
    if (saved !== null) return saved === "true";
    return !sessionStorage.getItem(SESSION_KEY);
  });

  // Restore messages — strip stale validation messages from previous session
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(MESSAGES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(m => !m.isValidation);
        }
      }
    } catch {}
    return [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Project creation flow
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadInsertIndex, setUploadInsertIndex] = useState(-1);
  const [aiPreviewData, setAiPreviewData] = useState(null);
  const [aiValidationIssues, setAiValidationIssues] = useState([]);
  const [files, setFiles] = useState({
    site_plan: null, owner_id: null, build_permit: null, contract: null,
  });

  // Tool action confirmation
  const [pendingAction, setPendingAction] = useState(null);

  // Assistant-suggested navigation (e.g. "take me to create a variation")
  const [pendingNavigate, setPendingNavigate] = useState(null);

  // Assistant-suggested download — either a generated variation PDF
  // ({ project_id, variation_id, hide_signatures, label }), a stored project
  // document ({ project_id, file_url, file_name, label }), or an invoice/payment/
  // receipt-voucher PDF ({ project_id, invoice_id|payment_id|voucher_id, label })
  const [pendingDownload, setPendingDownload] = useState(null);
  const [docDownloading, setDocDownloading] = useState(false);
  const { downloadSingle, singleLoading } = useDownloadVariationPDFs(pendingDownload?.project_id || projectId);
  const { downloadSingle: downloadFinancialSingle, singleLoading: financialSingleLoading } = useDownloadFinancialPDFs(pendingDownload?.project_id || projectId);

  // Excel import
  const [excelPreview, setExcelPreview] = useState(null);
  const [attachedExcelFile, setAttachedExcelFile] = useState(null);
  const excelInputRef = useRef(null);

  // Image attachment (paste or click-to-browse screenshot)
  const [attachedImage, setAttachedImage] = useState(null); // { file, previewUrl }
  const imageInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const lastMsgRef = useRef(null);
  const inputRef = useRef(null);

  // Add greeting only if no messages were restored from sessionStorage
  useEffect(() => {
    setMessages((prev) =>
      prev.length === 0 ? [{ role: "ai", text: t("ai_assistant_greeting") }] : prev
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist messages to sessionStorage so they survive remounts.
  // Blob preview URLs die with the page, so strip them rather than persist dead references.
  useEffect(() => {
    try {
      const toStore = messages.map(({ imageUrl, ...rest }) => rest);
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(toStore));
    } catch {}
  }, [messages]);

  // Persist open/closed state
  useEffect(() => {
    sessionStorage.setItem(OPEN_KEY, String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "ai") {
        return [{ role: "ai", text: t("ai_assistant_greeting") }];
      }
      return prev;
    });
  }, [i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a new message arrives, scroll to the last message so it's visible even if upload block is below
  useEffect(() => {
    if (messages.length > 0) {
      lastMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages]);

  // For all other state changes (upload block appearing, loading, etc.) scroll to the very bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [showFileUpload, loading, pendingAction, excelPreview]);

  // Track which message index the upload block was inserted after, so responses render below it
  useEffect(() => {
    if (showFileUpload) {
      setUploadInsertIndex(prev => prev === -1 ? messages.length - 1 : prev);
    } else {
      setUploadInsertIndex(-1);
    }
  }, [showFileUpload, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, loading]);

  const buildHistory = useCallback((msgs) => {
    return msgs
      .filter((m) => m.role === "user" || m.role === "ai")
      .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
  }, []);

  const pushMessage = useCallback((role, text) => {
    setMessages((prev) => [...prev, { role, text }]);
  }, []);

  const clearActionState = () => {
    setPendingAction(null);
    setExcelPreview(null);
    setPendingNavigate(null);
    setPendingDownload(null);
  };

  const handleDownloadPdf = async () => {
    if (!pendingDownload || singleLoading || docDownloading || financialSingleLoading) return;
    // Keep pendingDownload set while the download runs so the button stays visible
    // showing its "Downloading..." state; only clear it once finished.
    if (pendingDownload.file_url) {
      setDocDownloading(true);
      try {
        await downloadFile(pendingDownload.file_url, pendingDownload.file_name);
      } finally {
        setDocDownloading(false);
        setPendingDownload(null);
      }
      return;
    }
    if (pendingDownload.invoice_id || pendingDownload.payment_id || pendingDownload.voucher_id || pendingDownload.tax_invoice_id) {
      const documentType = pendingDownload.invoice_id
        ? "invoice"
        : pendingDownload.payment_id
        ? "payment"
        : pendingDownload.voucher_id
        ? "receiptVoucher"
        : "taxInvoice";
      const itemId = pendingDownload.invoice_id || pendingDownload.payment_id || pendingDownload.voucher_id || pendingDownload.tax_invoice_id;
      try {
        await downloadFinancialSingle(itemId, { documentType });
      } finally {
        setPendingDownload(null);
      }
      return;
    }
    const { variation_id, hide_signatures } = pendingDownload;
    try {
      await downloadSingle({ id: variation_id }, { hideSignatures: hide_signatures });
    } finally {
      setPendingDownload(null);
    }
  };

  // ── Send chat message ───────────────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if ((!query && !attachedExcelFile && !attachedImage) || loading) return;

    clearActionState();
    setInput("");

    // If a file is attached, process it (Excel import flow)
    if (attachedExcelFile) {
      const file = attachedExcelFile;
      setAttachedExcelFile(null);
      await processExcelAttachment(file, query);
      return;
    }

    // If an image is attached, process it (vision chat flow)
    if (attachedImage) {
      const staged = attachedImage;
      setAttachedImage(null);
      await processImageAttachment(staged, query);
      return;
    }

    // Normal chat message
    const newUserMsg = { role: "user", text: query };
    setMessages((prev) => {
      const updated = [...prev, newUserMsg];
      const history = buildHistory(prev);
      setLoading(true);
      aiAssistantApi
        .sendMessage(query, lang, history, projectId)
        .then((data) => {
          pushMessage("ai", data.message);
          if (data.show_file_upload) {
            setShowFileUpload(true);
            setAiPreviewData(null);
            setFiles({ site_plan: null, owner_id: null, build_permit: null, contract: null });
          }
          if (data.pending_action) {
            setPendingAction(data.pending_action);
          }
          if (data.navigate) {
            setPendingNavigate(data.navigate);
          }
          if (data.download) {
            setPendingDownload(data.download);
          }
        })
        .catch(() => pushMessage("ai", t("ai_assistant_error")))
        .finally(() => setLoading(false));
      return updated;
    });
  };

  // ── Confirm tool action ─────────────────────────────────────────────────
  const handleConfirmAction = async () => {
    if (!pendingAction || loading) return;
    setLoading(true);
    const actionToRun = pendingAction;
    setPendingAction(null);

    try {
      const result = await aiAssistantApi.executeAction(actionToRun, projectId, lang);
      pushMessage("ai", result.message);
    } catch (err) {
      const msg = err?.response?.data?.message || t("ai_assistant_error");
      pushMessage("ai", (isAR ? "❌ فشل: " : "❌ Failed: ") + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAction = () => {
    clearActionState();
    pushMessage("ai", isAR ? "تم الإلغاء." : "Cancelled.");
  };

  // ── Excel file selected — just attach, don't upload yet ────────────────
  const handleExcelFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAttachedExcelFile(file);
    setAttachedImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  };

  const handleRemoveAttachment = () => setAttachedExcelFile(null);

  // ── Image staged for the vision chat flow — shared by click-to-browse and paste ──
  const stageImageFile = (file) => {
    if (!file || !IMAGE_TYPES.includes(file.type)) {
      pushMessage("ai", isAR ? "نوع الصورة غير مدعوم." : "Unsupported image type.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      pushMessage("ai", isAR ? `حجم الصورة كبير جداً (الحد ${MAX_IMAGE_MB} ميجابايت).` : `Image is too large (${MAX_IMAGE_MB}MB max).`);
      return;
    }
    setAttachedExcelFile(null);
    setAttachedImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) stageImageFile(file);
  };

  const handleRemoveImageAttachment = () => {
    setAttachedImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  };

  const handlePaste = (e) => {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
    if (!item) return;
    e.preventDefault();
    stageImageFile(item.getAsFile());
  };

  // ── Process attached Excel (called from handleSend) ─────────────────────
  const processExcelAttachment = async (file, userMessage) => {
    const fname = file.name;
    const displayMsg = userMessage
      ? `📎 ${fname} — ${userMessage}`
      : `📎 ${fname}`;
    pushMessage("user", displayMsg);
    pushMessage("ai", isAR ? "جاري قراءة الملف..." : "Reading file...");
    setLoading(true);
    try {
      const preview = await aiAssistantApi.importExcel(file, {
        projectId,
        dataType: "auto",
        dryRun: true,
        language: lang,
      });
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "ai",
          text: isAR
            ? `تم قراءة **${preview.count}** سجل (${preview.data_type}). راجع التفاصيل أدناه وأكد الحفظ.`
            : `Found **${preview.count}** ${preview.data_type} record(s). Review below and confirm.`,
        };
        return copy;
      });
      setExcelPreview({ ...preview, _file: file });
    } catch (err) {
      const msg = err?.response?.data?.error || t("ai_assistant_error");
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "ai", text: "❌ " + msg };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Process attached image (called from handleSend) ─────────────────────
  const processImageAttachment = async ({ file, previewUrl }, userMessage) => {
    const newUserMsg = { role: "user", text: userMessage, imageUrl: previewUrl };
    setMessages((prev) => {
      const updated = [...prev, newUserMsg];
      const history = buildHistory(prev);
      setLoading(true);
      aiAssistantApi
        .sendMessageWithImage(userMessage, lang, history, projectId, file)
        .then((data) => {
          pushMessage("ai", data.message);
          if (data.show_file_upload) {
            setShowFileUpload(true);
            setAiPreviewData(null);
            setFiles({ site_plan: null, owner_id: null, build_permit: null, contract: null });
          }
          if (data.pending_action) {
            setPendingAction(data.pending_action);
          }
          if (data.navigate) {
            setPendingNavigate(data.navigate);
          }
          if (data.download) {
            setPendingDownload(data.download);
          }
        })
        .catch(() => pushMessage("ai", t("ai_assistant_error")))
        .finally(() => setLoading(false));
      return updated;
    });
  };

  // ── Confirm Excel import ────────────────────────────────────────────────
  const handleConfirmExcel = async () => {
    if (!excelPreview || loading) return;
    setLoading(true);
    const file = excelPreview._file;
    const dataType = excelPreview.data_type;
    setExcelPreview(null);

    try {
      const result = await aiAssistantApi.importExcel(file, {
        projectId,
        dataType,
        dryRun: false,
        language: lang,
      });
      pushMessage("ai", result.message);
    } catch (err) {
      const msg = err?.response?.data?.error || t("ai_assistant_error");
      pushMessage("ai", (isAR ? "❌ فشل: " : "❌ Failed: ") + msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Project creation flow ───────────────────────────────────────────────
  const canCreate = files.site_plan && files.owner_id && files.contract;

  const handleCreate = async () => {
    if (!canCreate || loading) return;
    setLoading(true);
    pushMessage("user", t("ai_assistant_create_confirm"));
    pushMessage("ai", t("ai_assistant_creating"));
    try {
      const data = await aiAssistantApi.createProject(files, lang);
      if (data.success && data.preview) {
        setAiPreviewData(data.preview);
        setAiValidationIssues(data.validation_issues || []);
        setShowFileUpload(false);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "ai", text: data.message };
          return copy;
        });
      } else {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "ai", text: data.error || t("ai_assistant_create_failed") };
          return copy;
        });
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || t("ai_assistant_error");
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "ai", text: errMsg };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    sessionStorage.removeItem(MESSAGES_KEY);
    setMessages([{ role: "ai", text: t("ai_assistant_greeting") }]);
    setShowFileUpload(false);
    setAiPreviewData(null);
    setAiValidationIssues([]);
    setFiles({ site_plan: null, owner_id: null, build_permit: null, contract: null });
    setInput("");
    setAttachedExcelFile(null);
    setAttachedImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    clearActionState();
  };

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setIsOpen(false);
  };

  const handleOpen = () => {
    setMessages((prev) =>
      prev.length === 0 ? [{ role: "ai", text: t("ai_assistant_greeting") }] : prev
    );
    setIsOpen(true);
  };

  const handlePreviewProject = () => {
    if (!aiPreviewData) return;
    setIsOpen(false);
    navigate("/wizard/new", { state: { aiPreviewData, aiFiles: files, aiValidationIssues } });
  };

  const handleGoToNavigate = () => {
    if (!pendingNavigate) return;
    const { url } = pendingNavigate;
    setPendingNavigate(null);
    setIsOpen(false);
    navigate(url);
  };

  if (!isOpen) {
    return (
      <div className={`ai-float-btn-wrap ${isAR ? "rtl" : "ltr"}`}>
        <button
          className="ai-float-btn"
          onClick={handleOpen}
          title={t("ai_assistant_open")}
          aria-label={t("ai_assistant_open")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="ai-float-label">{t("ai_assistant_open")}</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Hidden Excel file input */}
      <input
        ref={excelInputRef}
        type="file"
        accept={EXCEL_TYPES}
        style={{ display: "none" }}
        onChange={handleExcelFileChange}
      />

      {/* Hidden image file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        style={{ display: "none" }}
        onChange={handleImageFileChange}
      />

      <div
        className={`ai-modal ${isAR ? "rtl" : "ltr"}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("ai_assistant_title")}
        dir={isAR ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="ai-modal-header">
          <div className="ai-modal-header-left">
            <span className="ai-avatar">✦</span>
            <div className="ai-modal-title-wrap">
              <span className="ai-modal-title">{t("ai_assistant_title")}</span>
              <span className="ai-modal-subtitle">{t("ai_assistant_subtitle")}</span>
            </div>
          </div>
          <div className="ai-header-actions">
            <button className="ai-clear-btn" onClick={handleClearChat} aria-label={t("ai_assistant_clear_chat")} title={t("ai_assistant_clear_chat")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
            <button className="ai-close-btn" onClick={handleDismiss} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Messages */}
        <div className="ai-messages">
          {/* Messages before the upload block */}
          {(uploadInsertIndex >= 0 ? messages.slice(0, uploadInsertIndex + 1) : messages).map((msg, i) => (
            <div key={i} className={`ai-msg ai-msg--${msg.role}`} ref={i === messages.length - 1 ? lastMsgRef : null}>
              {msg.role === "ai" && <span className="ai-msg-avatar">✦</span>}
              <div className="ai-msg-bubble">
                {msg.imageUrl && <img src={msg.imageUrl} alt="" className="ai-msg-image" />}
                {msg.text && <ReactMarkdown>{msg.text}</ReactMarkdown>}
              </div>
            </div>
          ))}

          {/* Pending action confirmation */}
          {pendingAction && !loading && uploadInsertIndex === -1 && (
            <ActionConfirmBar
              pendingAction={pendingAction}
              onConfirm={handleConfirmAction}
              onCancel={handleCancelAction}
              loading={loading}
              language={lang}
            />
          )}

          {/* Excel preview confirmation */}
          {excelPreview && !loading && uploadInsertIndex === -1 && (
            <ExcelPreviewBlock
              preview={excelPreview}
              onConfirm={handleConfirmExcel}
              onCancel={() => { setExcelPreview(null); pushMessage("ai", isAR ? "تم الإلغاء." : "Cancelled."); }}
              loading={loading}
              language={lang}
            />
          )}

          {/* Assistant-suggested navigation (e.g. take user to create/view a variation) */}
          {pendingNavigate && !loading && uploadInsertIndex === -1 && (
            <button className="ai-view-project-btn" onClick={handleGoToNavigate}>
              {pendingNavigate.label || (isAR ? "الانتقال" : "Go")}
            </button>
          )}

          {/* Assistant-offered download — variation PDF, a stored project document, or an
              invoice/payment/receipt-voucher PDF */}
          {pendingDownload && !loading && uploadInsertIndex === -1 && (
            <button className="ai-view-project-btn" onClick={handleDownloadPdf} disabled={!!singleLoading || docDownloading || !!financialSingleLoading}>
              {(singleLoading || docDownloading || financialSingleLoading)
                ? (isAR ? "جاري التحميل..." : "Downloading...")
                : (pendingDownload.label || (isAR ? "تحميل PDF" : "Download PDF"))}
            </button>
          )}

          {/* Project creation file slots — rendered in-flow so responses appear below */}
          {showFileUpload && !aiPreviewData && (
            <div className="ai-file-upload-block">
              <FileSlot label={t("ai_assistant_file_site_plan")} required file={files.site_plan} onChange={(f) => setFiles((p) => ({ ...p, site_plan: f }))} disabled={loading} />
              <FileSlot label={t("ai_assistant_file_owner_id")} required file={files.owner_id} onChange={(f) => setFiles((p) => ({ ...p, owner_id: f }))} disabled={loading} />
              <FileSlot label={t("ai_assistant_file_build_permit")} required={false} file={files.build_permit} onChange={(f) => setFiles((p) => ({ ...p, build_permit: f }))} disabled={loading} />
              <FileSlot label={t("ai_assistant_file_contract")} required file={files.contract} onChange={(f) => setFiles((p) => ({ ...p, contract: f }))} disabled={loading} />
              <button className="ai-create-btn" onClick={handleCreate} disabled={!canCreate || loading}>
                {loading ? t("ai_assistant_creating") : t("ai_assistant_create_btn")}
              </button>
            </div>
          )}

          {/* Messages after the upload block (validation errors, success, etc.) */}
          {uploadInsertIndex >= 0 && messages.slice(uploadInsertIndex + 1).map((msg, i) => {
            const globalIdx = uploadInsertIndex + 1 + i;
            return (
              <div key={globalIdx} className={`ai-msg ai-msg--${msg.role}`} ref={globalIdx === messages.length - 1 ? lastMsgRef : null}>
                {msg.role === "ai" && <span className="ai-msg-avatar">✦</span>}
                <div className="ai-msg-bubble">
                  {msg.imageUrl && <img src={msg.imageUrl} alt="" className="ai-msg-image" />}
                  {msg.text && <ReactMarkdown>{msg.text}</ReactMarkdown>}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="ai-msg ai-msg--ai">
              <span className="ai-msg-avatar">✦</span>
              <div className="ai-msg-bubble ai-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {aiPreviewData && (
            <button className="ai-view-project-btn" onClick={handlePreviewProject}>
              {t("ai_assistant_preview_project")}
            </button>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input row with Excel attach button */}
        <form className="ai-input-form" onSubmit={handleSend}>
          {/* Attached file chip */}
          {attachedExcelFile && (
            <div className="ai-attachment-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span className="ai-attachment-name">{attachedExcelFile.name}</span>
              <button
                type="button"
                className="ai-attachment-remove"
                onClick={handleRemoveAttachment}
                aria-label="Remove"
              >✕</button>
            </div>
          )}

          {/* Attached image chip */}
          {attachedImage && (
            <div className="ai-attachment-chip ai-attachment-chip--image">
              <img src={attachedImage.previewUrl} alt="" className="ai-attachment-thumb" />
              <span className="ai-attachment-name">{attachedImage.file.name || (isAR ? "لقطة شاشة" : "Screenshot")}</span>
              <button
                type="button"
                className="ai-attachment-remove"
                onClick={handleRemoveImageAttachment}
                aria-label="Remove"
              >✕</button>
            </div>
          )}

          <div className="ai-input-row">
            <button
              type="button"
              className="ai-attach-btn"
              onClick={() => excelInputRef.current?.click()}
              disabled={loading}
              title={isAR ? "استيراد من ملف Excel/CSV" : "Import from Excel/CSV"}
              aria-label={isAR ? "رفع ملف Excel" : "Upload Excel file"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <button
              type="button"
              className="ai-attach-btn"
              onClick={() => imageInputRef.current?.click()}
              disabled={loading}
              title={t("ai_assistant_attach_image")}
              aria-label={t("ai_assistant_attach_image")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </button>
            <input
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder={attachedExcelFile
                ? (isAR ? "أضف ملاحظة أو اضغط إرسال..." : "Add a note or press Send...")
                : attachedImage
                ? (isAR ? "اسأل عن الصورة أو اضغط إرسال..." : "Ask about the image or press Send...")
                : t("ai_assistant_placeholder")}
              disabled={loading}
              autoComplete="off"
            />
            <button
              type="submit"
              className="ai-send-btn"
              disabled={(!input.trim() && !attachedExcelFile && !attachedImage) || loading}
              aria-label={t("ai_assistant_send")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
