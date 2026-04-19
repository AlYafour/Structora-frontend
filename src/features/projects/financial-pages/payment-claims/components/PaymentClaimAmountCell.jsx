/**
 * PaymentClaimAmountCell Component
 * Compact cell for qty, rate, and calculated amount
 */
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../../../../utils/formatters';
import './PaymentClaimComponents.css';

const PaymentClaimAmountCell = memo(function PaymentClaimAmountCell({
  qty,
  rate,
  amount,
  itemId,
  onFieldChange,
}) {
  const { t } = useTranslation();

  const handleQtyChange = useCallback((e) => {
    onFieldChange(itemId, 'qty', e.target.value);
  }, [itemId, onFieldChange]);

  const handleRateChange = useCallback((e) => {
    onFieldChange(itemId, 'rate', e.target.value);
  }, [itemId, onFieldChange]);

  return (
    <div className="amount-cell-compact">
      <div className="amount-input-group">
        <label className="amount-label">{t('qty') || 'الكمية'}</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={qty || 0}
          onChange={handleQtyChange}
          className="amount-input"
          placeholder="0.00"
        />
      </div>
      <div className="amount-input-group">
        <label className="amount-label">{t('rate') || 'السعر'}</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={rate || 0}
          onChange={handleRateChange}
          className="amount-input"
          placeholder="0.00"
        />
      </div>
      <div className="amount-result-compact">
        <span className="amount-result-label">{t('amount') || 'المبلغ'}</span>
        <span className="amount-result-value">{formatMoney(amount || 0)}</span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.qty === nextProps.qty &&
    prevProps.rate === nextProps.rate &&
    prevProps.amount === nextProps.amount &&
    prevProps.itemId === nextProps.itemId
  );
});

export default PaymentClaimAmountCell;
