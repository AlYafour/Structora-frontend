import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaBold,
  FaEraser,
  FaItalic,
  FaListOl,
  FaListUl,
  FaRedo,
  FaUnderline,
  FaUndo,
} from 'react-icons/fa';
import { normalizeRichTextForRender, sanitizeRichText } from '../../utils/richText';

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
  const [activeCommands, setActiveCommands] = useState({});

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
  }, [value]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveCommands);
    return () => document.removeEventListener('selectionchange', updateActiveCommands);
  }, [updateActiveCommands]);

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
      onChange?.('');
      resetStickyFormatting();
      return;
    }

    onChange?.(sanitizeRichText(editor.innerHTML));
    updateActiveCommands();
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

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
    emitChange();
  };

  return (
    <div className={`rich-text-editor ${className}`.trim()}>
      <div className="rich-text-editor__toolbar" aria-label={t?.('formatting_tools', 'Formatting tools')}>
        {tools.map((tool, index) => (
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
