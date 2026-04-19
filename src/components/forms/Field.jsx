import React, { useId } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import "./Field.css";

export default function Field({
  label,
  textarea = false,
  children,
  required = false,
  error,
  hint,
  className = "",
  name, // ✅ Accept name prop
  id, // ✅ Accept id prop (optional, will generate if not provided)
  ...props
}) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const generatedId = useId();
  const inputId = id || generatedId;
  // ✅ Generate name from id if not provided
  const inputName = name || (inputId ? inputId.replace(/:/g, '_') : undefined);

  return (
    <div
      className={`field stack ${className}`}
      dir={isRTL ? "rtl" : "ltr"}
      style={{ textAlign: isRTL ? "right" : "left" }}
    >
      {label && (
        <label
          htmlFor={inputId}
          className="field__label label"
        >
          {label}
          {required && (
            <span className="field__required" aria-label="required">
              *
            </span>
          )}
        </label>
      )}

      {children ? (
        // ✅ Clone children and add id/name if they are form elements
        React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // ✅ Check if child is input, select, or textarea
            if (child.type === 'input' || child.type === 'select' || child.type === 'textarea') {
              return React.cloneElement(child, {
                id: child.props.id || inputId,
                name: child.props.name || inputName,
                ...child.props
              });
            }
          }
          return child;
        })
      ) : textarea ? (
        <textarea 
          id={inputId}
          name={inputName}
          className={`input ${error ? "form-input-error" : ""}`}
          {...props}
          value={props.value != null ? String(props.value) : ''}
        />
      ) : (
        <input 
          id={inputId}
          name={inputName}
          className={`input ${error ? "form-input-error" : ""}`}
          {...props}
          value={props.value != null ? String(props.value) : ''}
        />
      )}

      {hint && !error && (
        <div className="field__hint">
          {hint}
        </div>
      )}

      {error && (
        <div className="field__error">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

Field.propTypes = {
  /** Field label */
  label: PropTypes.node,
  /** Render as textarea instead of input */
  textarea: PropTypes.bool,
  /** Field content (custom input/select components) */
  children: PropTypes.node,
  /** Whether field is required */
  required: PropTypes.bool,
  /** Error message to display */
  error: PropTypes.string,
  /** Hint text to display below field */
  hint: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Field name attribute */
  name: PropTypes.string,
  /** Field id attribute */
  id: PropTypes.string,
  /** Field value (when not using children) */
  value: PropTypes.any,
};
