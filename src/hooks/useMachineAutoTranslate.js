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
  const requestIdRef = useRef(0);

  useEffect(() => {
    onTranslatedRef.current = onTranslated;
  });

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const requestId = ++requestIdRef.current;

    if (!enabled) {
      setTranslating(false);
      return;
    }

    const value = text?.trim() || '';
    if (!value) {
      onTranslatedRef.current?.('');
      setTranslating(false);
      return;
    }

    if (target === 'ar' && hasArabic(value)) {
      onTranslatedRef.current?.(value);
      setTranslating(false);
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
        if (requestId === requestIdRef.current && data?.translated) {
          onTranslatedRef.current?.(data.translated);
        }
      } catch {
        // Translation is a convenience; keep editing uninterrupted.
      } finally {
        if (requestId === requestIdRef.current) {
          setTranslating(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(debounceRef.current);
      if (requestId === requestIdRef.current) {
        requestIdRef.current += 1;
      }
    };
  }, [text, enabled, debounceMs, source, target]);

  return { translating };
}
