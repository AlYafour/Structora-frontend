import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { aiAssistantApi } from "./aiAssistantApi";
import useTenantNavigate from "../../hooks/useTenantNavigate";
import FileUpload from "../../components/file-upload/FileUpload";
import "./AiAssistantModal.css";

const SESSION_KEY = "ai_assistant_shown";

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

export default function AiAssistantModal({ projectId = null }) {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const lang = isAR ? "ar" : "en";

  const [isOpen, setIsOpen] = useState(() => !sessionStorage.getItem(SESSION_KEY));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState(null);
  const [files, setFiles] = useState({
    site_plan: null,
    owner_id: null,
    build_permit: null,
    contract: null,
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Set greeting on mount
  useEffect(() => {
    setMessages([{ role: "ai", text: t("ai_assistant_greeting") }]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When language changes, refresh the greeting if the conversation hasn't started yet
  // (i.e. only the initial greeting bubble is present)
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "ai") {
        return [{ role: "ai", text: t("ai_assistant_greeting") }];
      }
      return prev;
    });
  }, [i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showFileUpload, loading]);

  useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, loading]);

  // Build conversation history in Claude format (user/assistant only, skip file-upload UI messages)
  const buildHistory = useCallback((msgs) => {
    return msgs
      .filter((m) => m.role === "user" || m.role === "ai")
      .map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      }));
  }, []);

  const pushMessage = useCallback((role, text) => {
    setMessages((prev) => [...prev, { role, text }]);
  }, []);

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    setInput("");
    const newUserMsg = { role: "user", text: query };
    setMessages((prev) => {
      const updated = [...prev, newUserMsg];
      // Kick off API call with the updated history (excluding the new user msg already added)
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
        })
        .catch(() => {
          pushMessage("ai", t("ai_assistant_error"));
        })
        .finally(() => setLoading(false));
      return updated;
    });
  };

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
        // Replace the "creating…" message with the real success message
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "ai", text: data.message };
          return copy;
        });
      } else {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "ai",
            text: data.error || t("ai_assistant_create_failed"),
          };
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
    setMessages([{ role: "ai", text: t("ai_assistant_greeting") }]);
    setShowFileUpload(false);
    setCreatedProjectId(null);
    setFiles({ site_plan: null, owner_id: null, build_permit: null, contract: null });
    setInput("");
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

  // ── Floating button (when closed) ──────────────────────────────────────────
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

  // ── Modal ──────────────────────────────────────────────────────────────────
  return (
    <>
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
          {messages.map((msg, i) => (
            <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
              {msg.role === "ai" && <span className="ai-msg-avatar">✦</span>}
              <div className="ai-msg-bubble">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}

          {/* Typing indicator while waiting for AI response */}
          {loading && (
            <div className="ai-msg ai-msg--ai">
              <span className="ai-msg-avatar">✦</span>
              <div className="ai-msg-bubble ai-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {/* File upload slots — appear inline after AI asks */}
          {showFileUpload && !createdProjectId && (
            <div className="ai-file-upload-block">
              <FileSlot
                label={t("ai_assistant_file_site_plan")}
                required
                file={files.site_plan}
                onChange={(f) => setFiles((p) => ({ ...p, site_plan: f }))}
                disabled={loading}
              />
              <FileSlot
                label={t("ai_assistant_file_owner_id")}
                required
                file={files.owner_id}
                onChange={(f) => setFiles((p) => ({ ...p, owner_id: f }))}
                disabled={loading}
              />
              <FileSlot
                label={t("ai_assistant_file_build_permit")}
                required={false}
                file={files.build_permit}
                onChange={(f) => setFiles((p) => ({ ...p, build_permit: f }))}
                disabled={loading}
              />
              <FileSlot
                label={t("ai_assistant_file_contract")}
                required
                file={files.contract}
                onChange={(f) => setFiles((p) => ({ ...p, contract: f }))}
                disabled={loading}
              />
              <button
                className="ai-create-btn"
                onClick={handleCreate}
                disabled={!canCreate || loading}
              >
                {loading ? t("ai_assistant_creating") : t("ai_assistant_create_btn")}
              </button>
            </div>
          )}

          {/* View project button after successful creation */}
          {createdProjectId && (
            <button className="ai-view-project-btn" onClick={handleViewProject}>
              {t("ai_assistant_view_project")} →
            </button>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="ai-input-row" onSubmit={handleSend}>
          <input
            ref={inputRef}
            className="ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("ai_assistant_placeholder")}
            disabled={loading}
            autoComplete="off"
          />
          <button
            type="submit"
            className="ai-send-btn"
            disabled={!input.trim() || loading}
            aria-label={t("ai_assistant_send")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
