/**
 * FinancialSummary Component — Redesigned
 */

import { memo } from 'react';
import { formatMoney } from '../../../../../../utils/formatters';
import { FaMinus, FaPlus, FaEquals, FaTag } from 'react-icons/fa';

const FinancialSummary = memo(({
  totalOmitted,
  totalAdded,
  totalVariationAmount,
  contractorEngineeringOHP,
  consultantFees,
  totalAmountBeforeDiscount,
  discountAmount,
  discountPercentage,
  totalAmount,
  variationAmountAfterDiscount,
  contractorOHPAfterDiscount,
  consultantFeesAfterDiscount,
  formData,
  isEditMode,
  onFormDataChange,
  t
}) => {
  const hasDiscount = discountAmount > 0;

  const handleDiscountCheckbox = (field, newValue) => {
    if (!newValue) {
      const others = {
        discount_applies_to_variation: formData.discount_applies_to_variation,
        discount_applies_to_contractor_ohp: formData.discount_applies_to_contractor_ohp,
        discount_applies_to_consultant_fees: formData.discount_applies_to_consultant_fees,
      };
      others[field] = newValue;
      if (!Object.values(others).some(v => v)) return;
    }
    onFormDataChange({ ...formData, [field]: newValue });
  };

  const isPositive = totalVariationAmount >= 0;

  return (
    <div className="nfs-wrapper nvc-section">

      {/* ── SECTION HEADER ── */}
      <div className="nfs-header">
        <span className="nfs-header__title">
          {t('variation_summary')} &amp; {t('fees')}
        </span>
      </div>

      <div className="nfs-body">

        {/* ── LEFT COLUMN: Amounts flow ── */}
        <div className="nfs-left">

          {/* Variation breakdown */}
          <div className="nfs-block">
            <div className="nfs-block__title">{t('variation_summary')}</div>
            <div className="nfs-flow">

              <div className="nfs-flow-row nfs-flow-row--omit">
                <div className="nfs-flow-row__icon"><FaMinus /></div>
                <div className="nfs-flow-row__label">{t('total_omitted')}</div>
                <div className="nfs-flow-row__value nfs-flow-row__value--neg">
                  {formatMoney(totalOmitted)}
                </div>
                {isEditMode && formData.discount_type !== 'none' && (
                  <label className="nfs-check no-print">
                    <input type="checkbox" checked={formData.discount_applies_to_variation}
                      onChange={(e) => handleDiscountCheckbox('discount_applies_to_variation', e.target.checked)} />
                    <span>{t('apply_discount')}</span>
                  </label>
                )}
              </div>

              <div className="nfs-flow-row nfs-flow-row--add">
                <div className="nfs-flow-row__icon"><FaPlus /></div>
                <div className="nfs-flow-row__label">{t('total_added')}</div>
                <div className="nfs-flow-row__value nfs-flow-row__value--pos">
                  {formatMoney(totalAdded)}
                </div>
              </div>

              <div className={`nfs-flow-row nfs-flow-row--net ${isPositive ? 'nfs-flow-row--net-pos' : 'nfs-flow-row--net-neg'}`}>
                <div className="nfs-flow-row__icon"><FaEquals /></div>
                <div className="nfs-flow-row__label">{t('total_variation_amount')}</div>
                <div className="nfs-flow-row__value nfs-flow-row__value--bold">
                  {formatMoney(totalVariationAmount)}
                </div>
              </div>

              {hasDiscount && variationAmountAfterDiscount !== totalVariationAmount && (
                <div className="nfs-flow-row nfs-flow-row--after">
                  <div className="nfs-flow-row__icon"><FaTag /></div>
                  <div className="nfs-flow-row__label">{t('total_variation_amount_after_discount')}</div>
                  <div className="nfs-flow-row__value">{formatMoney(variationAmountAfterDiscount)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Fees */}
          <div className="nfs-block">
            <div className="nfs-block__title">{t('fees')}</div>

            {/* Contractor OHP */}
            <div className="nfs-fee-row">
              <div className="nfs-fee-row__info">
                <span className="nfs-fee-row__name">
                  {t('contractor_ohp')}
                  {formData.contractor_ohp_type === 'percentage' && (
                    <span className="nfs-fee-row__pct">{formData.contractor_ohp_percentage}%</span>
                  )}
                </span>
                {isEditMode && formData.discount_type !== 'none' && (
                  <label className="nfs-check no-print">
                    <input type="checkbox" checked={formData.discount_applies_to_contractor_ohp}
                      onChange={(e) => handleDiscountCheckbox('discount_applies_to_contractor_ohp', e.target.checked)} />
                    <span>{t('apply_discount')}</span>
                  </label>
                )}
              </div>
              <div className="nfs-fee-row__right">
                {isEditMode && (
                  <div className="nfs-fee-row__controls no-print">
                    <select value={formData.contractor_ohp_type}
                      onChange={(e) => onFormDataChange({ ...formData, contractor_ohp_type: e.target.value })}
                      className="nvc-select nfs-select">
                      <option value="percentage">%</option>
                      <option value="amount">AED</option>
                    </select>
                    <input type="number" step="0.01" className="nvc-input nvc-input--sm nfs-num-input"
                      value={formData.contractor_ohp_type === 'percentage'
                        ? (formData.contractor_ohp_percentage ?? '')
                        : (formData.contractor_ohp_amount ?? '')}
                      onChange={(e) => onFormDataChange({ ...formData,
                        [formData.contractor_ohp_type === 'percentage' ? 'contractor_ohp_percentage' : 'contractor_ohp_amount']: e.target.value })}
                    />
                  </div>
                )}
                <span className="nfs-fee-row__amount">{formatMoney(contractorEngineeringOHP)}</span>
              </div>
            </div>
            {hasDiscount && (
              <div className="nfs-fee-after">{t('contractor_ohp_after_discount')}: <strong>{formatMoney(contractorOHPAfterDiscount)}</strong></div>
            )}

            {/* Consultant Fees */}
            <div className="nfs-fee-row">
              <div className="nfs-fee-row__info">
                <span className="nfs-fee-row__name">
                  {t('consultant_fees')}
                  {formData.consultant_fees_type === 'percentage' && (
                    <span className="nfs-fee-row__pct">{formData.consultant_fees_percentage}%</span>
                  )}
                </span>
                {isEditMode && formData.discount_type !== 'none' && (
                  <label className="nfs-check no-print">
                    <input type="checkbox" checked={formData.discount_applies_to_consultant_fees}
                      onChange={(e) => handleDiscountCheckbox('discount_applies_to_consultant_fees', e.target.checked)} />
                    <span>{t('apply_discount')}</span>
                  </label>
                )}
                {isEditMode && (
                  <label className="nfs-check no-print" style={{marginTop:4}}>
                    <input type="checkbox" checked={formData.consultant_fee_on_total_added}
                      onChange={(e) => onFormDataChange({ ...formData, consultant_fee_on_total_added: e.target.checked })} />
                    <span>{t('consultant_fee_on_total_added')}</span>
                  </label>
                )}
              </div>
              <div className="nfs-fee-row__right">
                {isEditMode && (
                  <div className="nfs-fee-row__controls no-print">
                    <select value={formData.consultant_fees_type}
                      onChange={(e) => onFormDataChange({ ...formData, consultant_fees_type: e.target.value })}
                      className="nvc-select nfs-select">
                      <option value="percentage">%</option>
                      <option value="amount">AED</option>
                    </select>
                    <input type="number" step="0.01" className="nvc-input nvc-input--sm nfs-num-input"
                      value={formData.consultant_fees_type === 'percentage'
                        ? (formData.consultant_fees_percentage ?? '')
                        : (formData.consultant_fees_amount ?? '')}
                      onChange={(e) => onFormDataChange({ ...formData,
                        [formData.consultant_fees_type === 'percentage' ? 'consultant_fees_percentage' : 'consultant_fees_amount']: e.target.value })}
                    />
                  </div>
                )}
                <span className="nfs-fee-row__amount">{formatMoney(consultantFees)}</span>
              </div>
            </div>
            {hasDiscount && (
              <div className="nfs-fee-after">{t('consultant_fees_after_discount')}: <strong>{formatMoney(consultantFeesAfterDiscount)}</strong></div>
            )}

            {/* Discount line */}
            {hasDiscount && (
              <div className="nfs-fee-row nfs-fee-row--discount">
                <div className="nfs-fee-row__info">
                  <span className="nfs-fee-row__name nfs-fee-row__name--disc">
                    {t('discount')}
                    {discountPercentage > 0 && <span className="nfs-fee-row__pct">{discountPercentage.toFixed(1)}%</span>}
                  </span>
                </div>
                <div className="nfs-fee-row__right">
                  <span className="nfs-fee-row__amount nfs-fee-row__amount--neg">- {formatMoney(discountAmount)}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN: Final Amount Card ── */}
        <div className="nfs-right">
          <div className="nfs-total-card">
            <div className="nfs-total-card__header">{t('final_summary')}</div>

            <div className="nfs-total-rows">
              <div className="nfs-total-row">
                <span>{t('total_omitted')}</span>
                <span className="nfs-total-row__val nfs-total-row__val--neg">- {formatMoney(totalOmitted)}</span>
              </div>
              <div className="nfs-total-row">
                <span>{t('total_added')}</span>
                <span className="nfs-total-row__val nfs-total-row__val--pos">+ {formatMoney(totalAdded)}</span>
              </div>
              <div className="nfs-total-row nfs-total-row--variation">
                <span>{t('total_variation_amount')}</span>
                <span className={`nfs-total-row__val ${isPositive ? 'nfs-total-row__val--pos' : 'nfs-total-row__val--neg'}`}>
                  {formatMoney(totalVariationAmount)}
                </span>
              </div>
            </div>

            <div className="nfs-total-card__divider" />

            <div className="nfs-total-rows">
              {hasDiscount && (
                <div className="nfs-total-row">
                  <span>{t('total_before_discount')}</span>
                  <span className="nfs-total-row__val">{formatMoney(totalAmountBeforeDiscount)}</span>
                </div>
              )}
              {hasDiscount && (
                <div className="nfs-total-row nfs-total-row--disc">
                  <span>{t('discount')} {discountPercentage > 0 && `(${discountPercentage.toFixed(1)}%)`}</span>
                  <span className="nfs-total-row__val nfs-total-row__val--neg">- {formatMoney(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="nfs-total-card__final">
              <span className="nfs-total-card__final-label">{t('final_amount')}</span>
              <span className="nfs-total-card__final-value">{formatMoney(totalAmount)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

FinancialSummary.displayName = 'FinancialSummary';

export default FinancialSummary;
