const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'P',
  'DIV',
  'BR',
  'UL',
  'OL',
  'LI',
  'SPAN',
]);

const ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify']);

// Blocks url(), expression(), javascript:, etc. — only plain hex/rgb(a)/named colors pass.
const SAFE_COLOR_VALUE = /^(#[0-9a-f]{3,8}|rgba?\([\d.\s,%]+\)|hsla?\([\d.\s,%]+\)|[a-z]+)$/i;

function sanitizeColorValue(value = '') {
  const trimmed = String(value || '').trim();
  return SAFE_COLOR_VALUE.test(trimmed) ? trimmed : '';
}

export function isHtmlLike(value = '') {
  return /<\/?[a-z][\s\S]*>/i.test(String(value));
}

export function htmlToPlainText(value = '') {
  const text = String(value || '');
  if (!text) return '';
  if (typeof document === 'undefined' || !isHtmlLike(text)) {
    return text;
  }

  const holder = document.createElement('div');
  holder.innerHTML = text;
  return holder.innerText || holder.textContent || '';
}

export function plainTextToHtml(value = '') {
  const lines = String(value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return '';

  return lines
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

export function sanitizeRichText(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (typeof document === 'undefined') {
    return escapeHtml(raw);
  }

  const template = document.createElement('template');
  template.innerHTML = raw;

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createTextNode('');
    }

    const tagName = node.tagName.toUpperCase();
    const isFont = tagName === 'FONT';
    const cleanTag = ALLOWED_TAGS.has(tagName) ? tagName.toLowerCase() : 'span';
    const cleanElement = document.createElement(cleanTag);

    const textAlign = node.style?.textAlign;
    const align = textAlign || node.getAttribute?.('align') || '';
    if (ALIGN_VALUES.has(align)) {
      cleanElement.style.textAlign = align;
    }

    if (cleanTag === 'span') {
      const color = sanitizeColorValue(node.style?.color || (isFont ? node.getAttribute?.('color') : ''));
      const background = sanitizeColorValue(node.style?.backgroundColor);
      if (color) cleanElement.style.color = color;
      if (background) cleanElement.style.backgroundColor = background;
    }

    Array.from(node.childNodes).forEach(child => {
      cleanElement.appendChild(cleanNode(child));
    });

    if (cleanTag === 'span' && !cleanElement.style.color && !cleanElement.style.backgroundColor && !cleanElement.style.textAlign) {
      const fragment = document.createDocumentFragment();
      Array.from(cleanElement.childNodes).forEach(child => fragment.appendChild(child));
      return fragment;
    }

    return cleanElement;
  };

  const container = document.createElement('div');
  Array.from(template.content.childNodes).forEach(node => {
    container.appendChild(cleanNode(node));
  });

  const sanitized = container.innerHTML
    .replace(/<p><br><\/p>/gi, '')
    .replace(/<div><br><\/div>/gi, '')
    .trim();

  return sanitized;
}

export function normalizeRichTextForRender(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return sanitizeRichText(isHtmlLike(raw) ? raw : plainTextToHtml(raw));
}

const LINE_BREAK_TAGS = new Set(['P', 'DIV', 'LI']);

// Walks the DOM directly to build a newline-separated string: <br> is an
// explicit break, and P/DIV/LI each open and close their own line. Deliberately
// avoids `innerText`, which depends on the element having layout — unreliable
// here since `holder` (below) is a detached, off-document node. Being purely
// structural (nodeType/tagName/textContent only) makes this immune to
// whether a given browser bothers computing render-based line breaks for a
// detached node, and it treats <ul>/<ol> bullet items the same as separate
// <p> lines, so toggling bullet-list formatting on unchanged text yields an
// identical line array before and after.
function collectLineText(node) {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (child.tagName === 'BR') {
        out += '\n';
      } else if (LINE_BREAK_TAGS.has(child.tagName)) {
        out += `\n${collectLineText(child)}\n`;
      } else {
        out += collectLineText(child);
      }
    }
  });
  return out;
}

