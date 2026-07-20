import { useState, useCallback, useRef } from 'react';
import { aiTextApi } from '../../../../../../services/ai/aiTextApi';
import { normalizeSuggestions } from '../../utils/aiSuggestionText';

const MAX_CHARS = 4000; // keep in sync with backend SUGGEST_WORDING_MAX_CHARS
const TARGET_SUGGESTIONS = 2;

export function useSuggestWording({ language = 'ar' } = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const requestSuggestion = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError('');
    try {
      const promptText = trimmed.slice(0, MAX_CHARS);
      const firstData = await aiTextApi.suggestWording(promptText, language);
      let nextSuggestions = normalizeSuggestions(firstData);

      if (nextSuggestions.length < TARGET_SUGGESTIONS) {
        const secondData = await aiTextApi.suggestWording(promptText, language);
        nextSuggestions = [...nextSuggestions, ...normalizeSuggestions(secondData)];
      }

      nextSuggestions = nextSuggestions.slice(0, TARGET_SUGGESTIONS);
      setSuggestions(nextSuggestions);
      return nextSuggestions;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'suggestion_failed');
      return [];
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  }, [language]);

  const discard = useCallback(() => {
    setSuggestions([]);
    setError('');
  }, []);

  return { suggestions, busy, error, requestSuggestion, discard };
}
