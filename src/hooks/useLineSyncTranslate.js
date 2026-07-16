import { useState, useEffect, useRef } from 'react';
import { translateText } from './useAutoTranslate';
import { splitBlocks, getPlainTextLines, diffLines, escapeHtml } from '../utils/richText';

const hasArabic = (text) => /[؀-ۿ]/.test(text || '');

/**
 * Keeps `arabicHtml` in line-level sync with `englishHtml`: only lines that
 * were actually added or edited in English get (re)translated; unchanged
 * lines are left completely untouched in Arabic, preserving any manual
 * wording/styling the user has applied there directly. Lines removed from
 * English are removed from Arabic too. Styling is never mirrored from
 * English — inserted/changed lines land as plain `<p>` text; the user styles
 * Arabic independently in its own editor.
 *
 * Known limitation: a `<ul>/<ol>` is diffed as a single whole-list block, not
 * per-item — editing one bullet among several retranslates the whole list.
 *
 * @param {string} englishHtml
 * @param {string} arabicHtml - current Arabic value (read fresh each sync via ref)
 * @param {(html: string) => void} onArabicChange
 * @param {{ enabled?: boolean, debounceMs?: number }} opts
 * @returns {{ translating: boolean }}
 */
export function useLineSyncTranslate(englishHtml, arabicHtml, onArabicChange, { enabled = true, debounceMs = 800 } = {}) {
  const [translating, setTranslating] = useState(false);

  const onArabicChangeRef = useRef(onArabicChange);
  useEffect(() => { onArabicChangeRef.current = onArabicChange; });

  const arabicHtmlRef = useRef(arabicHtml);
  useEffect(() => { arabicHtmlRef.current = arabicHtml; });

  // Baseline for diffing: if Arabic already has content (e.g. a loaded
  // variation), assume it's already in sync with the current English so
  // loading doesn't trigger a disruptive one-time re-translation of
  // everything; otherwise start empty so existing English gets caught up once.
  const prevEnglishLinesRef = useRef(
    arabicHtml ? getPlainTextLines(englishHtml) : []
  );

  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!enabled) return undefined;

    // Diffing/translating only ever cares about `.text` (plain text), never
    // `.html` — so a pure style/formatting change (bold, color, alignment...)
    // with no actual wording change produces identical lines here. Checking
    // this up front, before even scheduling the debounce, means a style-only
    // edit never kicks off a pending translation cycle at all.
    const newLines = getPlainTextLines(englishHtml);
    const oldLines = prevEnglishLinesRef.current;
    const textUnchanged = newLines.length === oldLines.length
      && newLines.every((line, i) => line === oldLines[i]);
    if (textUnchanged) return undefined;

    debounceRef.current = setTimeout(async () => {
      // Re-split fresh at execution time in case more edits landed during
      // the debounce window.
      const latestLines = getPlainTextLines(englishHtml);
      const script = diffLines(prevEnglishLinesRef.current, latestLines);

      if (script.every((op) => op.type === 'keep')) {
        prevEnglishLinesRef.current = latestLines;
        return;
      }

      const insertOps = script.filter((op) => op.type === 'insert');
      const translatedByNewIndex = {};

      if (insertOps.length > 0) {
        setTranslating(true);
        try {
          const results = await Promise.all(
            insertOps.map((op) => {
              const lineText = latestLines[op.newIndex];
              return hasArabic(lineText) ? lineText : translateText(lineText);
            })
          );
          insertOps.forEach((op, idx) => { translatedByNewIndex[op.newIndex] = results[idx]; });
        } finally {
          setTranslating(false);
        }
      }

      const currentArabicBlocks = splitBlocks(arabicHtmlRef.current);
      const mergedHtml = script
        .map((op) => {
          if (op.type === 'keep') return currentArabicBlocks[op.oldIndex]?.html || '';
          if (op.type === 'insert') {
            const translated = translatedByNewIndex[op.newIndex];
            return translated ? `<p>${escapeHtml(translated)}</p>` : '';
          }
          return null; // delete — omit
        })
        .filter(Boolean)
        .join('');

      prevEnglishLinesRef.current = latestLines;
      onArabicChangeRef.current(mergedHtml);
    }, debounceMs);

    return () => clearTimeout(debounceRef.current);
  }, [englishHtml, enabled, debounceMs]);

  return { translating };
}
