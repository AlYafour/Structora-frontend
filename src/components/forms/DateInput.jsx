import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatDateInput, formatDateInputValue, toIsoDate } from "../../utils/formatters";
import "./DateInput.css";

/**
 * Unified professional date input component used across the entire system
 *
 * Unified format: DD/MM/YYYY (day then month then year)
 *
 * Features:
 * - Unified format: DD/MM/YYYY
 * - Automatically prevents invalid input values
 * - Partial editing: day/month/year can be edited independently
 * - Does not clear entire date on partial error
 * - Same component used throughout the entire system
 */
export default function DateInput({ 
  value, // Value in ISO format (yyyy-mm-dd) or null
  onChange, // (isoDate: string | null) => void
  className = "input",
  placeholder = "dd / mm / yyyy",
  disabled = false,
  max, // Maximum date in ISO format
  min, // Minimum date in ISO format
  ...props 
}) {
  const { i18n } = useTranslation();
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const isRTL = i18n.language === "ar";
  
  // Convert value from ISO to display format DD/MM/YYYY
  // ✅ Don't update displayValue from value while focused (during typing)
  useEffect(() => {
    // If the field is focused, don't update displayValue from value
    // because the user may be currently typing
    if (isFocused) return;
    
    if (value) {
      const formatted = formatDateInput(value);
      setDisplayValue(formatted);
    } else {
      setDisplayValue("");
    }
  }, [value, isFocused]);
  
  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Apply mask during typing
    const masked = formatDateInputValue(inputValue);
    setDisplayValue(masked);
    
    // If the date is complete (10 characters: DD/MM/YYYY)
    if (masked.length === 10) {
      const isoDate = toIsoDate(masked);
      if (isoDate) {
        // Validate min/max
        if (min && isoDate < min) {
          const minFormatted = formatDateInput(min);
          setDisplayValue(minFormatted);
          onChange(min);
          return;
        }
        if (max && isoDate > max) {
          const maxFormatted = formatDateInput(max);
          setDisplayValue(maxFormatted);
          onChange(max);
          return;
        }
        onChange(isoDate);
      } else {
        onChange(null);
      }
    } else if (masked.length < 10) {
      onChange(null);
    }
  };
  
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    
    // Validate date on blur
    if (displayValue && displayValue.length === 10) {
      const isoDate = toIsoDate(displayValue);
      if (isoDate) {
        // Verify the date is actually valid
        const date = new Date(isoDate);
        const [day, month, year] = displayValue.split("/");
        const isValidDate = 
          date.getFullYear() === parseInt(year, 10) &&
          date.getMonth() + 1 === parseInt(month, 10) &&
          date.getDate() === parseInt(day, 10);
        
        if (isValidDate) {
          // Update displayed value to be correct
          const formatted = formatDateInput(isoDate);
          setDisplayValue(formatted);
          onChange(isoDate);
        } else {
          // If the date is invalid, clear it
          setDisplayValue("");
          onChange(null);
        }
      } else {
        // If the date is invalid, clear it
        setDisplayValue("");
        onChange(null);
      }
    } else if (displayValue && displayValue.length > 0 && displayValue.length < 10) {
      // If the input is incomplete, clear it
      setDisplayValue("");
      onChange(null);
    }
  };
  
  const handleKeyDown = (e) => {
    // Allow deletion and navigation
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "Tab" || 
        e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
      return;
    }
    
    // Allow only digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="date-input-wrapper" dir={isRTL ? "rtl" : "ltr"}>
      <input
        ref={inputRef}
        type="text"
        className={`${className} date-input-text`}
        value={displayValue || ""}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        inputMode="numeric"
        {...props}
        style={{
          ...props.style,
          textAlign: isRTL ? "right" : "left" }}
      />
    </div>
  );
}
