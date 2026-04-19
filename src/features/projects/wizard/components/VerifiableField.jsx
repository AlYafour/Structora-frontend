import { useTranslation } from "react-i18next";

/**
 * VerifiableField — wraps a form field with a verification checkbox.
 * When checked, shows a green checkmark indicating the field has been verified.
 */
export default function VerifiableField({ fieldName, verified, onToggle, children, viewMode }) {
  const { t } = useTranslation();

  if (viewMode) return children;

  return (
    <div className={`verifiable-field ${verified ? "verifiable-field--verified" : ""}`}>
      {children}
      <label className="verifiable-field__check" title={t("verify_field")}>
        <input
          type="checkbox"
          checked={!!verified}
          onChange={() => onToggle(fieldName)}
          className="verifiable-field__input"
        />
        <span className={`verifiable-field__icon ${verified ? "verifiable-field__icon--checked" : ""}`}>
          {verified ? (
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="14" height="14" rx="3" />
            </svg>
          )}
        </span>
      </label>
    </div>
  );
}
