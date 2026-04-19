/**
 * Bilingual Field — shared across all print templates.
 * Displays a label in Arabic + English with a value.
 *
 * @param {{ ar: string, en: string }} label - Bilingual label
 * @param {string} value - Display value
 * @param {boolean} [highlight] - Highlight the field
 */
export default function BilField({ label, value, highlight }) {
  return (
    <div className={`bil-field${highlight ? " bil-field--highlight" : ""}`}>
      <span className="bil-field__label">
        <span className="bil-field__ar">{label.ar}</span>
        <span className="bil-field__en">{label.en}</span>
      </span>
      <span className="bil-field__value">{value}</span>
    </div>
  );
}
