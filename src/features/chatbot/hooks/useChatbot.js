import { useState, useCallback, useRef, useEffect } from 'react';
import { chatbotApi } from '../services/chatbotApi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/logger';

/**
 * Hook for chatbot functionality
 * ✅ Enhanced with:
 * - Smart suggestions
 * - Context awareness
 * - Awaiting selection state
 */
export default function useChatbot() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [awaitingSelection, setAwaitingSelection] = useState(false);
  const [currentContext, setCurrentContext] = useState(null);
  const messagesEndRef = useRef(null);

  // Get current language
  const language = /^ar\b/i.test(i18n.language || '') ? 'ar' : 'en';

  // ✅ CRITICAL: Get user-specific storage key
  const getStorageKey = useCallback(() => {
    const userId = user?.id || 'anonymous';
    return `chatbot_history_${userId}`;
  }, [user?.id]);

  // Load chat history from localStorage (user-specific)
  useEffect(() => {
    if (!user?.id) return; // Wait for user to be loaded
    
    try {
      const storageKey = getStorageKey();
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      logger.warn('Failed to load chat history from localStorage', e);
    }
  }, [user?.id, getStorageKey]);

  // Save chat history to localStorage (user-specific)
  useEffect(() => {
    if (!user?.id || messages.length === 0) return;
    
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      logger.error('Error saving chat history', e);
    }
  }, [messages, user?.id, getStorageKey]);

  // Scroll to bottom when new message is added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = useCallback(async (query, useIntelligent = true) => {
    if (!query || !query.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      let response;
      
      // Use intelligent chatbot (Function Calling) or structured chatbot
      if (useIntelligent) {
        // Build conversation history from messages
        const history = messages.slice(-4).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        response = await chatbotApi.ask(query, language, history);
        
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.response || 'No response',
          data: response.data,
          functions_called: response.functions_called || [],
          success: response.success,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        
      } else {
        // Use structured chatbot (old system)
        response = await chatbotApi.query(query, language);
        
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.response || 'No response',
          data: response.data,
          intent: response.intent,
          suggestions: response.suggestions || [],
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        
        // Update suggestions
        if (response.suggestions && response.suggestions.length > 0) {
          setSuggestions(response.suggestions);
        }
        
        // Update awaiting selection state
        setAwaitingSelection(response.awaiting_selection || false);
        
        // Update context
        if (response.context) {
          setCurrentContext(response.context);
        }
      }
      
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: err.response?.data?.response || err.response?.data?.error || err.message || t('processing_error'),
        isError: true,
        suggestions: err.response?.data?.suggestions || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setError(err.response?.data?.error || err.response?.data?.response || err.message);
      
      // Show suggestions even on error
      if (err.response?.data?.suggestions) {
        setSuggestions(err.response.data.suggestions);
      }
    } finally {
      setLoading(false);
    }
  }, [language, messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setAwaitingSelection(false);
    setCurrentContext(null);
    if (user?.id) {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
    }
    // Also clear server-side history
    chatbotApi.clearHistory().catch((err) => {
      logger.debug("Failed to clear chatbot history", err);
    });
  }, [user?.id, getStorageKey]);

  // Handle suggestion click
  const selectSuggestion = useCallback((suggestion) => {
    if (suggestion && suggestion.trim()) {
      sendMessage(suggestion);
    }
  }, [sendMessage]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearHistory,
    messagesEndRef,
    language,
    suggestions,
    awaitingSelection,
    currentContext,
    selectSuggestion,
  };
}
