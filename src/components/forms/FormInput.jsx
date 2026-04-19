/**
 * 🎨 FormInput Component
 * Unified text input with consistent styling across the application
 * 
 * Features:
 * - RTL/LTR support
 * - Error states
 * - Disabled states
 * - Icons (start/end)
 * - Size variants (sm, md, lg)
 */

import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import './form.css';

const FormInput = forwardRef(({
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  disabled = false,
  readOnly = false,
  error = false,
  size = 'md',
  className = '',
  startIcon,
  endIcon,
  inputMode,
  maxLength,
  min,
  max,
  step,
  autoComplete,
  name,
  id,
  dir,
  style,
  ...props
}, ref) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  // Build class names
  const inputClasses = [
    'form-input',
    `form-input--${size}`,
    error && 'form-input--error',
    disabled && 'form-input--disabled',
    readOnly && 'form-input--readonly',
    startIcon && 'form-input--has-start-icon',
    endIcon && 'form-input--has-end-icon',
    className
  ].filter(Boolean).join(' ');

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="form-input-wrapper" dir={dir || (isRTL ? 'rtl' : 'ltr')}>
      {startIcon && (
        <span className="form-input-icon form-input-icon--start">
          {startIcon}
        </span>
      )}
      
      <input
        ref={ref}
        type={type}
        value={value ?? ''}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={inputClasses}
        inputMode={inputMode}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
        name={name}
        id={id}
        aria-invalid={error ? 'true' : undefined}
        style={style}
        {...props}
      />
      
      {endIcon && (
        <span className="form-input-icon form-input-icon--end">
          {endIcon}
        </span>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
