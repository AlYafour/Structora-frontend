import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const hasArabic = (text) => /[؀-ۿ]/.test(text);

/**
 * Debounced auto-translation hook.
 * Translates `text` to Arabic via the /translate/ endpoint.
 * Calls onTranslated(ar) when a result arrives, or onTranslated('') when text is cleared.
 * Skips translation when text already contains Arabic characters.
 *
 * @param {string} text - Source text to translate
 * @param {(ar: string) => void} onTranslated - Callback with the Arabic result
 * @param {{ enabled?: boolean, debounceMs?: number }} opts
 * @returns {{ translating: boolean }}
 */
export function useAutoTranslate(text, onTranslated, { enabled = true, debounceMs = 800 } = {}) {
  const [translating, setTranslating] = useState(false);
  const onTranslatedRef = useRef(onTranslated);
  const debounceRef = useRef(null);

  useEffect(() => {
    onTranslatedRef.current = onTranslated;
  });

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!enabled) return;

    if (!text || !text.trim()) {
      onTranslatedRef.current?.('');
      return;
    }

    if (hasArabic(text)) return;

    debounceRef.current = setTimeout(async () => {
      setTranslating(true);
      try {
        const { data } = await api.post('translate/', { text, source: 'en', target: 'ar' });
        if (data?.translated) {
          onTranslatedRef.current?.(data.translated);
        }
      } catch {
        // Silent fail — translation is a nice-to-have
      } finally {
        setTranslating(false);
      }
    }, debounceMs);

    return () => clearTimeout(debounceRef.current);
  }, [text, enabled, debounceMs]);

  return { translating };
}
