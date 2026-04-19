/**
 * WizardShell - Unified Step Container
 * Provides consistent layout for all wizard steps
 */
import { useTranslation } from "react-i18next";
import "./wizard.css";

export default function WizardShell({ 
  title, 
  subtitle,
  children, 
  footer,
  headerActions,
}) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <div className="wizard-step-container" dir={isRTL ? "rtl" : "ltr"}>
      {/* Step Header - Actions only (title removed to avoid duplication with Steps) */}
      {headerActions && (
        <div className="wizard-step-header">
          <div className="wizard-step-header__actions">{headerActions}</div>
        </div>
      )}

      {/* Step Content */}
      <div className="wizard-step-content">
        {children}
      </div>

      {/* Footer - Sticky Action Bar */}
      {footer}
    </div>
  );
}
