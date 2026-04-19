import { useState, useRef, useEffect, useCallback } from "react";

/**
 * CollapsibleSection Component
 *
 * Wraps a wizard-section with a clickable header that toggles
 * visibility of the section body with a smooth animation.
 *
 * @param {string} title - Section title text
 * @param {boolean} defaultOpen - Whether the section starts expanded (default: true)
 * @param {React.ReactNode} children - Section body content
 * @param {string} className - Additional CSS class for the wrapper
 * @param {React.ReactNode} headerExtra - Extra content to render in the header (e.g. buttons)
 */
export default function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
  className = "",
  headerExtra,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(defaultOpen ? "auto" : "0px");

  const toggle = useCallback(() => {
    if (isOpen && bodyRef.current) {
      // Before closing: set explicit height so CSS can transition from it
      setHeight(`${bodyRef.current.scrollHeight}px`);
      // Force reflow then set to 0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight("0px");
        });
      });
    } else if (bodyRef.current) {
      setHeight(`${bodyRef.current.scrollHeight}px`);
    }
    setIsOpen((prev) => !prev);
  }, [isOpen]);

  // After expanding transition ends, switch to auto so content can resize
  const handleTransitionEnd = useCallback(() => {
    if (isOpen) {
      setHeight("auto");
    }
  }, [isOpen]);

  // On mount, if defaultOpen, set to auto
  useEffect(() => {
    if (defaultOpen && bodyRef.current) {
      setHeight("auto");
    }
  }, [defaultOpen]);

  return (
    <div className={`wizard-section ${className}`}>
      <div
        className="wizard-section__header wizard-section__header--collapsible"
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={isOpen}
      >
        <div className="wizard-section__header-content">
          <span className={`wizard-section__chevron ${isOpen ? "wizard-section__chevron--open" : ""}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {icon && <span className="wizard-section__icon">{icon}</span>}
          <h4 className="wizard-section__title">{title}</h4>
        </div>
        {headerExtra && (
          <div className="wizard-section__header-extra" onClick={(e) => e.stopPropagation()}>
            {headerExtra}
          </div>
        )}
      </div>
      <div
        ref={bodyRef}
        className="wizard-section__body-collapsible"
        style={{ height, overflow: isOpen && height === "auto" ? "visible" : "hidden" }}
        onTransitionEnd={handleTransitionEnd}
      >
        {children}
      </div>
    </div>
  );
}
