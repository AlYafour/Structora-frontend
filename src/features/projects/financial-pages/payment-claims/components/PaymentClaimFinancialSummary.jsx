/**
 * PaymentClaimFinancialSummary Component — Redesigned
 * Step-by-step financial breakdown with clear sections and formulas
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../../../../utils/formatters';
import { MetricCard, MetricGrid } from '../../../../../components/common/MetricCard';
import './PaymentClaimComponents.css';

/* ── Helper: labelled row ── */
function SummaryRow({ letter, label, formula, value, isInput, isSubtotal, variant = 'work', children }) {
  return (
    <div className={`pc-summary__row${isSubtotal ? ' pc-summary__row--subtotal' : ''} pc-summary__row--${variant}`}>
      <div className="pc-summary__row-start">
        {letter && (
          <span className={`pc-summary__letter pc-summary__letter--${variant}`}>{letter}</span>
        )}
        <div className="pc-summary__label-group">
          <span className="pc-summary__label">{label}</span>
          {formula && <span className="pc-summary__formula">{formula}</span>}
        </div>
      </div>
      <div className={`pc-summary__row-end${isInput ? ' pc-summary__row-end--input' : ''}`}>
        {children || (
          <span className={`pc-summary__value${isSubtotal ? ' pc-summary__value--bold' : ''}`}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

const PaymentClaimFinancialSummary = memo(function PaymentClaimFinancialSummary({
  totals,
  materialsOnSiteValue,
  materialsOnSiteIncluded,
  variationsClaimsAmount,
  advancePaymentAmount,
  advanceRecoveryPercent,
  otherDeductions,
  onMaterialsValueChange,
  onMaterialsIncludedChange,
  onVariationsAmountChange,
  onAdvancePaymentChange,
  onAdvanceRecoveryPercentChange,
  onOtherDeductionsChange,
  readOnly = false,
}) {
  const { t } = useTranslation();

  // Calculate values
  const cumulativeWorkDone = parseFloat(totals?.total_amount || 0);
  const materialsValue = materialsOnSiteIncluded !== null
    ? 0
    : (parseFloat(materialsOnSiteValue || 0));
  const variationsAmount = parseFloat(variationsClaimsAmount || 0);
  const subtotal = cumulativeWorkDone + materialsValue + variationsAmount;

  // Deductions
  const advRecovery = parseFloat(totals?.advance_recovery_amount || 0);
  const prevPayments = parseFloat(totals?.previous_received_payments || 0);
  const otherDed = parseFloat(totals?.other_deductions || otherDeductions || 0);
  const totalDeductions = advRecovery + prevPayments + otherDed;
  const netAmountDue = parseFloat(totals?.net_amount_due || 0);

  return (
    <div className="pc-summary">

      {/* ── Quick Summary Cards ── */}
      <div className="pc-summary__cards">
        <MetricGrid columns={3}>
          <MetricCard
            variant="blue"
            icon="layers"
            label={t('pc_subtotal')}
            value={formatMoney(subtotal)}
            tip={t('pc_step_work_value_tip') || 'A + B + C'}
          />
          <MetricCard
            variant="amber"
            icon="scale"
            label={t('pc_total_deductions') || 'Total Deductions'}
            value={formatMoney(totalDeductions)}
            tip={t('pc_step_deductions_tip') || 'G + I + J'}
          />
          <MetricCard
            variant="emerald"
            icon="dollar"
            label={t('pc_net_amount_due')}
            value={formatMoney(netAmountDue)}
            tip={t('pc_net_amount_info')}
          />
        </MetricGrid>
      </div>

      {/* ── Step 1: Value of Work Done ── */}
      <div className="pc-summary__section">
        <div className="pc-summary__section-header pc-summary__section-header--work">
          <span className="pc-summary__step-number">1</span>
          <h4>{t('pc_step_work_value')}</h4>
        </div>

        <div className="pc-summary__section-body">
          {/* A — Cumulative Work Done */}
          <SummaryRow letter="A" label={t('pc_cumulative_work_done')} value={formatMoney(cumulativeWorkDone)} variant="work" />

          {/* B — Materials on Site */}
          <SummaryRow letter="B" label={t('pc_materials_on_site')} isInput={!readOnly} variant="work">
            {readOnly ? (
              <span className="pc-summary__value">
                {materialsOnSiteIncluded === true
                  ? t('pc_included')
                  : materialsOnSiteIncluded === false
                  ? t('pc_not_included')
                  : formatMoney(materialsValue)}
              </span>
            ) : (
              <div className="pc-summary__materials-group">
                <label className="pc-summary__radio">
                  <input
                    type="radio"
                    name={`materials_included_${totals?.id || 'new'}`}
                    checked={materialsOnSiteIncluded === true}
                    onChange={() => onMaterialsIncludedChange(true)}
                  />
                  <span>{t('pc_included')}</span>
                </label>
                <label className="pc-summary__radio">
                  <input
                    type="radio"
                    name={`materials_included_${totals?.id || 'new'}`}
                    checked={materialsOnSiteIncluded === false}
                    onChange={() => onMaterialsIncludedChange(false)}
                  />
                  <span>{t('pc_not_included')}</span>
                </label>
                <label className="pc-summary__radio">
                  <input
                    type="radio"
                    name={`materials_included_${totals?.id || 'new'}`}
                    checked={materialsOnSiteIncluded === null && materialsOnSiteValue !== null}
                    onChange={() => onMaterialsIncludedChange(null)}
                  />
                  <span>{t('pc_enter_value')}</span>
                </label>
                {(materialsOnSiteIncluded === null || materialsOnSiteIncluded === undefined) && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={materialsOnSiteValue || ''}
                    onChange={(e) => onMaterialsValueChange(e.target.value)}
                    className="pc-summary__input"
                    placeholder="0.00"
                  />
                )}
              </div>
            )}
          </SummaryRow>

          {/* C — Variations & Claims */}
          <SummaryRow letter="C" label={t('pc_variations_claims')} isInput={!readOnly} variant="work">
            {readOnly ? (
              <span className="pc-summary__value">{formatMoney(variationsAmount)}</span>
            ) : (
              <input
                type="number"
                step="0.01"
                min="0"
                value={variationsClaimsAmount || ''}
                onChange={(e) => onVariationsAmountChange(e.target.value)}
                className="pc-summary__input"
                placeholder="0.00"
              />
            )}
          </SummaryRow>

          {/* D — Subtotal */}
          <SummaryRow
            letter="D"
            label={t('pc_subtotal')}
            formula="= A + B + C"
            value={formatMoney(subtotal)}
            isSubtotal
            variant="work"
          />
        </div>
      </div>

      {/* ── Step 2: Deductions ── */}
      <div className="pc-summary__section">
        <div className="pc-summary__section-header pc-summary__section-header--deductions">
          <span className="pc-summary__step-number">2</span>
          <h4>{t('pc_step_deductions')}</h4>
        </div>

        <div className="pc-summary__section-body">
          {/* E — Advance Payment */}
          <SummaryRow letter="E" label={t('pc_advance_payment')} isInput={!readOnly} variant="deduction">
            {readOnly ? (
              <span className="pc-summary__value">
                {formatMoney(totals?.advance_payment_amount || advancePaymentAmount || 0)}
              </span>
            ) : (
              <input
                type="number"
                step="0.01"
                min="0"
                value={advancePaymentAmount || ''}
                onChange={(e) => onAdvancePaymentChange(e.target.value)}
                className="pc-summary__input"
                placeholder="0.00"
              />
            )}
          </SummaryRow>

          {/* F — Recovery Percent */}
          <SummaryRow letter="F" label={t('pc_advance_recovery_percent')} isInput={!readOnly} variant="deduction">
            {readOnly ? (
              <span className="pc-summary__value">
                {totals?.advance_recovery_percent || advanceRecoveryPercent || '0'}%
              </span>
            ) : (
              <div className="pc-summary__percent-input">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={advanceRecoveryPercent || ''}
                  onChange={(e) => onAdvanceRecoveryPercentChange(e.target.value)}
                  className="pc-summary__input pc-summary__input--short"
                  placeholder="0.00"
                />
                <span className="pc-summary__percent-sign">%</span>
              </div>
            )}
          </SummaryRow>

          {/* G — Recovery Amount */}
          <SummaryRow
            letter="G"
            label={t('pc_advance_recovery_amount')}
            formula={`= D × F%`}
            value={formatMoney(advRecovery)}
            variant="deduction"
          />

          {/* H — Remaining Advance */}
          <SummaryRow
            letter="H"
            label={t('pc_advance_remaining')}
            formula={"= E − " + t('pc_computed')}
            value={formatMoney(totals?.advance_remaining || 0)}
            variant="deduction"
          />

          {/* I — Previous Payments */}
          <SummaryRow
            letter="I"
            label={t('pc_total_previous_payments')}
            value={formatMoney(prevPayments)}
            variant="deduction"
          />

          {/* J — Other Deductions */}
          <SummaryRow letter="J" label={t('pc_deductions_amount')} isInput={!readOnly} variant="deduction">
            {readOnly ? (
              <span className="pc-summary__value">
                {formatMoney(totals?.other_deductions || otherDeductions || 0)}
              </span>
            ) : (
              <input
                type="number"
                step="0.01"
                min="0"
                value={otherDeductions || ''}
                onChange={(e) => onOtherDeductionsChange(e.target.value)}
                className="pc-summary__input"
                placeholder="0.00"
              />
            )}
          </SummaryRow>
        </div>
      </div>

      {/* ── Step 3: Net Amount Due ── */}
      <div className="pc-summary__section">
        <div className="pc-summary__section-header pc-summary__section-header--result">
          <span className="pc-summary__step-number">3</span>
          <h4>{t('pc_step_net_due')}</h4>
        </div>

        <div className="pc-summary__result">
          <div className="pc-summary__result-formula">
            {t('pc_net_amount_due')} = D − G − I − J
          </div>
          <div className="pc-summary__result-breakdown">
            {formatMoney(subtotal)} − {formatMoney(advRecovery)} − {formatMoney(prevPayments)} − {formatMoney(otherDed)}
          </div>
          <div className="pc-summary__result-value">
            {formatMoney(netAmountDue)}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PaymentClaimFinancialSummary;
