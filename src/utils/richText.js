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
]);

const ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify']);

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
    const cleanTag = ALLOWED_TAGS.has(tagName) ? tagName.toLowerCase() : 'span';
    const cleanElement = document.createElement(cleanTag);

    const textAlign = node.style?.textAlign;
    const align = textAlign || node.getAttribute?.('align') || '';
    if (ALIGN_VALUES.has(align)) {
      cleanElement.style.textAlign = align;
    }

    Array.from(node.childNodes).forEach(child => {
      cleanElement.appendChild(cleanNode(child));
    });

    if (cleanTag === 'span') {
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

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
