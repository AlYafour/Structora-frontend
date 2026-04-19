import { api } from "../../../services/api";
import { handleError } from "../../../utils/errorHandler";

/**
 * Chatbot API service
 */
export const chatbotApi = {
  async query(query, language = 'ar') {
    try {
      const response = await api.post('chatbot/query/', {
        query,
        language,
      });
      return response.data;
    } catch (error) {
      throw handleError(error, 'chatbotApi.query');
    }
  },

  async getSuggestions(partialInput) {
    try {
      const response = await api.post('chatbot/suggestions/', {
        partial_input: partialInput,
      });
      return response.data;
    } catch (error) {
      handleError(error, 'chatbotApi.getSuggestions');
      return { suggestions: [] };
    }
  },

  async clearHistory() {
    try {
      const response = await api.post('chatbot/clear-history/');
      return response.data;
    } catch (error) {
      throw handleError(error, 'chatbotApi.clearHistory');
    }
  },

  async ask(query, language = 'ar', conversationHistory = []) {
    try {
      const response = await api.post('chatbot/ask/', {
        query,
        language,
        conversation_history: conversationHistory,
      });
      return response.data;
    } catch (error) {
      throw handleError(error, 'chatbotApi.ask');
    }
  },
};
