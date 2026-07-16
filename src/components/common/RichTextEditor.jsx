import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaBold,
  FaEraser,
  FaFont,
  FaHighlighter,
  FaItalic,
  FaListOl,
  FaListUl,
  FaRedo,
  FaUnderline,
  FaUndo,
} from 'react-icons/fa';
import { normalizeRichTextForRender, sanitizeRichText, escapeHtml } from '../../utils/richText';

const tools = [
  { command: 'bold', icon: <FaBold />, label: 'Bold' },
  { command: 'italic', icon: <FaItalic />, label: 'Italic' },
  { command: 'underline', icon: <FaUnderline />, label: 'Underline' },
  { divider: true },
  { command: 'insertUnorderedList', icon: <FaListUl />, label: 'Bullet List' },
  { command: 'insertOrderedList', icon: <FaListOl />, label: 'Numbered List' },
  { divider: true },
  { command: 'justifyLeft', icon: <FaAlignLeft />, label: 'Align Left' },
  { command: 'justifyCenter', icon: <FaAlignCenter />, label: 'Align Center' },
  { command: 'justifyRight', icon: <FaAlignRight />, label: 'Align Right' },
  { divider: true },
  { command: 'undo', icon: <FaUndo />, label: 'Undo' },
  { command: 'redo', icon: <FaRedo />, label: 'Redo' },
  { command: 'removeFormat', icon: <FaEraser />, label: 'Clear Formatting' },
];

// Word-style standard color grid
const FONT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#d9d9d9', '#efefef', '#ffffff',
  '#c0392b', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#16a085', '#2980b9', '#8e44ad',
  '#7f1d1d', '#991b1b', '#9a3412', '#854d0e', '#14532d', '#134e4a', '#1e3a5f', '#4c1d95',
];

const HIGHLIGHT_COLORS = [
  '#fff59d', '#ffe082', '#ffab91', '#f48fb1', '#ce93d8', '#b39ddb', '#90caf9', '#80cbc4',
  '#a5d6a7', '#c5e1a5', '#e6ee9c', '#ffccbc', '#d7ccc8', '#cfd8dc', '#ffffff',
];

const statefulCommands = [
  'bold',
  'italic',
  'underline',
  'insertUnorderedList',
  'insertOrderedList',
  'justifyLeft',
  'justifyCenter',
  'justifyRight',
];

