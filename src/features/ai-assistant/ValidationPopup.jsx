import { useTranslation } from "react-i18next";
import { useValidation } from "../../contexts/ValidationContext";
import "./ValidationPopup.css";

export default function ValidationPopup() {
  const { validationIssues, popupOpen, closePopup } = useValidation() || {};
  const { i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");

  if (!popupOpen || !validationIssues?.length) return null;

  const errors   = validationIssues.filter(i => i.severity === "error");
  const warnings = validationIssues.filter(i => i.severity === "warning");

  const title         = isAR ? "تنبيهات التحقق من البيانات" : "Validation Alerts";
  const errTitle      = isAR ? "أخطاء — الحفظ محظور"        : "Errors — Save Blocked";
  const warnTitle     = isAR ? "تحذيرات"                     : "Warnings";
  const blockedNote   = isAR
    ? "يجب معالجة الأخطاء أدناه قبل المتابعة للخطوة التالية."
    : "The errors below must be resolved before proceeding to the next step.";

  const label = (issue) =>
    issue.message || (isAR ? issue.message_ar : issue.message_en) || "";

  return (
    <div
      className={`val-popup ${isAR ? "val-popup--rtl" : ""}`}
      dir={isAR ? "rtl" : "ltr"}
      role="dialog"
      aria-label={title}
    >
      <div className="val-popup__header">
        <div className="val-popup__header-left">
          <span className="val-popup__icon" aria-hidden="true">⚠</span>
          <span className="val-popup__title">{title}</span>
        </div>
        <button
          className="val-popup__close"
          onClick={closePopup}
          aria-label={isAR ? "إغلاق" : "Close"}
          type="button"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="val-popup__body">
        {errors.length > 0 && (
          <div className="val-popup__section val-popup__section--error">
            <div className="val-popup__section-title">🔴 {errTitle}</div>
            <p className="val-popup__note">{blockedNote}</p>
            <ul className="val-popup__list">
              {errors.map(issue => (
                <li key={issue.code} className="val-popup__item">
                  {label(issue)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="val-popup__section val-popup__section--warning">
            <div className="val-popup__section-title">⚠️ {warnTitle}</div>
            <ul className="val-popup__list">
              {warnings.map(issue => (
                <li key={issue.code} className="val-popup__item">
                  {label(issue)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
