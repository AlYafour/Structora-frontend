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
  isPromissoryNote = false,
  invoicePromissoryNoteAmount = 0,
  invoiceRemainingAmount = 0,
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

      {/* Promissory Note Banner */}
      {isPromissoryNote && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '12px',
          fontSize: '12px',
          color: '#92400e',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            ⚠ {t('promissory_note_balance_note', 'Promissory Note — Balance Impact')}
          </div>
          <div style={{ opacity: 0.9 }}>
            {t('promissory_note_balance_info',
              'This amount will appear on the tax invoice but will NOT reduce the outstanding balance until the note is honored.'
            )}
          </div>
        </div>
      )}

      {/* Invoice financial breakdown when allocating to invoices */}
      {invoiceRemainingAmount > 0 && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '12px',
          fontSize: '12px',
        }}>
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            {t('invoice_financial_position', 'Invoice Financial Position')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#374151', marginBottom: '3px' }}>
            <span>{t('outstanding_balance', 'Outstanding Balance (Cash Owed)')}</span>
            <span style={{ fontWeight: 600 }}>{renderAmount(invoiceRemainingAmount)}</span>
          </div>
          {invoicePromissoryNoteAmount > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', marginBottom: '3px' }}>
                <span>{t('promissory_notes_pending', 'Promissory Notes Pending')}</span>
                <span style={{ fontWeight: 600 }}>({renderAmount(invoicePromissoryNoteAmount)})</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                color: '#065f46', fontWeight: 700,
                borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '4px'
              }}>
                <span>{t('net_cash_exposure', 'Net Cash Exposure')}</span>
                <span>{renderAmount(Math.max(invoiceRemainingAmount - invoicePromissoryNoteAmount, 0))}</span>
              </div>
            </>
          )}
        </div>
      )}

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
