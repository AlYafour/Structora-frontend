/**
 * PaymentClaimGrandTotals Component
 * Displays grand totals for all sections
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../../../../utils/formatters';
import './PaymentClaimComponents.css';

const PaymentClaimGrandTotals = memo(function PaymentClaimGrandTotals({
  totals,
}) {
  const { t } = useTranslation();

  return (
    <div className="grand-totals-card">
      <div className="grand-totals-header">
        <h3>{t('grand_total') || 'الإجمالي العام'}</h3>
      </div>

      <div className="grand-totals-grid">
        <div className="total-item">
          <span className="total-label">{t('total_amount') || 'إجمالي المبلغ'}</span>
          <span className="total-value">{formatMoney(totals.amount)}</span>
        </div>

        <div className="total-item">
          <span className="total-label">{t('previous_amount') || 'المبلغ السابق'}</span>
          <span className="total-value">{formatMoney(totals.previous_amount)}</span>
        </div>

        <div className="total-item highlight">
          <span className="total-label">{t('current_amount') || 'المبلغ الحالي'}</span>
          <span className="total-value">{formatMoney(totals.current_amount)}</span>
        </div>

        <div className="total-item primary">
          <span className="total-label">{t('total_claimed') || 'إجمالي المطالبة'}</span>
          <span className="total-value">{formatMoney(totals.total_amount)}</span>
        </div>
      </div>
    </div>
  );
});

export default PaymentClaimGrandTotals;
