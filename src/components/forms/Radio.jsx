import React from "react";

/**
 * Unified Radio Component - Enterprise Style
 * Circular radio button with professional styling
 */
export default function Radio({
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
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`radio-wrapper ${className} ds-flex ds-items-center ds-gap-2`}>
      <input
        type="radio"
        id={radioId}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => !disabled && onChange?.(e)}
        disabled={disabled}
        {...props}
      />
      {label && (
        <label htmlFor={radioId} style={{ cursor: disabled ? "not-allowed" : "pointer", userSelect: "none" }}>
          {label}
        </label>
      )}
    </div>
  );
}
