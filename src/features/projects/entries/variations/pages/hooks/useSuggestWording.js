import { useState, useCallback, useRef } from 'react';
import { aiTextApi } from '../../../../../../services/ai/aiTextApi';

const MAX_CHARS = 4000; // keep in sync with backend SUGGEST_WORDING_MAX_CHARS
const TARGET_SUGGESTIONS = 2;

function extractSuggestionsFromText(text) {
  const cleaned = text
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(parsed?.suggestions)) return parsed.suggestions;
    } catch {
      return [];
    }
  }

  return [cleaned];
}

function isRenderableSuggestion(text) {
  if (!text) return false;
  if (/^```(?:json)?$/i.test(text)) return false;
  if (/^[{}[\],:"]+$/.test(text)) return false;
  if (/^"?suggestions"?\s*:?\s*\[?$/i.test(text)) return false;
  return true;
}

function splitSuggestionAlternatives(text) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^["'\s,-]*(?:option\s*)?\d+["'.):\-\s]*/i, '').trim())
    .filter(isRenderableSuggestion);
}

function cleanSuggestions(values) {
  const seen = new Set();

  return values
    .flatMap((item) => splitSuggestionAlternatives(item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeSuggestions(data) {
  const values = Array.isArray(data?.suggestions)
    ? data.suggestions
    : [data?.suggestion];
  const combinedSuggestions = extractSuggestionsFromText(values.join('\n'))
    .filter((item) => typeof item === 'string' && isRenderableSuggestion(item.trim()))
    .map((item) => item.trim());

  if (combinedSuggestions.length) return cleanSuggestions(combinedSuggestions);

  const parsedSuggestions = values
    .flatMap((item) => {
      if (typeof item !== 'string') return [];
      const text = item.trim();
      return extractSuggestionsFromText(text);
    })
    .filter((item) => typeof item === 'string' && isRenderableSuggestion(item.trim()))
    .map((item) => item.trim());

  return cleanSuggestions(parsedSuggestions);
}

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
