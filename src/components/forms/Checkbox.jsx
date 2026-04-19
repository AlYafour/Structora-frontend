import React from "react";
import PropTypes from "prop-types";

/**
 * Unified Checkbox Component - Enterprise Style
 * Square checkbox with professional styling
 */
export default function Checkbox({
  checked = false,
  onChange,
  disabled = false,
  label,
  id,
  name,
  value,
  className = "",
  ...props
}) {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`checkbox-wrapper ${className} ds-flex ds-items-center ds-gap-2`}>
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => {
          if (!disabled && onChange) {
            // Support both direct function calls and event handlers
            if (typeof onChange === 'function') {
              // If onChange expects an event, pass it
              // If it expects a boolean, pass the checked value
              const checkedValue = e.target.checked;
              onChange(e.target.checked !== undefined ? checkedValue : e);
            }
          }
        }}
        disabled={disabled}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} style={{ cursor: disabled ? "not-allowed" : "pointer", userSelect: "none" }}>
          {label}
        </label>
      )}
    </div>
  );
}

Checkbox.propTypes = {
  /** Whether checkbox is checked */
  checked: PropTypes.bool,
  /** Change handler - receives boolean checked value */
  onChange: PropTypes.func,
  /** Whether checkbox is disabled */
  disabled: PropTypes.bool,
  /** Label text to display next to checkbox */
  label: PropTypes.node,
  /** Checkbox id attribute */
  id: PropTypes.string,
  /** Checkbox name attribute */
  name: PropTypes.string,
  /** Checkbox value attribute */
  value: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};
