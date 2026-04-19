/**
 * 🎨 FormTextarea Component
 * Unified textarea with consistent styling
 * 
 * Features:
 * - RTL/LTR support
 * - Auto-resize option
 * - Character count
 * - Error states
 */

import { forwardRef, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './form.css';

const FormTextarea = forwardRef(({
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  disabled = false,
  readOnly = false,
  error = false,
  rows = 4,
  maxLength,
  showCharCount = false,
  autoResize = false,
  resize = 'vertical',
  className = '',
  name,
  id,
  dir,
  style,
  ...props
}, ref) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const internalRef = useRef(null);
  const textareaRef = ref || internalRef;

  // Auto-resize logic
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, autoResize, textareaRef]);

  // Build class names
  const textareaClasses = [
    'form-textarea',
    error && 'form-textarea--error',
    disabled && 'form-textarea--disabled',
    readOnly && 'form-textarea--readonly',
    className
  ].filter(Boolean).join(' ');

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const charCount = value?.length || 0;

  return (
    <div className="form-textarea-wrapper" dir={dir || (isRTL ? 'rtl' : 'ltr')}>
      <textarea
        ref={textareaRef}
        value={value ?? ''}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        rows={rows}
        maxLength={maxLength}
        className={textareaClasses}
        name={name}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        style={{
          resize: autoResize ? 'none' : resize,
          ...style
        }}
        {...props}
      />
      
      {showCharCount && maxLength && (
        <div className="form-textarea-char-count">
          <span className={charCount >= maxLength ? 'form-textarea-char-count--max' : ''}>
            {charCount}
          </span>
          <span> / {maxLength}</span>
        </div>
      )}
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;
