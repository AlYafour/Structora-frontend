import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { aiAssistantApi } from "./aiAssistantApi";
import useTenantNavigate from "../../hooks/useTenantNavigate";
import FileUpload from "../../components/file-upload/FileUpload";
import { useValidation } from "../../contexts/ValidationContext";
import "./AiAssistantModal.css";

const SESSION_KEY = "ai_assistant_shown";
const MESSAGES_KEY  = "ai_assistant_messages";
const OPEN_KEY      = "ai_assistant_open";

const EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
].join(",");

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
  const [createdProjectId, setCreatedProjectId] = useState(null);
  const [files, setFiles] = useState({
    site_plan: null, owner_id: null, build_permit: null, contract: null,
  });

  // Tool action confirmation
  const [pendingAction, setPendingAction] = useState(null);

  // Excel import
  const [excelPreview, setExcelPreview] = useState(null);
  const [attachedExcelFile, setAttachedExcelFile] = useState(null);
  const excelInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const lastMsgRef = useRef(null);
  const inputRef = useRef(null);

  // ── Validation results from wizard ─────────────────────────────────────────
  const { validationIssues } = useValidation() || {};
  const lastValidationSignatureRef = useRef(null);

  useEffect(() => {
    if (!validationIssues || validationIssues.length === 0) {
      // Issues resolved — show a brief success note without forcing modal open
      if (lastValidationSignatureRef.current) {
        lastValidationSignatureRef.current = null;
        const clearText = isAR
          ? "✅ تم حل جميع مشكلات التحقق من المستندات."
          : "✅ All document validation issues resolved.";
        setMessages(prev => [
          ...prev.filter(m => !m.isValidation),
          { role: "ai", text: clearText, isValidation: true },
        ]);
      }
      return;
    }

    const signature = validationIssues.map(i => i.code).sort().join(",");
    const isNewIssues = signature !== lastValidationSignatureRef.current;
    lastValidationSignatureRef.current = signature;

    const header = isAR
      ? "**⚠️ تنبيهات التحقق من المستندات:**\n\n"
      : "**⚠️ Document validation alerts:**\n\n";
    const lines = validationIssues.map(i =>
      `${i.severity === "error" ? "🔴" : "⚠️"} ${i.message}`
    );
    const text = header + lines.join("\n\n");

    setMessages(prev => [
      ...prev.filter(m => !m.isValidation),
      { role: "ai", text, isValidation: true },
    ]);

    // Auto-open only when the set of issues changes
    if (isNewIssues) setIsOpen(true);
  }, [validationIssues, isAR]); // eslint-disable-line react-hooks/exhaustive-deps
  // ───────────────────────────────────────────────────────────────────────────

  // Add greeting only if no messages were restored from sessionStorage
  useEffect(() => {
    setMessages((prev) =>
      prev.length === 0 ? [{ role: "ai", text: t("ai_assistant_greeting") }] : prev
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist messages to sessionStorage so they survive remounts
  useEffect(() => {
    try {
      sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
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
      .filter((m) => (m.role === "user" || m.role === "ai") && !m.isValidation)
      .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
  }, []);

  const pushMessage = useCallback((role, text) => {
    setMessages((prev) => [...prev, { role, text }]);
  }, []);

  const clearActionState = () => {
    setPendingAction(null);
    setExcelPreview(null);
  };

  // ── Send chat message ───────────────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if ((!query && !attachedExcelFile) || loading) return;

    clearActionState();
    setInput("");

    // If a file is attached, process it (Excel import flow)
    if (attachedExcelFile) {
      const file = attachedExcelFile;
      setAttachedExcelFile(null);
      await processExcelAttachment(file, query);
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
            setCreatedProjectId(null);
            setFiles({ site_plan: null, owner_id: null, build_permit: null, contract: null });
          }
          if (data.pending_action) {
            setPendingAction(data.pending_action);
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
  };

  const handleRemoveAttachment = () => setAttachedExcelFile(null);

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
      if (data.success) {
        setCreatedProjectId(data.project_id);
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
    setCreatedProjectId(null);
    setFiles({ site_plan: null, owner_id: null, build_permit: null, contract: null });
    setInput("");
    setAttachedExcelFile(null);
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

  const handleViewProject = () => {
    if (!createdProjectId) return;
    setIsOpen(false);
    navigate(`/projects/${createdProjectId}`);
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
                <ReactMarkdown>{msg.text}</ReactMarkdown>
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

          {/* Project creation file slots — rendered in-flow so responses appear below */}
          {showFileUpload && !createdProjectId && (
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
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
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

          {createdProjectId && (
            <button className="ai-view-project-btn" onClick={handleViewProject}>
              {t("ai_assistant_view_project")} →
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
            <input
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={attachedExcelFile
                ? (isAR ? "أضف ملاحظة أو اضغط إرسال..." : "Add a note or press Send...")
                : t("ai_assistant_placeholder")}
              disabled={loading}
              autoComplete="off"
            />
            <button
              type="submit"
              className="ai-send-btn"
              disabled={(!input.trim() && !attachedExcelFile) || loading}
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
