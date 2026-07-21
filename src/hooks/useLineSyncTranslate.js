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
export function useLineSyncTranslate(sourceHtml, targetHtml, onTargetChange, {
  enabled = true,
  debounceMs = 800,
  source = 'en',
  target = 'ar',
} = {}) {
  const [translating, setTranslating] = useState(false);

  const onTargetChangeRef = useRef(onTargetChange);
  useEffect(() => { onTargetChangeRef.current = onTargetChange; });

  const targetHtmlRef = useRef(targetHtml);
  useEffect(() => { targetHtmlRef.current = targetHtml; });

  // Baseline for diffing: if Arabic already has content (e.g. a loaded
  // variation), assume it's already in sync with the current English so
  // loading doesn't trigger a disruptive one-time re-translation of
  // everything; otherwise start empty so existing English gets caught up once.
  const prevSourceLinesRef = useRef(
    targetHtml ? getPlainTextLines(sourceHtml) : []
  );
  const directionRef = useRef(`${source}:${target}`);

  const debounceRef = useRef(null);

  useEffect(() => {
    const direction = `${source}:${target}`;
    if (directionRef.current !== direction) {
      directionRef.current = direction;
      prevSourceLinesRef.current = targetHtml ? getPlainTextLines(sourceHtml) : [];
      clearTimeout(debounceRef.current);
      setTranslating(false);
    }
  }, [source, sourceHtml, target, targetHtml]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!enabled) return undefined;

    // Diffing/translating only ever cares about `.text` (plain text), never
    // `.html` — so a pure style/formatting change (bold, color, alignment...)
    // with no actual wording change produces identical lines here. Checking
    // this up front, before even scheduling the debounce, means a style-only
    // edit never kicks off a pending translation cycle at all.
    const newLines = getPlainTextLines(sourceHtml);
    const oldLines = prevSourceLinesRef.current;
    const textUnchanged = newLines.length === oldLines.length
      && newLines.every((line, i) => line === oldLines[i]);
    if (textUnchanged) return undefined;

    debounceRef.current = setTimeout(async () => {
      // Re-split fresh at execution time in case more edits landed during
      // the debounce window.
      const latestLines = getPlainTextLines(sourceHtml);
      const script = diffLines(prevSourceLinesRef.current, latestLines);

      if (script.every((op) => op.type === 'keep')) {
        prevSourceLinesRef.current = latestLines;
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
              return target === 'ar' && hasArabic(lineText)
                ? lineText
                : translateText(lineText, source, target);
            })
          );
          insertOps.forEach((op, idx) => { translatedByNewIndex[op.newIndex] = results[idx]; });
        } finally {
          setTranslating(false);
        }
      }

      const currentTargetBlocks = splitBlocks(targetHtmlRef.current);
      const mergedHtml = script
        .map((op) => {
          if (op.type === 'keep') return currentTargetBlocks[op.oldIndex]?.html || '';
          if (op.type === 'insert') {
            const translated = translatedByNewIndex[op.newIndex];
            return translated ? `<p>${escapeHtml(translated)}</p>` : '';
          }
          return null; // delete — omit
        })
        .filter(Boolean)
        .join('');

      prevSourceLinesRef.current = latestLines;
      onTargetChangeRef.current(mergedHtml);
    }, debounceMs);

    return () => clearTimeout(debounceRef.current);
  }, [sourceHtml, enabled, debounceMs, source, target]);

  return { translating };
}