// Reads line boundaries for diffing purposes — see collectLineText above for
// why this doesn't just use `innerText`.
export function getPlainTextLines(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return [];
  if (typeof document === 'undefined' || !isHtmlLike(raw)) {
    return raw.split('\n').map((line) => line.trim()).filter(Boolean);
  }
  const holder = document.createElement('div');
  holder.innerHTML = sanitizeRichText(raw);
  return collectLineText(holder)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const SPLIT_BLOCK_TAGS = new Set(['P', 'DIV', 'UL', 'OL']);

// Splits rich-text HTML into one entry per line — used to diff English
// content line-by-line against a previous version, and to rebuild Arabic
// content while leaving untouched lines' HTML (and thus any manual styling
// on them) completely alone. `text` is the plain-text content for diffing;
// `html` is that line's full HTML for reconstruction.
//
// A "line" is either a block element (<p>, <div>, or a whole <ul>/<ol>
// treated as a single unit) that has no internal <br>, OR a run of
// text/inline content delimited by <br> or block boundaries. Two browser
// quirks make this necessary rather than just reading `.children`:
//  1. contentEditable almost never wraps the *first* line typed into an
//     empty editor — it stays as a raw (unwrapped) text node until the next
//     Enter press wraps subsequent lines — so treating only element children
//     as lines would silently drop that first line.
//  2. Editing existing content can make a browser represent multiple visual
//     lines as ONE block with an internal <br> (e.g. `<div>line1<br>line2
//     </div>`) instead of two separate top-level blocks — so <br> splitting
//     must be checked recursively inside every block, not just at the top
//     level, or those lines silently collapse into one.
export function splitBlocks(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return [];

  if (typeof document === 'undefined') {
    return [{ text: raw, html: escapeHtml(raw) }];
  }

  if (!isHtmlLike(raw)) {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, html: `<p>${escapeHtml(text)}</p>` }));
  }

  const holder = document.createElement('div');
  holder.innerHTML = sanitizeRichText(raw);

  const blocks = [];
  let buffer = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const wrapper = document.createElement('p');
    buffer.forEach((node) => wrapper.appendChild(node));
    buffer = [];
    const text = (wrapper.innerText || wrapper.textContent || '').trim();
    if (text) blocks.push({ text, html: wrapper.outerHTML });
  };

  const processChildren = (childNodes) => {
    Array.from(childNodes).forEach((node) => {
      const isBlockElement = node.nodeType === Node.ELEMENT_NODE && SPLIT_BLOCK_TAGS.has(node.tagName);
      const isLineBreak = node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR';

      if (isBlockElement) {
        flushBuffer();
        if (node.querySelector('br')) {
          // This single block actually contains multiple <br>-separated
          // lines — descend into it instead of treating it as one line.
          processChildren(node.childNodes);
        } else {
          const text = (node.innerText || node.textContent || '').trim();
          if (text) blocks.push({ text, html: node.outerHTML });
        }
      } else if (isLineBreak) {
        flushBuffer();
      } else {
        buffer.push(node.cloneNode(true));
      }
    });
  };

  processChildren(holder.childNodes);
  flushBuffer();

  return blocks;
}

// Standard LCS-based line diff between two string arrays — correctly handles
// insertions/edits/deletions anywhere in the sequence (unlike naive
// index-by-index comparison, which misaligns everything after an insertion
// or deletion in the middle). Returns an ordered edit script matching the
// final (new) sequence.
export function diffLines(oldLines, newLines) {
  const n = oldLines.length;
  const m = newLines.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const script = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      script.push({ type: 'keep', oldIndex: i, newIndex: j });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      script.push({ type: 'delete', oldIndex: i });
      i++;
    } else {
      script.push({ type: 'insert', newIndex: j });
      j++;
    }
  }
  while (i < n) { script.push({ type: 'delete', oldIndex: i }); i++; }
  while (j < m) { script.push({ type: 'insert', newIndex: j }); j++; }

  return script;
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
