import { useTranslation } from "react-i18next";
import Button from "../common/Button";

/**
 * Unified Page Header Bar
 * Professional sticky bar used across all pages
 *
 * @param {string}    title      - Page title (optional)
 * @param {string}    subtitle   - Subtitle / description (optional)
 * @param {ReactNode} backButton - Pre-built back button element (optional)
 * @param {Function}  onBack     - Back click handler, renders default back button (optional)
 * @param {string}    backLabel  - Label for the default back button (optional)
 * @param {ReactNode} actions    - Right-side action buttons (optional)
 * @param {ReactNode} children   - Center slot between back and actions (optional)
 * @param {string}    className  - Extra CSS class (optional)
 */
export default function PageHeader({
  title,
  subtitle,
  backButton,
  onBack,
  backLabel,
  actions,
  children,
  className = "",
}) {
  const { t, i18n } = useTranslation();
  const isAR = i18n.language === "ar";

  const resolvedBackLabel = backLabel || t("back");

  return (
    <div
      className={`page-bar ${className}`}
      dir={isAR ? "rtl" : "ltr"}
    >
      {/* Back section */}
      <div className="page-bar__start">
        {backButton || (onBack && (
          <Button type="button" variant="ghost" className="page-bar__back" onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{resolvedBackLabel}</span>
          </Button>
        ))}
      </div>

      {/* Center: title + optional children */}
      <div className="page-bar__center">
        {title && (
          <div className="page-bar__title-group">
            <h1 className="page-bar__title">{title}</h1>
            {subtitle && <p className="page-bar__subtitle">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>

      {/* Actions section */}
      <div className="page-bar__end">
        {actions}
      </div>
    </div>
  );
}
