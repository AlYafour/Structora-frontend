/**
 * PaymentSummaryPanel Component
 *
 * Summary panel for payment allocation calculations
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import DirhamsIcon from '../../../../../../components/common/DirhamsIcon';
import { formatMoney } from '../../../../../../utils/formatters';
import './PaymentSummaryPanel.css';

function getBalanceStatus(creditBalance) {
  if (creditBalance === 0) return 'success';
  if (creditBalance > 0.01) return 'warning';
  return 'danger';
}

const PaymentSummaryPanel = memo(({
  paymentAmount,
  totalAllocated,
  creditBalance,
  allocations,
  creditAmountUsed = 0,
  t
}) => {
  const { i18n } = useTranslation();

  const renderAmount = (value) => {
    const str = formatMoney(value, { lang: i18n.language });
    if (i18n.language === 'en') {
      const numPart = str.replace(/AED\s?/, '').trim();
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {numPart} <DirhamsIcon size={10} color="#374151" />
        </span>
      );
    }
    return str;
  };

  if (allocations.length === 0) {
    return null;
  }

  const status = getBalanceStatus(creditBalance);

  return (
    <div className="payment-summary">
      <h4 className="payment-summary__title">
        {t('allocation_summary')}
      </h4>
      <div className="payment-summary__grid">
        <div className="payment-summary__stat">
          <div className="payment-summary__stat-label">
            {t('payment_amount')}
          </div>
          <div className="payment-summary__amount-value">
            {renderAmount(paymentAmount)}
            {creditAmountUsed > 0 && (
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
                {t('cash_amount', 'كاش')}: {renderAmount(paymentAmount - creditAmountUsed)} + {t('credit', 'رصيد')}: {renderAmount(creditAmountUsed)}
              </div>
            )}
          </div>
        </div>
        <div className="payment-summary__stat">
          <div className="payment-summary__stat-label">
            {t('total_allocated')}
          </div>
          <div className="payment-summary__allocated-value">
            {renderAmount(totalAllocated)}
          </div>
        </div>
      </div>

      {/* Credit Balance */}
      <div className={`payment-summary__balance payment-summary__balance--${status}`}>
        <div className="payment-summary__balance-row">
          <div>
            <div className={`payment-summary__balance-label payment-summary__balance-label--${status}`}>
              {status === 'success'
                ? t('credit_balance_zero')
                : status === 'warning'
                ? t('credit_balance')
                : t('over_allocation')}
            </div>
            <div className={`payment-summary__balance-amount payment-summary__balance-amount--${status}`}>
              {renderAmount(Math.abs(creditBalance))}
            </div>
          </div>
          {status === 'success' && (
            <div className="payment-summary__balance-icon payment-summary__balance-icon--success">
              ✓
            </div>
          )}
          {status === 'danger' && (
            <div className="payment-summary__balance-icon payment-summary__balance-icon--danger">
              ⚠
            </div>
          )}
        </div>

        {status === 'warning' && (
          <div className="payment-summary__balance-hint payment-summary__balance-hint--warning">
            {t('credit_balance_info')}
          </div>
        )}

        {status === 'danger' && (
          <div className="payment-summary__balance-hint payment-summary__balance-hint--danger">
            {t('over_allocation_warning')}
          </div>
        )}
      </div>
    </div>
  );
});

PaymentSummaryPanel.displayName = 'PaymentSummaryPanel';

export default PaymentSummaryPanel;
