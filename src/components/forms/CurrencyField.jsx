import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatNumberWithCommas, removeCommas, numberToArabicWords, numberToEnglishWords } from "../../utils/formatters/number";
import "./CurrencyField.css";

/**
 * CurrencyField - Unified component for entering monetary amounts
 * Supports automatic formatting with thousands separators and decimals
 * Displays currency (AED) and Arabic/English text for the amount
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
    const isAR = i18n.language?.startsWith("ar");

    // Format value for display (with commas)
    const formatValue = (val) => {
        if (!val || val === "") return "";

        let cleaned = String(val).replace(/,/g, "");
        cleaned = cleaned.replace(/[^\d.]/g, "");

        const parts = cleaned.split(".");
        let integerPart = parts[0] || "";
        const decimalPart = parts.length > 1 ? "." + parts.slice(1).join("").slice(0, decimals) : "";

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

        let raw = oldValue.replace(/,/g, "");
        raw = raw.replace(/[^\d.]/g, "");

        const parts = raw.split(".");
        if (parts.length > 2) {
            raw = parts[0] + "." + parts.slice(1).join("");
        }

        const oldRaw = oldValue.replace(/,/g, "");
        const digitsBeforeCursor = Math.min(cursorPos, oldRaw.length);
        let digitCount = 0;
        for (let i = 0; i < digitsBeforeCursor; i++) {
            if (oldRaw[i] !== ',') {
                digitCount++;
            }
        }

        const formatted = formatValue(raw);

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

        onChange(formatted);

        setTimeout(() => {
            element.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleBlur = () => {
        if (value && !value.includes(".")) {
            const numValue = removeCommas(value);
            if (numValue && !isNaN(parseFloat(numValue))) {
                onChange(formatValue(numValue + ".00"));
            }
        }
    };

    // Generate the "amount in words" line based on current language
    const renderAmountInWords = () => {
        const raw = removeCommas(value);
        if (!raw) return null;

        const currencyLabel = isAR ? "د.إ" : currency;

        if (isAR) {
            return `${numberToArabicWords(raw)} ${currencyLabel}`;
        } else {
            return `${numberToEnglishWords(raw)} ${currencyLabel}`;
        }
    };

    const displayValue = value || "";

    return (
        <div className="ds-flex ds-flex-col ds-gap-1-5">
            <div className="currency-field__input-wrapper">
                {showCurrency && (
                    <span
                        className={`currency-field__currency-label ${isRTL ? "currency-field__currency-label--rtl" : "currency-field__currency-label--ltr"}`}
                    >
                        {isAR ? "د.إ" : currency}
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
                        textAlign: isAR ? "right" : "left",
                        direction: isAR ? "rtl" : "ltr",
                    }}
                    dir={isAR ? "rtl" : "ltr"}
                    lang="en"
                    {...props}
                />
            </div>

            {/* Amount in words - language aware */}
            {showArabicWords && value && removeCommas(value) && (
                <div className="currency-field__arabic-words">
                    {renderAmountInWords()}
                </div>
            )}
        </div>
    );
}