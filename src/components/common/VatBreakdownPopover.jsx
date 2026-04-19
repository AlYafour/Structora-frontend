import { useVatDisplay } from '../../contexts/VatDisplayContext';

/**
 * VatToggleButton
 *
 * A small % button that toggles the global VAT display mode (incl/excl VAT).
 * Used standalone next to any amount — does NOT render an amount itself.
 *
 * Usage:
 *   <VatToggleButton />
 */
export function VatToggleButton() {
  const { showWithVat, toggle } = useVatDisplay();
  return (
    <button
      type="button"
      className={`vat-toggle__btn${showWithVat ? ' vat-toggle__btn--active' : ''}`}
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      title={showWithVat ? 'شامل الضريبة — اضغط للتبديل' : 'بدون ضريبة — اضغط للتبديل'}
      aria-label="تبديل عرض الضريبة"
    >
      %
    </button>
  );
}

/**
 * VatAmount
 *
 * Renders a formatted amount that respects the global VAT display mode.
 * Shows a small toggle button so the user can switch in-place.
 *
 * Props:
 *   net      {number}   — amount excl. VAT
 *   withVat  {number}   — amount incl. VAT  (pass null/undefined to auto-calc: net × 1.05)
 *   format   {function} — formatMoney function
 *   showBtn  {boolean}  — show the toggle button (default true)
 *
 * Usage:
 *   <VatAmount net={212747} withVat={223384} format={formatMoney} />
 */
export function VatAmount({ net, withVat, format, showBtn = true }) {
  const { showWithVat } = useVatDisplay();

  const netVal  = Number(net  ?? 0);
  const grossVal = withVat != null ? Number(withVat) : Math.round(netVal * 1.05 * 100) / 100;

  const display = showWithVat ? grossVal : netVal;

  return (
    <span className="vat-amount">
      <span className="vat-amount__value">{format ? format(display) : display}</span>
      {showBtn && <VatToggleButton />}
      {showWithVat && (
        <span className="vat-amount__badge">+VAT</span>
      )}
    </span>
  );
}

// Default export for backward compat (was VatBreakdownPopover)
export default VatAmount;
