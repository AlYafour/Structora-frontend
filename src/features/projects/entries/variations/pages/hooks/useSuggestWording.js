import { useState, useCallback, useRef } from 'react';
import { aiTextApi } from '../../../../../../services/ai/aiTextApi';
import { normalizeSuggestions } from '../../utils/aiSuggestionText';

const MAX_CHARS = 4000; // keep in sync with backend SUGGEST_WORDING_MAX_CHARS
const TARGET_SUGGESTIONS = 2;

export function useSuggestWording({
  language = 'ar',
  context,
  projectId,
  variationId,
} = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [previousVariations, setPreviousVariations] = useState([]);
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
      const requestContext = context ? {
        context,
        project_id: projectId,
        variation_id: variationId,
      } : {};
      const firstData = await aiTextApi.suggestWording(promptText, language, requestContext);
      let nextSuggestions = normalizeSuggestions(firstData);
      setPreviousVariations(
        Array.isArray(firstData?.previous_variations) ? firstData.previous_variations : []
      );

      if (!context && nextSuggestions.length < TARGET_SUGGESTIONS) {
        const secondData = await aiTextApi.suggestWording(promptText, language, requestContext);
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
  }, [context, language, projectId, variationId]);

  const discard = useCallback(() => {
    setSuggestions([]);
    setPreviousVariations([]);
    setError('');
  }, []);

  return { suggestions, previousVariations, busy, error, requestSuggestion, discard };
}
