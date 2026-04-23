/**
 * DiscountSection Component
 *
 * Discount input controls and component selection
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import DirhamsIcon from '../../../../../../components/common/DirhamsIcon';

const DiscountSection = memo(({
  formData,
  onFormDataChange,
  discountAppliesToVariation,
  discountAppliesToContractorOHP,
  discountAppliesToConsultantFees,
  hasSelectedComponents,
  t
}) => {
  const { i18n } = useTranslation();
  const isAR = i18n.language === 'ar';
  const handleDiscountTypeChange = (newType) => {
    onFormDataChange({
      ...formData,
      discount_type: newType,
      discount_percentage: '',
      discount_amount: '',
      final_amount_after_discount: '',
      discount_applies_to_variation: true,
      discount_applies_to_contractor_ohp: true,
      discount_applies_to_consultant_fees: true,
    });
  };

  return (
    <div className="nvc-discount-section no-print">
      <div className="nvc-discount-section__controls">
        <label>{t('discount_type')}:</label>
        <select
          value={formData.discount_type}
          onChange={(e) => handleDiscountTypeChange(e.target.value)}
          className="nvc-select"
        >
          <option value="none">{t('no_discount')}</option>
          <option value="percentage">{t('percentage')}</option>
          <option value="amount">{t('fixed_amount')}</option>
          <option value="final_amount">{t('final_amount_label')}</option>
        </select>
        {formData.discount_type === 'percentage' && (
          <input
            type="number"
            step="0.01"
            className="nvc-input nvc-input--sm"
            value={formData.discount_percentage ?? ''}
            onChange={(e) => onFormDataChange({ ...formData, discount_percentage: e.target.value })}
            placeholder="%"
          />
        )}
        {formData.discount_type === 'amount' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="number"
              step="0.01"
              className="nvc-input nvc-input--sm"
              value={formData.discount_amount ?? ''}
              onChange={(e) => onFormDataChange({ ...formData, discount_amount: e.target.value })}
              placeholder="0.00"
            />
            {isAR
              ? <span style={{ fontSize: '11px', color: 'var(--muted, #9ca3af)' }}>د.إ</span>
              : <DirhamsIcon size={10} color="#9ca3af" />}
          </span>
        )}
        {formData.discount_type === 'final_amount' && (
          <input
            type="number"
            step="0.01"
            className="nvc-input nvc-input--sm"
            value={formData.final_amount_after_discount ?? ''}
            onChange={(e) => onFormDataChange({ ...formData, final_amount_after_discount: e.target.value })}
            placeholder={t('final_amount_label')}
          />
        )}
      </div>
      {formData.discount_type !== 'none' && (
        <div className="nvc-discount-section__tags">
          <span className="nvc-discount-section__tags-label">{t('discount_applies_to')}:</span>
          {discountAppliesToVariation && (
            <span className="nvc-discount-tag">{t('total_variation_amount')}</span>
          )}
          {discountAppliesToContractorOHP && (
            <span className="nvc-discount-tag">{t('contractor_ohp')}</span>
          )}
          {discountAppliesToConsultantFees && (
            <span className="nvc-discount-tag">{t('consultant_fees')}</span>
          )}
          {!hasSelectedComponents && (
            <span className="nvc-discount-section__error">{t('select_at_least_one_component')}</span>
          )}
        </div>
      )}
    </div>
  );
});

DiscountSection.displayName = 'DiscountSection';

export default DiscountSection;
