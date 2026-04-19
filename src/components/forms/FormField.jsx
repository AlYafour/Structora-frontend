/**
 * 🎨 FormField Component
 * Unified field wrapper with label, input, error, and hint
 * 
 * Features:
 * - RTL/LTR support
 * - Required indicator
 * - Error messages
 * - Hint text
 * - Info tooltip integration
 */

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import './form.css';

export default function FormField({
  label,
  children,
  required = false,
  error,
  hint,
  tooltip,
  className = '',
  labelClassName = '',
  horizontal = false,
  hideLabel = false,
  id: propId,
  ...props
}) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const generatedId = useId();
  const inputId = propId || generatedId;

  // Build class names
  const fieldClasses = [
    'form-field',
    horizontal && 'form-field--horizontal',
    error && 'form-field--error',
    className
  ].filter(Boolean).join(' ');

  const labelClasses = [
    'form-field__label',
    hideLabel && 'sr-only',
    labelClassName
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={fieldClasses} 
      dir={isRTL ? 'rtl' : 'ltr'}
      {...props}
    >
      {label && (
        <label 
          htmlFor={inputId} 
          className={labelClasses}
        >
          <span className="form-field__label-text">
            {label}
            {required && (
              <span className="form-field__required" aria-label="required">
                *
              </span>
            )}
          </span>
          
          {tooltip && (
            <span className="form-field__tooltip">
              {tooltip}
            </span>
          )}
        </label>
      )}

      <div className="form-field__control">
        {children}
      </div>

      {hint && !error && (
        <p className="form-field__hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      )}

      {error && (
        <p className="form-field__error" id={`${inputId}-error`} role="alert">
          <span className="form-field__error-icon" aria-hidden="true">
            ⚠
          </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
