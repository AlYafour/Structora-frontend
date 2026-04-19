import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import useChatbot from '../hooks/useChatbot';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/common/Button';
import './ChatbotWidget.css';
import useTenantNavigate from '../../../hooks/useTenantNavigate';

/**
 * Chatbot Widget Component
 * A collapsible chatbot widget for financial queries
 */
export default function ChatbotWidget() {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const isAR = /^ar\b/i.test(i18n.language || '');

  const { 
    messages, 
    loading, 
    error, 
    sendMessage, 
    clearHistory, 
    messagesEndRef, 
    language,
    suggestions,
    awaitingSelection,
    selectSuggestion,
  } = useChatbot();

  // Focus input when opened
  useEffect(() => {
    if (!isOpen || !inputRef.current) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Auto-focus input after message is sent (when loading becomes false)
  useEffect(() => {
    if (loading || !isOpen || !inputRef.current) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [loading, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const query = inputValue.trim();
    setInputValue('');
    await sendMessage(query);
    // Focus will be restored automatically via useEffect when loading becomes false
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    if (href.startsWith('project/')) {
      const projectId = href.replace('project/', '');
      navigate(`/projects/${projectId}`);
      setIsOpen(false);
    }
  };

  const formatMessage = (content) => {
    // Process markdown and handle links
    return (
      <ReactMarkdown
        components={{
          a: ({ node, href, ...props }) => (
            <a
              href={href}
              onClick={(e) => handleLinkClick(e, href)}
              className="chatbot-link"
              {...props}
            />
          ) }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`chatbot-widget ${isOpen ? 'open' : ''} ${isAR ? 'rtl' : 'ltr'}`}>
      {/* Chat Button */}
      <Button
        variant="accent"
        className="chatbot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("chat_open_assistant")}
        title={t("chat_financial_assistant")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {!isOpen && messages.length > 0 && (
          <span className="chatbot-badge">{messages.length}</span>
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <h3>{t("chat_financial_assistant")}</h3>
              <p className="chatbot-subtitle">
                {t('chat_financial_subtitle')}
              </p>
            </div>
            <div className="chatbot-actions">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="chatbot-clear"
                  onClick={clearHistory}
                  title={t("chat_clear")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label={t("chat_close")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.length === 0 ? (
              <div className="chatbot-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p>{t("chat_welcome")}</p>
                <div className="chatbot-examples">
                  <p className="chatbot-examples-title">
                    {t("chat_common_questions")}
                  </p>
                  <ul>
                    <li onClick={() => setInputValue(t("chat_q_remaining_balance"))}>
                      {t("chat_q_remaining_balance")}
                    </li>
                    <li onClick={() => setInputValue(t("chat_q_last_payment"))}>
                      {t("chat_q_last_payment")}
                    </li>
                    <li onClick={() => setInputValue(t("chat_q_total_payments"))}>
                      {t("chat_q_total_payments")}
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chatbot-message ${message.role} ${message.isError ? 'error' : ''}`}
                  >
                    <div className="chatbot-message-content">
                      {message.role === 'user' ? (
                        <p>{message.content}</p>
                      ) : (
                        <div className="chatbot-response">
                          {formatMessage(message.content)}
                        </div>
                      )}
                    </div>
                    <div className="chatbot-message-time">
                      {new Date(message.timestamp).toLocaleTimeString(isAR ? 'ar-SA' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="chatbot-message assistant">
                    <div className="chatbot-message-content">
                      <div className="chatbot-loading">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && !loading && (
            <div className={`chatbot-suggestions ${awaitingSelection ? 'awaiting' : ''}`}>
              <p className="chatbot-suggestions-title">
                {awaitingSelection
                  ? t("chat_did_you_mean")
                  : t("chat_suggestions")}
              </p>
              <div className="chatbot-suggestions-list">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="chatbot-suggestion-btn"
                    onClick={() => selectSuggestion(suggestion)}
                    title={suggestion}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form className="chatbot-input-form" onSubmit={handleSubmit}>
            <div className="chatbot-input-wrapper">
              <textarea
                ref={inputRef}
                className="chatbot-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("chat_placeholder")}
                rows={1}
                disabled={loading}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="chatbot-send"
                disabled={!inputValue.trim() || loading}
                aria-label={t("chat_send")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </Button>
            </div>
            {error && (
              <div className="chatbot-error-message">
                {error}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