const resetCommands = ['bold', 'italic', 'underline'];

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = '',
  dir = 'ltr',
  className = '',
  t,
}) {
  const editorRef = useRef(null);
  const focusedRef = useRef(false);
  const colorGroupRef = useRef(null);
  // The last content this editor is itself responsible for — either emitted
  // via a genuine edit, or synced in from an external `value` update. Lets
  // emitChange() tell "the user actually changed something" apart from "the
  // field was merely focused and blurred with no edit" (onBlur always calls
  // emitChange unconditionally), so onChange doesn't fire spuriously.
  const lastKnownRef = useRef(normalizeRichTextForRender(value));
  const [activeCommands, setActiveCommands] = useState({});
  const [openPopover, setOpenPopover] = useState(null); // 'font' | 'highlight' | null
  const [lastFontColor, setLastFontColor] = useState('#e74c3c');
  const [lastHighlightColor, setLastHighlightColor] = useState('#fff59d');

  const updateActiveCommands = useCallback(() => {
    if (typeof document === 'undefined') return;

    const nextState = {};
    statefulCommands.forEach(command => {
      try {
        nextState[command] = document.queryCommandState(command);
      } catch {
        nextState[command] = false;
      }
    });
    setActiveCommands(nextState);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || focusedRef.current) return;
    const nextValue = normalizeRichTextForRender(value);
    if (editor.innerHTML !== nextValue) {
      editor.innerHTML = nextValue;
    }
    lastKnownRef.current = nextValue;
  }, [value]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveCommands);
    return () => document.removeEventListener('selectionchange', updateActiveCommands);
  }, [updateActiveCommands]);

  useEffect(() => {
    if (!openPopover) return undefined;
    const handleOutsideClick = (event) => {
      if (colorGroupRef.current && !colorGroupRef.current.contains(event.target)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openPopover]);

  const resetStickyFormatting = useCallback(() => {
    if (typeof document === 'undefined') return;
    resetCommands.forEach(command => {
      try {
        if (document.queryCommandState(command)) {
          document.execCommand(command, false, null);
        }
      } catch {
        // Ignore browser command quirks; this is a best-effort reset.
      }
    });
    updateActiveCommands();
  }, [updateActiveCommands]);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = editor.innerText?.replace(/\u200B/g, '').trim() || '';
    if (!text) {
      editor.innerHTML = '';
      resetStickyFormatting();
      if (lastKnownRef.current !== '') {
        lastKnownRef.current = '';
        onChange?.('');
      }
      return;
    }

    const sanitized = sanitizeRichText(editor.innerHTML);
    updateActiveCommands();
    if (sanitized === lastKnownRef.current) return;
    lastKnownRef.current = sanitized;
    onChange?.(sanitized);
  };

  const hasText = () => {
    const editor = editorRef.current;
    return !!(editor?.innerText?.replace(/\u200B/g, '').trim());
  };

  const runCommand = (command) => {
    editorRef.current?.focus();
    document.execCommand(command, false, null);
    if (!hasText()) {
      updateActiveCommands();
      return;
    }
    emitChange();
    updateActiveCommands();
  };

  // Strips a single inline style property from an element and all its descendants,
  // so a newly-applied color always wins instead of being hidden behind an old nested span.
  const clearInlineStyleDeep = (root, styleProp) => {
    const stripFrom = (el) => {
      if (el.nodeType !== Node.ELEMENT_NODE) return;
      if (el.style && el.style[styleProp]) el.style[styleProp] = '';
      if (el.tagName === 'FONT' && styleProp === 'color') el.removeAttribute('color');
    };
    if (root.nodeType === Node.ELEMENT_NODE) stripFrom(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      stripFrom(node);
      node = walker.nextNode();
    }
  };

  // Applies a color to exactly the selected characters by rebuilding that range's markup,
  // instead of execCommand (which nests a new span/font tag but leaves old colored text winning).
  const applyColorToSelection = (styleProp, colorValue) => {
    const editor = editorRef.current;
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    if (!editor || !selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    if (range.collapsed || !editor.contains(range.commonAncestorContainer)) return false;

    const fragment = range.extractContents();
    clearInlineStyleDeep(fragment, styleProp);

    const wrapper = document.createElement('span');
    wrapper.style[styleProp] = colorValue;
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);

    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return true;
  };

  const applyFontColor = (color) => {
    const applied = applyColorToSelection('color', color);
    editorRef.current?.focus();
    if (!applied) {
      // No active selection (just a cursor) — fall back to sticky formatting for the next typed text.
      document.execCommand('foreColor', false, color);
    }
    setLastFontColor(color);
    setOpenPopover(null);
    if (!hasText()) return;
    emitChange();
  };

  const applyHighlightColor = (color) => {
    const applied = applyColorToSelection('backgroundColor', color);
    editorRef.current?.focus();
    if (!applied) {
      try {
        document.execCommand('hiliteColor', false, color);
      } catch {
        document.execCommand('backColor', false, color);
      }
    }
    if (color !== 'transparent') setLastHighlightColor(color);
    setOpenPopover(null);
    if (!hasText()) return;
    emitChange();
  };

  const togglePopover = (name) => {
    editorRef.current?.focus();
    setOpenPopover(prev => (prev === name ? null : name));
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    // Build the exact markup with real <br> line breaks and insert it in one
    // atomic insertHTML call — a single insertText call with embedded \n
    // characters doesn't reliably turn into real line breaks, so a
    // multi-line paste would otherwise collapse into one unbroken line
    // (visually and for line-based Arabic sync alike).
    const html = text
      .split(/\r\n|\r|\n/)
      .map((line) => escapeHtml(line))
      .join('<br>');
    document.execCommand('insertHTML', false, html);
    emitChange();
  };

  return (
    <div className={`rich-text-editor ${className}`.trim()}>
      <div className="rich-text-editor__toolbar" aria-label={t?.('formatting_tools', 'Formatting tools')}>
        {tools.slice(0, 3).map((tool) => (
          <button
            key={tool.command}
            type="button"
            className={`rich-text-editor__tool ${
              activeCommands[tool.command] ? 'rich-text-editor__tool--active' : ''
            }`.trim()}
            title={t?.(tool.command, tool.label) || tool.label}
            aria-label={t?.(tool.command, tool.label) || tool.label}
            aria-pressed={!!activeCommands[tool.command]}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(tool.command)}
          >
            {tool.icon}
          </button>
        ))}

        <div className="rich-text-editor__color-group" ref={colorGroupRef}>
          <div className="rich-text-editor__color-tool">
            <button
              type="button"
              className={`rich-text-editor__tool ${openPopover === 'font' ? 'rich-text-editor__tool--active' : ''}`.trim()}
              title={t?.('font_color', 'Font Color') || 'Font Color'}
              aria-label={t?.('font_color', 'Font Color') || 'Font Color'}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => togglePopover('font')}
            >
              <span className="rich-text-editor__tool-stack">
                <FaFont />
                <span className="rich-text-editor__color-bar" style={{ backgroundColor: lastFontColor }} />
              </span>
            </button>
            {openPopover === 'font' && (
              <div className="rich-text-editor__popover" role="menu">
                <div className="rich-text-editor__swatch-grid">
                  {FONT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="rich-text-editor__swatch"
                      style={{ backgroundColor: color }}
                      title={color}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyFontColor(color)}
                    />
                  ))}
                </div>
                <label className="rich-text-editor__custom-color">
                  {t?.('custom_color', 'Custom color') || 'Custom color'}
                  <input
                    type="color"
                    value={lastFontColor}
                    onMouseDown={(event) => event.stopPropagation()}
                    onChange={(event) => applyFontColor(event.target.value)}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="rich-text-editor__color-tool">
            <button
              type="button"
              className={`rich-text-editor__tool ${openPopover === 'highlight' ? 'rich-text-editor__tool--active' : ''}`.trim()}
              title={t?.('highlight_color', 'Highlight Color') || 'Highlight Color'}
              aria-label={t?.('highlight_color', 'Highlight Color') || 'Highlight Color'}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => togglePopover('highlight')}
            >
              <span className="rich-text-editor__tool-stack">
                <FaHighlighter />
                <span className="rich-text-editor__color-bar" style={{ backgroundColor: lastHighlightColor }} />
              </span>
            </button>
            {openPopover === 'highlight' && (
              <div className="rich-text-editor__popover" role="menu">
                <div className="rich-text-editor__swatch-grid">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="rich-text-editor__swatch"
                      style={{ backgroundColor: color }}
                      title={color}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyHighlightColor(color)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="rich-text-editor__no-color"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyHighlightColor('transparent')}
                >
                  {t?.('no_color', 'No Color') || 'No Color'}
                </button>
              </div>
            )}
          </div>
        </div>

        {tools.slice(3).map((tool, index) => (
          tool.divider ? (
            <span key={`divider-${index}`} className="rich-text-editor__divider" />
          ) : (
            <button
              key={tool.command}
              type="button"
              className={`rich-text-editor__tool ${
                activeCommands[tool.command] ? 'rich-text-editor__tool--active' : ''
              }`.trim()}
              title={t?.(tool.command, tool.label) || tool.label}
              aria-label={t?.(tool.command, tool.label) || tool.label}
              aria-pressed={!!activeCommands[tool.command]}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand(tool.command)}
            >
              {tool.icon}
            </button>
          )
        ))}
      </div>
      <div
        ref={editorRef}
        className="rich-text-editor__surface"
        contentEditable
        dir={dir}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onFocus={() => {
          focusedRef.current = true;
          updateActiveCommands();
        }}
        onBlur={() => {
          focusedRef.current = false;
          emitChange();
        }}
        onInput={emitChange}
        onKeyUp={updateActiveCommands}
        onMouseUp={updateActiveCommands}
        onPaste={handlePaste}
      />
    </div>
  );
}
