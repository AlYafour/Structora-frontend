import { useCallback, useRef, useState } from 'react';
import { aiTextApi } from '../../../../../../services/ai/aiTextApi';
import { normalizeSuggestions } from '../../utils/aiSuggestionText';

export function useVariationRemarksSuggestion() {
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const requestSuggestion = useCallback(async (noticeData) => {
    if (inFlightRef.current) return [];
    inFlightRef.current = true;
    setBusy(true);
    setError('');
    setSuggestions([]);
    try {
      const data = await aiTextApi.suggestVariationRemarks(noticeData);
      const next = normalizeSuggestions(data).slice(0, 6);
      setSuggestions(next);
      return next;
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'variation_remarks_suggestion_failed');
      return [];
    } finally {
      setBusy(false);
      inFlightRef.current = false;
    }
  }, []);

  const discard = useCallback(() => {
    setSuggestions([]);
    setError('');
  }, []);

  const removeSuggestion = useCallback((suggestion) => {
    setSuggestions(prev => prev.filter(item => item !== suggestion));
  }, []);

  return { suggestions, busy, error, requestSuggestion, discard, removeSuggestion };
}
