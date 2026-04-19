/**
 * 🎨 FormViewField Component
 * Unified read-only field display for view mode
 * 
 * Features:
 * - RTL/LTR support
 * - Multiple value types (text, currency, date, list)
 * - Copy to clipboard
 * - Info tooltip
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCopy, FaCheck } from 'react-icons/fa';
import Button from '../common/Button';
import './form.css';

export default function FormViewField({
  label,
  value,
  type = 'text', // text, currency, date, list, email, phone
  emptyText,
  tooltip,
  copyable = false,
  className = '',
  valueClassName = '',
  children,
  ...props
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(copyTimerRef.current);
  }, []);

  // Format value based on type
  const formatValue = () => {
    if (value === null || value === undefined || value === '') {
      return emptyText || t('empty_value') || '—';
    }

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat(isRTL ? 'ar-AE' : 'en-AE', {
          style: 'currency',
          currency: 'AED',
          minimumFractionDigits: 2,
        }).format(value);
      
      case 'number':
        return new Intl.NumberFormat(isRTL ? 'ar-AE' : 'en-AE').format(value);
      
      case 'date':
        if (!value) return emptyText || '—';
        try {
          const date = new Date(value);
          return new Intl.DateTimeFormat(isRTL ? 'ar-AE' : 'en-AE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(date);
        } catch { /* date format fallback */
          return String(value);
        }
      
      case 'list':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);
      
      case 'boolean':
        return value ? (t('yes') || 'نعم') : (t('no') || 'لا');
      
      default:
        return String(value);
    }
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!value) return;
    
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API may be unavailable in non-secure contexts */
    }
  };

  // Build class names
  const fieldClasses = [
    'form-view-field',
    className
  ].filter(Boolean).join(' ');

  const valueClasses = [
    'form-view-field__value',
    type === 'currency' && 'form-view-field__value--currency',
    type === 'phone' && 'form-view-field__value--ltr',
    type === 'email' && 'form-view-field__value--ltr',
    !value && 'form-view-field__value--empty',
    valueClassName
  ].filter(Boolean).join(' ');

  const displayValue = children || formatValue();
  const isEmpty = !value && !children;

  return (
    <div className={fieldClasses} dir={isRTL ? 'rtl' : 'ltr'} {...props}>
      {label && (
        <label className="form-view-field__label">
          <span>{label}</span>
          {tooltip && (
            <span className="form-view-field__tooltip">
              {tooltip}
            </span>
          )}
        </label>
      )}
      
      <div className={valueClasses}>
        <span className="form-view-field__text">
          {displayValue}
        </span>
        
        {copyable && !isEmpty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="form-view-field__copy"
            onClick={handleCopy}
            title={copied ? (t('copied') || 'تم النسخ') : (t('copy') || 'نسخ')}
          >
            {copied ? <FaCheck /> : <FaCopy />}
          </Button>
        )}
      </div>
    </div>
  );
}
