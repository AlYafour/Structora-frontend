import React, { useRef } from "react";
import { numberToArabicWords } from "../../utils/formatters/number";

export default function NumberField({ value, onChange, placeholder = "0.00", readOnly = false, style = {}, dir, min, ...props }) {

 const inputRef = useRef(null);

 const formatWithCommas = (numStr) => {
 const clean = numStr.replace(/[^0-9]/g, "");
 return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
 };

 const handleChange = (e) => {
 if (readOnly) return;
 
 const element = inputRef.current;

 // Cursor position before modification
 const start = element.selectionStart;
 const end = element.selectionEnd;

 // Original user value (unformatted)
 const raw = e.target.value.replace(/,/g, "");

 if (!/^\d*$/.test(raw)) return;

 // Re-format the value (live)
 const formatted = formatWithCommas(raw);

 // Save the change
 onChange(formatted);

 // Calculate the difference
 const diff = formatted.length - e.target.value.length;

 // Restore cursor to its correct position
 setTimeout(() => {
 element.setSelectionRange(start + diff, end + diff);
 }, 0);
 };

 return (
 <div className="ds-flex ds-flex-col ds-gap-1-5">
 <input
 ref={inputRef}
 className="input"
 type="text"
 value={value}
 placeholder={placeholder}
 onChange={handleChange}
 readOnly={readOnly}
 style={style}
 dir={dir}
 min={min}
 {...props}
 />

 {/* 🔵 Arabic text preview */}
 {value && (
 <div className="number-field__arabic-preview">
 {numberToArabicWords(value)}
 </div>
 )}
 </div>
 );
}

