/**
 * 🎨 FormSection Component
 * Unified section wrapper for grouping form fields
 * 
 * Features:
 * - Section title with optional icon
 * - Collapsible option
 * - Border/divider variants
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import './form.css';

export default function FormSection({
  title,
  subtitle,
  icon,
  tooltip,
  children,
  collapsible = false,
  defaultCollapsed = false,
  noBorder = false,
  className = '',
  titleClassName = '',
  ...props
}) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Build class names
  const sectionClasses = [
    'form-section',
    noBorder && 'form-section--no-border',
    isCollapsed && 'form-section--collapsed',
    className
  ].filter(Boolean).join(' ');

  const titleClasses = [
    'form-section__title',
    collapsible && 'form-section__title--collapsible',
    titleClassName
  ].filter(Boolean).join(' ');

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <section 
      className={sectionClasses} 
      dir={isRTL ? 'rtl' : 'ltr'}
      {...props}
    >
      {title && (
        <div 
          className={titleClasses}
          onClick={handleToggle}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={collapsible ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggle();
            }
          } : undefined}
          aria-expanded={collapsible ? !isCollapsed : undefined}
        >
          <div className="form-section__title-content">
            {icon && (
              <span className="form-section__icon">
                {icon}
              </span>
            )}
            <div className="form-section__title-text">
              <h4 className="form-section__heading">
                {title}
                {tooltip && (
                  <span className="form-section__tooltip">
                    {tooltip}
                  </span>
                )}
              </h4>
              {subtitle && (
                <p className="form-section__subtitle">{subtitle}</p>
              )}
            </div>
          </div>
          
          {collapsible && (
            <span className="form-section__toggle" aria-hidden="true">
              {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
            </span>
          )}
        </div>
      )}

      <div 
        className="form-section__content"
        style={{ display: isCollapsed ? 'none' : 'block' }}
      >
        {children}
      </div>
    </section>
  );
}
