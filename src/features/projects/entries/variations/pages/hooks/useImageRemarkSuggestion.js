import { useState, useCallback, useRef } from 'react';
import { aiTextApi } from '../../../../../../services/ai/aiTextApi';
import { normalizeSuggestions } from '../../utils/aiSuggestionText';

const MAX_IMAGE_SIZE_MB = 15; // keep in sync with backend MAX_IMAGE_SIZE_BYTES
const ACCEPTED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.webp'];

export function useImageRemarkSuggestion({ language = 'en' } = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlightRef = useRef(false);

  const requestSuggestion = useCallback(async (imageFile) => {
    if (!imageFile || inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError('');
    try {
      const data = await aiTextApi.suggestRemarkFromImage(imageFile, language);
      const nextSuggestions = normalizeSuggestions(data);
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

  // Points are independent observations, not mutually-exclusive alternatives —
  // applying one only removes that point from the pending list, so the user can
  // keep adding the rest one at a time.
  const removeSuggestion = useCallback((suggestion) => {
    setSuggestions(prev => prev.filter(s => s !== suggestion));
  }, []);

  return { suggestions, busy, error, requestSuggestion, discard, removeSuggestion };
}

export { MAX_IMAGE_SIZE_MB, ACCEPTED_IMAGE_TYPES };
