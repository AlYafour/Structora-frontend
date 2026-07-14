import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const hasArabic = (text) => /[\u0600-\u06FF]/.test(text);

export function useMachineAutoTranslate(
  text,
  onTranslated,
  { enabled = true, debounceMs = 800, source = 'en', target = 'ar' } = {}
) {
  const [translating, setTranslating] = useState(false);
  const onTranslatedRef = useRef(onTranslated);
  const debounceRef = useRef(null);

  useEffect(() => {
    onTranslatedRef.current = onTranslated;
  });

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!enabled) return;

    const value = text?.trim() || '';
    if (!value) {
      onTranslatedRef.current?.('');
      return;
    }

    if (target === 'ar' && hasArabic(value)) {
      onTranslatedRef.current?.(value);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setTranslating(true);
      try {
        const { data } = await api.post('machine-translate/', {
          text: value,
          source,
          target,
        });
        if (data?.translated) {
          onTranslatedRef.current?.(data.translated);
        }
      } catch {
        // Translation is a convenience; keep editing uninterrupted.
      } finally {
        setTranslating(false);
      }
    }, debounceMs);

    return () => clearTimeout(debounceRef.current);
  }, [text, enabled, debounceMs, source, target]);

  return { translating };
}
