import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import useUniquenessCheck from "../../hooks/useUniquenessCheck";
import { validateEmail, sanitizeEmailInput } from "../../utils/validators/email";

/**
 * UniqueFieldInput — input with real-time uniqueness checking.
 *
 * Props:
 *   fieldType    "email" | "phone" | "id_number"
 *   value        controlled value
 *   onChange      (newValue) => void
 *   excludeType   "owner" | "user" | "consultant" | "authorized_person" (entity being edited)
 *   excludeId     id of entity being edited (to exclude self)
 *   className     additional CSS class
 *   placeholder   placeholder text
 *   dir           "ltr" | "rtl"
 *   disabled      boolean
 *   ...rest       passed to <input>
 */
export default function UniqueFieldInput({
  fieldType = "email",
  value = "",
  onChange,
  excludeType = "",
  excludeId = "",
  className = "input",
  placeholder = "",
  dir = "ltr",
  disabled = false,
  ...rest
}) {
  const { t } = useTranslation();
  const { checkUniqueness } = useUniquenessCheck();

  const [duplicateError, setDuplicateError] = useState(null);
  const [formatError, setFormatError] = useState(null);
  const debounceRef = useRef(null);

  const runUniquenessCheck = useCallback(
    (val) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!val || !val.trim()) {
        setDuplicateError(null);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        const result = await checkUniqueness(fieldType, val, excludeType, excludeId);
        if (result.cancelled) return;
        if (result.exists) {
          const typeLabel = t(`entity_types.${result.owner_type}`) || result.owner_type;
          const key =
            fieldType === "email"
              ? "validation.duplicate_email"
              : fieldType === "phone"
              ? "validation.duplicate_phone"
              : "validation.duplicate_id_number";
          setDuplicateError(t(key, { name: result.owner_name, type: typeLabel }));
        } else {
          setDuplicateError(null);
        }
      }, 600);
    },
    [checkUniqueness, fieldType, excludeType, excludeId, t]
  );

  const handleChange = (e) => {
    let val = e.target.value;

    // Sanitize email (block Arabic chars)
    if (fieldType === "email") {
      val = sanitizeEmailInput(val);
      const err = validateEmail(val);
      setFormatError(err);
    }

    onChange(val);
    runUniquenessCheck(val);
  };

  const handleBlur = () => {
    if (fieldType === "email") {
      const err = validateEmail(value);
      setFormatError(err);
    }
    // Re-run uniqueness on blur too
    runUniquenessCheck(value);
  };

  const hasError = !!(formatError || duplicateError);
  const inputType = fieldType === "email" ? "email" : fieldType === "phone" ? "tel" : "text";

  return (
    <>
      <input
        className={`${className}${hasError ? " input--error" : ""}`}
        type={inputType}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        dir={dir}
        disabled={disabled}
        {...rest}
      />
      {formatError && (
        <div className="wizard-field-error">{t(formatError)}</div>
      )}
      {duplicateError && !formatError && (
        <div className="wizard-field-error wizard-field-error--duplicate">{duplicateError}</div>
      )}
    </>
  );
}
