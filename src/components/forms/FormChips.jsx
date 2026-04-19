/**
 * 🎨 FormChips Component
 * Unified chip/pill selection component
 * 
 * Features:
 * - Single/Multi select
 * - RTL/LTR support
 * - Keyboard navigation
 * - Custom chip rendering
 */

import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import './form.css';

export default function FormChips({
  options = [],
  value,
  onChange,
  multiple = false,
  disabled = false,
  error = false,
  size = 'md',
  className = '',
  ...props
}) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Handle chip click
  const handleChipClick = (chipValue) => {
    if (disabled) return;

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(chipValue)
        ? currentValues.filter(v => v !== chipValue)
        : [...currentValues, chipValue];
      onChange(newValues);
    } else {
      onChange(value === chipValue ? null : chipValue);
    }
  };

  // Check if chip is selected
  const isSelected = (chipValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(chipValue);
    }
    return value === chipValue;
  };

  // Build wrapper class names
  const wrapperClasses = [
    'form-chips',
    `form-chips--${size}`,
    error && 'form-chips--error',
    disabled && 'form-chips--disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={wrapperClasses}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="group"
      data-count={options.length}
      {...props}
    >
      {options.map(([optValue, optLabel, optDesc]) => {
        const selected = isSelected(optValue);
        
        const chipClasses = [
          'form-chip',
          selected && 'form-chip--selected',
          disabled && 'form-chip--disabled'
        ].filter(Boolean).join(' ');

        return (
          <Button
            key={optValue}
            type="button"
            variant={selected ? "primary" : "outline"}
            className={chipClasses}
            onClick={() => handleChipClick(optValue)}
            disabled={disabled}
            aria-pressed={selected}
            title={optDesc}
          >
            <span className="form-chip__label">{optLabel}</span>
          </Button>
        );
      })}
    </div>
  );
}
