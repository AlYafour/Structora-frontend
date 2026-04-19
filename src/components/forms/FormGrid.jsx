/**
 * 🎨 FormGrid Component
 * Responsive grid layout for form fields
 * 
 * Features:
 * - Auto-responsive columns
 * - Custom column count
 * - Gap customization
 */

import { useTranslation } from 'react-i18next';
import './form.css';

export default function FormGrid({
  children,
  cols = 2,
  gap = 'md',
  responsive = true,
  className = '',
  style,
  ...props
}) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Gap mapping
  const gapMap = {
    sm: 'var(--space-3)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
    xl: 'var(--space-8)',
  };

  // Build class names
  const gridClasses = [
    'form-grid',
    responsive && 'form-grid--responsive',
    `form-grid--cols-${cols}`,
    `form-grid--gap-${gap}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={gridClasses}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        '--form-grid-cols': cols,
        '--form-grid-gap': gapMap[gap] || gapMap.md,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
