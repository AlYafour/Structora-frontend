import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import useUniquenessCheck from "../../hooks/useUniquenessCheck";
import "./PhoneInput.css";

/**
 * PhoneInput — UAE phone input with +971 prefix, uniqueness checking, validation.
 *
 * Props:
 *   value         controlled value (digits only, no +971)
 *   onChange       (newValue) => void — returns digits only, max 9
 *   disabled      boolean
 *   placeholder   string
 *   excludeType   "owner" | "consultant" | "authorized_person" | "user"
 *   excludeId     id of entity being edited (to exclude self)
 */
export default function PhoneInput({
  value = "",
  onChange,
  disabled = false,
  placeholder = "5X XXX XXXX",
  excludeType = "",
  excludeId = "",
}) {
  const { t } = useTranslation();
  const { checkUniqueness } = useUniquenessCheck();
  const [focused, setFocused] = useState(false);
  const [duplicateError, setDuplicateError] = useState(null);
  const debounceRef = useRef(null);

  const digits = value.replace(/\D/g, "");
  const valid = digits.length === 9;

  const runUniquenessCheck = useCallback(
    (val) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!val || val.length < 9) {
        setDuplicateError(null);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        const fullPhone = `+971${val}`;
        const result = await checkUniqueness("phone", fullPhone, excludeType, excludeId);
        if (result.cancelled) return;
        if (result.exists) {
          const typeLabel = t(`entity_types.${result.owner_type}`) || result.owner_type;
          setDuplicateError(t("validation.duplicate_phone", { name: result.owner_name, type: typeLabel }));
        } else {
          setDuplicateError(null);
        }
      }, 600);
    },
    [checkUniqueness, excludeType, excludeId, t]
  );

  const handleChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "");
    // Remove leading zeros
    raw = raw.replace(/^0+/, "");
    // Max 9 digits
    raw = raw.slice(0, 9);
    onChange(raw);
    runUniquenessCheck(raw);
  };

  const handleBlur = () => {
    setFocused(false);
    runUniquenessCheck(digits);
  };

  const hasError = !!duplicateError;

  const classes = [
    "phone-input",
    focused && "phone-input--focused",
    valid && digits && !hasError && "phone-input--valid",
    hasError && "phone-input--error",
    disabled && "phone-input--disabled",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={classes}>
        <div className="phone-input__prefix">
          <span className="phone-input__flag">🇦🇪</span>
          <span className="phone-input__code">+971</span>
        </div>
        <input
          className="phone-input__field"
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
        />
        {valid && digits && !hasError && <span className="phone-input__check">✓</span>}
      </div>
      {duplicateError && (
        <div className="wizard-field-error wizard-field-error--duplicate">{duplicateError}</div>
      )}
    </>
  );
}
