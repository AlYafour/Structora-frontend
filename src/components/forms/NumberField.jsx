import React, { useRef } from "react";
import { numberToArabicWords, numberToEnglishWords } from "../../utils/formatters/number";
import { useLanguage } from "../../hooks";

export default function NumberField({
  value,
  onChange,
  placeholder = "0.00",
  readOnly = false,
  style = {},
  dir,
  min,
  ...props
}) {
  const inputRef = useRef(null);
  const { isArabic: isAR } = useLanguage();

  const formatWithCommas = (numStr) => {
    const clean = String(numStr || "").replace(/,/g, "");

    const [integerPart, decimalPart] = clean.split(".");

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    if (decimalPart !== undefined) {
      return `${formattedInteger}.${decimalPart.slice(0, 2)}`;
    }

    return formattedInteger;
  };

  const handleChange = (e) => {
    if (readOnly) return;

    const element = inputRef.current;
    const start = element.selectionStart;
    const end = element.selectionEnd;

    const raw = e.target.value.replace(/,/g, "");

    // allow: "", "1", "1.", "1.2", "1.23"
    if (!/^\d*\.?\d{0,2}$/.test(raw)) return;

    const formatted = formatWithCommas(raw);

    onChange(formatted);

    const diff = formatted.length - e.target.value.length;

    setTimeout(() => {
      element.setSelectionRange(start + diff, end + diff);
    }, 0);
  };

  const getWordRepresentation = () => {
    if (!value) return null;

    const cleanValue = String(value).replace(/,/g, "");

    return isAR
      ? numberToArabicWords(cleanValue)
      : numberToEnglishWords(cleanValue);
  };

  return (
    <div className="ds-flex ds-flex-col ds-gap-1-5">
      <input
        ref={inputRef}
        className="input"
        type="text"
        inputMode="decimal"
        value={value || ""}
        placeholder={placeholder}
        onChange={handleChange}
        readOnly={readOnly}
        style={style}
        dir={dir}
        min={min}
        {...props}
      />

      {value && (
        <div className="number-field__preview">
          {getWordRepresentation()}
        </div>
      )}
    </div>
  );
}