import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatNumberWithCommas, removeCommas, numberToArabicWords } from "../../utils/formatters/number";
import "./CurrencyField.css";

/**
 * CurrencyField - Unified component for entering monetary amounts
 * Supports automatic formatting with thousands separators and decimals
 * Displays currency (AED) and Arabic text for the amount
 */
export default function CurrencyField({ 
 value, 
 onChange, 
 placeholder = "0.00", 
 readOnly = false, 
 style = {}, 
 dir,
 showCurrency = true,
 showArabicWords = true,
 currency = "AED",
 decimals = 2,
 className = "",
 ...props 
}) {
 const { t, i18n } = useTranslation();
 const inputRef = useRef(null);
 const isRTL = i18n.dir() === "rtl";

 // Format value for display (with commas)
 const formatValue = (val) => {
 if (!val || val === "") return "";
 
 // Remove existing commas
 let cleaned = String(val).replace(/,/g, "");
 
 // Allow only digits and decimal point
 cleaned = cleaned.replace(/[^\d.]/g, "");
 
 // Allow only one decimal point
 const parts = cleaned.split(".");
 let integerPart = parts[0] || "";
 const decimalPart = parts.length > 1 ? "." + parts.slice(1).join("").slice(0, decimals) : "";
 
 // Add commas to integer part
 if (integerPart) {
 integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
 }
 
 return integerPart + decimalPart;
 };

 const handleChange = (e) => {
 if (readOnly) return;
 
 const element = inputRef.current;
 if (!element) return;

 const oldValue = e.target.value;
 const cursorPos = element.selectionStart;
 
 // Remove all commas to get raw value
 let raw = oldValue.replace(/,/g, "");

 // Allow only digits and decimal point
 raw = raw.replace(/[^\d.]/g, "");

 // Allow only one decimal point
 const parts = raw.split(".");
 if (parts.length > 2) {
 raw = parts[0] + "." + parts.slice(1).join("");
 }

 // Calculate how many digits are before cursor in old value (excluding commas)
 const oldRaw = oldValue.replace(/,/g, "");
 const digitsBeforeCursor = Math.min(cursorPos, oldRaw.length);
 let digitCount = 0;
 for (let i = 0; i < digitsBeforeCursor; i++) {
 if (oldRaw[i] !== ',') {
 digitCount++;
 }
 }
 
 // Format the value with commas
 const formatted = formatValue(raw);

 // Calculate new cursor position in formatted value
 // Find the position that corresponds to the same number of digits
 let newDigitCount = 0;
 let newCursorPos = formatted.length;
 
 for (let i = 0; i < formatted.length; i++) {
 if (formatted[i] !== ',') {
 newDigitCount++;
 if (newDigitCount >= digitCount) {
 newCursorPos = i + 1;
 break;
 }
 }
 }

 // Save the change
 onChange(formatted);

 // Restore cursor position
 setTimeout(() => {
 element.setSelectionRange(newCursorPos, newCursorPos);
 }, 0);
 };

 const handleBlur = () => {
 // On blur, ensure decimal places exist
 if (value && !value.includes(".")) {
 const numValue = removeCommas(value);
 if (numValue && !isNaN(parseFloat(numValue))) {
 onChange(formatValue(numValue + ".00"));
 }
 }
 };

 // Convert value for display (with currency)
 const displayValue = value || "";

 return (
 <div className="ds-flex ds-flex-col ds-gap-1-5">
 <div className="currency-field__input-wrapper">
 {showCurrency && (
 <span
 className={`currency-field__currency-label ${isRTL ? "currency-field__currency-label--rtl" : "currency-field__currency-label--ltr"}`}
 >
 {currency}
 </span>
 )}
 <input
 ref={inputRef}
 className={`input ${className}`}
 type="text"
 inputMode="decimal"
 value={displayValue}
 placeholder={placeholder}
 onChange={handleChange}
 onBlur={handleBlur}
 readOnly={readOnly}
 style={{
 ...style,
 paddingLeft: showCurrency ? (isRTL ? "12px" : "60px") : "12px",
 paddingRight: showCurrency ? (isRTL ? "60px" : "12px") : "12px",
 textAlign: "left",
 direction: "ltr" }}
 dir="ltr"
 lang="en"
 {...props}
 />
 </div>

 {/* Arabic text for the amount */}
 {showArabicWords && value && removeCommas(value) && (
 <div className="currency-field__arabic-words">
 {numberToArabicWords(removeCommas(value))} {currency === "AED" && t("aed")}
 </div>
 )}
 </div>
 );
}
