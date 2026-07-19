import { useEffect, useRef, useState } from 'react';
import { aiTextApi } from '../../../../../../services/ai/aiTextApi';
import { getPlainTextLines, diffLines } from '../../../../../../utils/richText';

/**
 * Soft, non-blocking "you may already be saying this" check: debounces on
 * new/changed English remark lines and asks the AI whether they overlap in
 * meaning with the company's General Remarks text. Mirrors useLineSyncTranslate's
 * diff/debounce skeleton — only ever inspects lines that were actually
 * inserted/edited, never the whole block.
 *
 * @param {string} englishHtml - current formData.remarks (rich-text HTML)
 * @param {string} generalRemarksEn - company General Remarks (English), plain text
 * @param {{ enabled?: boolean, debounceMs?: number }} opts
 */
export function useRemarksOverlapCheck(englishHtml, generalRemarksEn, { enabled = true, debounceMs = 800 } = {}) {
  const [warnings, setWarnings] = useState([]); // [{ line, matchedPoint, reason }]
  const [checking, setChecking] = useState(false);

  const prevLinesRef = useRef(getPlainTextLines(englishHtml));
  const debounceRef = useRef(null);
  const dismissedRef = useRef(new Set()); // exact line texts the user has dismissed

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!enabled || !generalRemarksEn?.trim()) return undefined;

    const newLines = getPlainTextLines(englishHtml);
    const oldLines = prevLinesRef.current;
    const unchanged = newLines.length === oldLines.length && newLines.every((line, i) => line === oldLines[i]);
    if (unchanged) return undefined;

    debounceRef.current = setTimeout(async () => {
      const latestLines = getPlainTextLines(englishHtml);
      const script = diffLines(prevLinesRef.current, latestLines);
      prevLinesRef.current = latestLines;

      // Drop warnings for lines that no longer exist (deleted/edited away).
      const stillPresent = new Set(latestLines);
      setWarnings((prev) => prev.filter((w) => stillPresent.has(w.line)));

      const changedLines = script
        .filter((op) => op.type === 'insert')
        .map((op) => latestLines[op.newIndex])
        .filter((line) => line && !dismissedRef.current.has(line));

      if (!changedLines.length) return;

      setChecking(true);
      try {
        const { overlaps } = await aiTextApi.checkRemarksOverlap(changedLines, generalRemarksEn);
        if (overlaps?.length) {
          setWarnings((prev) => {
            const byLine = new Map(prev.map((w) => [w.line, w]));
            overlaps.forEach((o) => {
              if (!dismissedRef.current.has(o.line)) {
                byLine.set(o.line, { line: o.line, matchedPoint: o.matched_point, reason: o.reason });
              }
            });
            return Array.from(byLine.values());
          });
        }
      } catch {
        // Fire-and-forget: swallow errors, never surface, never block typing.
      } finally {
        setChecking(false);
      }
    }, debounceMs);

    return () => clearTimeout(debounceRef.current);
  }, [englishHtml, generalRemarksEn, enabled, debounceMs]);

  const dismissWarning = (line) => {
    dismissedRef.current.add(line);
    setWarnings((prev) => prev.filter((w) => w.line !== line));
  };

  return { warnings, checking, dismissWarning };
}
