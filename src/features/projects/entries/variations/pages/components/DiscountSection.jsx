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
  const discountModes = [
    { value: 'none', label: t('no_discount') },
    { value: 'percentage', label: t('percentage') },
    { value: 'amount', label: t('fixed_amount') },
    { value: 'final_amount', label: t('final_amount_label') },
  ];

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

  const renderValueInput = () => {
    if (formData.discount_type === 'percentage') {
      return (
        <div className="nvc-discount-value">
          <input
            type="number"
            step="0.01"
            min="0"
            className="nvc-discount-value__input"
            value={formData.discount_percentage ?? ''}
            onChange={(e) => onFormDataChange({ ...formData, discount_percentage: e.target.value })}
            placeholder="0.00"
          />
          <span className="nvc-discount-value__suffix">%</span>
        </div>
      );
    }

    if (formData.discount_type === 'amount') {
      return (
        <div className="nvc-discount-value">
          <input
            type="number"
            step="0.01"
            min="0"
            className="nvc-discount-value__input"
            value={formData.discount_amount ?? ''}
            onChange={(e) => onFormDataChange({ ...formData, discount_amount: e.target.value })}
            placeholder="0.00"
          />
          <span className="nvc-discount-value__suffix">
            {isAR ? 'د.إ' : <DirhamsIcon size={11} color="currentColor" />}
          </span>
        </div>
      );
    }

    if (formData.discount_type === 'final_amount') {
      return (
        <div className="nvc-discount-value nvc-discount-value--wide">
          <input
            type="number"
            step="0.01"
            min="0"
            className="nvc-discount-value__input"
            value={formData.final_amount_after_discount ?? ''}
            onChange={(e) => onFormDataChange({ ...formData, final_amount_after_discount: e.target.value })}
            placeholder="0.00"
          />
          <span className="nvc-discount-value__suffix">
            {isAR ? 'د.إ' : <DirhamsIcon size={11} color="currentColor" />}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="nvc-discount-section no-print">
      <div className="nvc-discount-section__controls">
        <span className="nvc-discount-section__label">{t('discount_type')}</span>

        <div className="nvc-discount-mode" role="group" aria-label={t('discount_type')}>
          {discountModes.map(mode => (
            <button
              key={mode.value}
              type="button"
              className={`nvc-discount-mode__btn${formData.discount_type === mode.value ? ' nvc-discount-mode__btn--active' : ''}`}
              onClick={() => handleDiscountTypeChange(mode.value)}
            >
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        {formData.discount_type !== 'none' && (
          <div className="nvc-discount-section__value">
            {renderValueInput()}
          </div>
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
