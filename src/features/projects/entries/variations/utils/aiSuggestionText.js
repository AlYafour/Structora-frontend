// Shared parsing/cleanup for AI endpoints that return { suggestions, suggestion }
// text possibly wrapped in markdown/JSON fencing. Used by useSuggestWording and
// useImageRemarkSuggestion so both hooks stay in sync on how raw AI text gets
// turned into a clean, deduped list of candidate lines.

export function extractSuggestionsFromText(text) {
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

export function isRenderableSuggestion(text) {
  if (!text) return false;
  if (/^```(?:json)?$/i.test(text)) return false;
  if (/^[{}[\],:"]+$/.test(text)) return false;
  if (/^"?suggestions"?\s*:?\s*\[?$/i.test(text)) return false;
  // Rewritten contract text is never markdown — stray emphasis is a sign the
  // model leaked commentary/refusal prose instead of real suggestion text.
  if (/\*\*[^*]+\*\*/.test(text)) return false;
  return true;
}

export function splitSuggestionAlternatives(text) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^["'\s,-]*(?:option\s*)?\d+["'.):\-\s]*/i, '').trim())
    .filter(isRenderableSuggestion);
}

export function cleanSuggestions(values) {
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

export function normalizeSuggestions(data) {
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
