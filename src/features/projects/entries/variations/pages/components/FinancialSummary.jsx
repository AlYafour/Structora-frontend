/**
 * FinancialSummary Component — Redesigned
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../../../../../utils/formatters';
import { FaMinus, FaPlus, FaEquals, FaTag, FaTimes } from 'react-icons/fa';
import DirhamsIcon from '../../../../../../components/common/DirhamsIcon';
import FileUpload from '../../../../../../components/file-upload/FileUpload';
import FileAttachmentView from '../../../../../../components/file-upload/FileAttachmentView';

// Shared card used for every fee row (contractor, consultant, custom)
function FeeCard({
  label, nameInput, removeBtn,
  typeValue, inputValue, onTypeChange, onInputChange,
  displayAmount, afterDiscountAmount, afterDiscountLabel,
  extras, isEditMode, lang, renderAmount,
}) {
  return (
    <div className="nfs-custom-fee-card">
      {/* Name row — extras (checkboxes) sit inline with the label */}
      <div className="nfs-custom-fee-card__name">
        {nameInput || <span className="nfs-fee-row__name">{label}</span>}
        {extras && extras.length > 0 && extras.map((extra, i) => (
          <span key={i} className="nfs-custom-fee-card__inline-extra no-print">{extra}</span>
        ))}
        {removeBtn}
      </div>

      {/* Controls + computed amount */}
      <div className="nfs-custom-fee-card__bottom">
        {isEditMode && (
          <div className="nfs-custom-fee-card__controls no-print">
            <span className="nfs-type-toggle">
              <button
                type="button"
                className={`nfs-type-toggle__btn${typeValue === 'percentage' ? ' nfs-type-toggle__btn--active' : ''}`}
                onClick={() => onTypeChange('percentage')}
              >%</button>
              <button
                type="button"
                className={`nfs-type-toggle__btn${typeValue === 'amount' ? ' nfs-type-toggle__btn--active' : ''}`}
                onClick={() => onTypeChange('amount')}
              >{lang === 'ar' ? 'د.إ' : <DirhamsIcon size={10} color="currentColor" />}</button>
            </span>
            <input
              type="number"
              step="any"
              min="0"
              className="nvc-input nvc-input--sm nfs-num-input"
              placeholder="0.00"
              value={inputValue}
              onChange={e => onInputChange(e.target.value)}
            />
          </div>
        )}
        <span className="nfs-fee-row__amount nfs-custom-fee-card__amount">
          {renderAmount(displayAmount)}
        </span>
      </div>

      {/* After-discount line */}
      {afterDiscountAmount != null && afterDiscountAmount !== displayAmount && (
        <div className="nfs-fee-after">
          {afterDiscountLabel}: <strong>{renderAmount(afterDiscountAmount)}</strong>
        </div>
      )}
    </div>
  );
}

const FinancialSummary = memo(({
  totalOmitted,
  totalAdded,
  totalVariationAmount,
  contractorEngineeringOHP,
  consultantFees,
  customFeesWithAmounts,
  totalAmountBeforeDiscount,
  discountAmount,
  discountPercentage,
  totalAmount,
  variationAmountAfterDiscount,
  contractorOHPAfterDiscount,
  consultantFeesAfterDiscount,
  formData,
  isEditMode,
  canManageHiddenFees = false,
  hiddenFeeAttachment,
  setHiddenFeeAttachment,
  existingHiddenFeeAttachment,
  existingHiddenFeeAttachmentName,
  setExistingHiddenFeeAttachment,
  setHiddenFeeAttachmentCleared,
  project,
  onFormDataChange,
  t
}) => {
  const { i18n } = useTranslation();
  const lang = i18n?.language === 'en' ? 'en' : 'ar';

  const renderAmount = (value) => {
    const str = formatMoney(value, { lang });
    if (lang === 'en') {
      const numPart = str.replace(/AED\s?/, '').trim();
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{numPart} <DirhamsIcon size={10} color="#374151" /></span>;
    }
    return str;
  };

  const hasDiscount = discountAmount > 0;
  const customFees = formData.custom_fees || [];
  const hiddenConsultantFee = parseFloat(formData.hidden_consultant_fee || 0) || 0;
  const hiddenVatMode = formData.hidden_consultant_fee_vat_mode || (
    parseFloat(formData.hidden_consultant_fee_vat_rate || 0) === 0
      ? 'no_vat'
      : formData.hidden_consultant_fee_vat_included
        ? 'included'
        : 'excluded'
  );
  const computeHiddenFeePreview = () => {
    if (hiddenConsultantFee <= 0) {
      return { net_amount: 0, vat_amount: 0, gross_amount: 0 };
    }
    if (hiddenVatMode === 'no_vat') {
      return { net_amount: hiddenConsultantFee, vat_amount: 0, gross_amount: hiddenConsultantFee };
    }
    if (hiddenVatMode === 'included') {
      const net = hiddenConsultantFee / 1.05;
      return {
        net_amount: net,
        vat_amount: hiddenConsultantFee - net,
        gross_amount: hiddenConsultantFee,
      };
    }
    const vat = hiddenConsultantFee * 0.05;
    return {
      net_amount: hiddenConsultantFee,
      vat_amount: vat,
      gross_amount: hiddenConsultantFee + vat,
    };
  };
  const hiddenFeePreview = computeHiddenFeePreview();
  const savedHiddenFeeNet = parseFloat(formData.hidden_consultant_fee_net_amount || 0) || 0;
  const savedHiddenFeeVat = parseFloat(formData.hidden_consultant_fee_vat_amount || 0) || 0;
  const savedHiddenFeeGross = parseFloat(formData.hidden_consultant_fee_gross_amount || 0) || 0;
  const hiddenFeeDisplay = isEditMode ? hiddenFeePreview : {
    net_amount: savedHiddenFeeNet || hiddenFeePreview.net_amount,
    vat_amount: savedHiddenFeeVat || hiddenFeePreview.vat_amount,
    gross_amount: savedHiddenFeeGross || hiddenFeePreview.gross_amount,
  };
  const hiddenVatModeLabels = {
    excluded: t('pf_enter_without_vat', 'Amount excluding VAT'),
    included: t('pf_enter_with_vat', 'Amount including VAT'),
    no_vat: t('pf_enter_no_vat', 'No VAT'),
  };
  const showHiddenConsultantFee = canManageHiddenFees && (isEditMode || hiddenConsultantFee > 0);

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

  const addCustomFee = () => {
    const newFee = { id: Date.now(), name: '', type: 'amount', percentage: '', amount: '' };
    onFormDataChange({ ...formData, custom_fees: [...customFees, newFee] });
  };

  const removeCustomFee = (id) => {
    onFormDataChange({ ...formData, custom_fees: customFees.filter(f => f.id !== id) });
  };

  const updateCustomFee = (id, field, value) => {
    onFormDataChange({
      ...formData,
      custom_fees: customFees.map(f => f.id === id ? { ...f, [field]: value } : f)
    });
  };

  const handleContractorOHPTypeChange = (type) => {
    if (formData.contractor_ohp_type === type) return;
    onFormDataChange({
      ...formData,
      contractor_ohp_type: type,
      contractor_ohp_percentage: '',
      contractor_ohp_amount: '',
    });
  };

  const handleConsultantFeesTypeChange = (type) => {
    if (formData.consultant_fees_type === type) return;
    onFormDataChange({
      ...formData,
      consultant_fees_type: type,
      consultant_fees_percentage: '',
      consultant_fees_amount: '',
    });
  };

  const handleCustomFeeTypeChange = (id, type) => {
    onFormDataChange({
      ...formData,
      custom_fees: customFees.map(f => f.id === id && f.type !== type ? {
        ...f,
        type,
        percentage: '',
        amount: '',
      } : f)
    });
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
        <div className={`nfs-top-row${showHiddenConsultantFee ? ' nfs-top-row--with-hidden-fees' : ''}`}>

          {/* Variation breakdown */}
          <div className="nfs-block nfs-block--variation">
            <div className="nfs-block__title">{t('variation_summary')}</div>
            <div className="nfs-flow">

              <div className="nfs-flow-row nfs-flow-row--omit">
                <div className="nfs-flow-row__icon"><FaMinus /></div>
                <div className="nfs-flow-row__label">{t('total_omitted')}</div>
                <div className="nfs-flow-row__value nfs-flow-row__value--neg">
                  {renderAmount(totalOmitted)}
                </div>
                {isEditMode && formData.discount_type !== 'none' && (
                  <label className="nfs-check no-print">
                    <input
                      type="checkbox"
                      checked={formData.discount_applies_to_variation}
                      onChange={(e) => handleDiscountCheckbox('discount_applies_to_variation', e.target.checked)}
                    />
                    <span>{t('apply_discount')}</span>
                  </label>
                )}
              </div>

              <div className="nfs-flow-row nfs-flow-row--add">
                <div className="nfs-flow-row__icon"><FaPlus /></div>
                <div className="nfs-flow-row__label">{t('total_added')}</div>
                <div className="nfs-flow-row__value nfs-flow-row__value--pos">
                  {renderAmount(totalAdded)}
                </div>
              </div>

              <div className={`nfs-flow-row nfs-flow-row--net ${isPositive ? 'nfs-flow-row--net-pos' : 'nfs-flow-row--net-neg'}`}>
                <div className="nfs-flow-row__icon"><FaEquals /></div>
                <div className="nfs-flow-row__label">{t('total_variation_amount')}</div>
                <div className="nfs-flow-row__value nfs-flow-row__value--bold">
                  {renderAmount(totalVariationAmount)}
                </div>
              </div>

              {hasDiscount && variationAmountAfterDiscount !== totalVariationAmount && (
                <div className="nfs-flow-row nfs-flow-row--after">
                  <div className="nfs-flow-row__icon"><FaTag /></div>
                  <div className="nfs-flow-row__label">{t('total_variation_amount_after_discount')}</div>
                  <div className="nfs-flow-row__value">
                    {renderAmount(variationAmountAfterDiscount)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`nfs-right${showHiddenConsultantFee ? ' nfs-right--with-hidden-fees' : ''}`}>
            <div className="nfs-block__title">{t('final_summary')}</div>
            <div className="nfs-total-card">
              <div className="nfs-total-card__content">
                <div className="nfs-total-rows">
                  <div className="nfs-total-row">
                    <span>{t('total_omitted')}</span>
                    <span className="nfs-total-row__val nfs-total-row__val--neg">
                      - {renderAmount(totalOmitted)}
                    </span>
                  </div>
                  <div className="nfs-total-row">
                    <span>{t('total_added')}</span>
                    <span className="nfs-total-row__val nfs-total-row__val--pos">
                      + {renderAmount(totalAdded)}
                    </span>
                  </div>
                  <div className="nfs-total-row nfs-total-row--variation">
                    <span>{t('total_variation_amount')}</span>
                    <span className={`nfs-total-row__val ${isPositive ? 'nfs-total-row__val--pos' : 'nfs-total-row__val--neg'}`}>
                      {renderAmount(totalVariationAmount)}
                    </span>
                  </div>
                  <div className="nfs-total-row">
                    <span>{t('contractor_ohp') || 'Contractor OHP'}</span>
                    <span className="nfs-total-row__val nfs-total-row__val--pos">
                      + {renderAmount(contractorEngineeringOHP)}
                    </span>
                  </div>
                  <div className="nfs-total-row">
                    <span>{t('consultant_fees') || 'Consultant Fees'}</span>
                    <span className="nfs-total-row__val nfs-total-row__val--pos">
                      + {renderAmount(consultantFees)}
                    </span>
                  </div>
                  {(customFeesWithAmounts || []).map(fee => (
                    <div key={fee.id} className="nfs-total-row">
                      <span>
                        {fee.name || (t('custom_fee') || 'Custom Fee')}
                        {fee.type === 'percentage' && fee.percentage && (
                          <span style={{ fontSize: '0.8em', color: '#6b7280', marginLeft: 4 }}>({fee.percentage}%)</span>
                        )}
                      </span>
                      <span className="nfs-total-row__val nfs-total-row__val--pos">
                        + {renderAmount(fee.computedAmount || 0)}
                      </span>
                    </div>
                  ))}
                  {hasDiscount && (
                    <div className="nfs-total-row">
                      <span>{t('total_before_discount')}</span>
                      <span className="nfs-total-row__val">
                        {renderAmount(totalAmountBeforeDiscount)}
                      </span>
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="nfs-total-row nfs-total-row--disc">
                      <span>{t('discount')} {discountPercentage > 0 && `(${discountPercentage.toFixed(1)}%)`}</span>
                      <span className="nfs-total-row__val nfs-total-row__val--neg">
                        - {renderAmount(discountAmount)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="nfs-total-card__final">
                  <span className="nfs-total-card__final-label">{t('final_amount')}</span>
                  <span className="nfs-total-card__final-value">
                    {renderAmount(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {showHiddenConsultantFee && (
            <div className="nfs-block nfs-block--hidden-fees">
              <div className="nfs-block__title">{t('extra_fees', 'Extra Fees')}</div>
              <div className="nfs-custom-fee-card nfs-hidden-fee-card">
                <div className="nfs-hidden-fee-card__header">
                  <div className="nfs-hidden-fee-card__heading">
                    <span className="nfs-hidden-fee-card__title">
                      {t('hidden_consultant_fee', 'Hidden Consultant Fee')}
                    </span>
                  </div>
                  <span className="nfs-hidden-fee-card__mode">
                    {hiddenVatModeLabels[hiddenVatMode]}
                  </span>
                </div>

                {isEditMode && (
                  <div className="nfs-vat-mode-row no-print">
                    {[
                      ['excluded', t('pf_enter_without_vat', 'Excluding VAT')],
                      ['included', t('pf_enter_with_vat', 'Including VAT')],
                      ['no_vat', t('pf_enter_no_vat', 'No VAT')],
                    ].map(([value, label]) => (
                      <label key={value} className="nfs-vat-mode-option">
                        <input
                          type="radio"
                          name="hidden_consultant_fee_vat_mode"
                          checked={hiddenVatMode === value}
                          onChange={() => onFormDataChange({
                            ...formData,
                            hidden_consultant_fee_vat_mode: value,
                            hidden_consultant_fee_vat_included: value === 'included',
                            hidden_consultant_fee_vat_rate: value === 'no_vat' ? '0' : '5',
                          })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                )}

                <div className="nfs-hidden-fee-entry">
                  <div className="nfs-hidden-fee-entry__label">
                    {t('hidden_consultant_fee_entered_amount', 'Entered amount')}
                  </div>
                  {isEditMode && (
                    <div className="nfs-hidden-fee-entry__control no-print">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="nvc-input nvc-input--sm nfs-num-input"
                        placeholder="0.00"
                        value={formData.hidden_consultant_fee ?? ''}
                        onChange={e => onFormDataChange({ ...formData, hidden_consultant_fee: e.target.value })}
                      />
                    </div>
                  )}
                  <span className="nfs-hidden-fee-entry__amount">
                    {renderAmount(hiddenConsultantFee)}
                  </span>
                </div>

                <div className="nfs-hidden-fee-breakdown">
                  <div className="nfs-hidden-fee-breakdown__item">
                    <span>{t('pf_net_amount', 'Net Amount')}</span>
                    <strong>{renderAmount(hiddenFeeDisplay.net_amount)}</strong>
                  </div>
                  <div className="nfs-hidden-fee-breakdown__item">
                    <span>{t('pf_vat_amount', 'VAT (5%)')}</span>
                    <strong>{renderAmount(hiddenFeeDisplay.vat_amount)}</strong>
                  </div>
                  <div className="nfs-hidden-fee-breakdown__item nfs-hidden-fee-breakdown__item--total">
                    <span>{t('pf_gross_amount', 'Total (incl. VAT)')}</span>
                    <strong>{renderAmount(hiddenFeeDisplay.gross_amount)}</strong>
                  </div>
                </div>

                {(isEditMode || existingHiddenFeeAttachment) && (
                  <div className="nfs-hidden-fee-attachment no-print">
                    <div className="nfs-hidden-fee-attachment__label">
                      {t('hidden_consultant_fee_attachment', 'Hidden fee attachment')}
                    </div>
                    {isEditMode ? (
                      <FileUpload
                        className="nfs-hidden-fee-file-upload"
                        value={hiddenFeeAttachment}
                        onChange={(file) => {
                          setHiddenFeeAttachment?.(file);
                          if (file) setHiddenFeeAttachmentCleared?.(false);
                        }}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        maxSizeMB={50}
                        showPreview={true}
                        existingFileUrl={existingHiddenFeeAttachment}
                        existingFileName={existingHiddenFeeAttachmentName || (existingHiddenFeeAttachment || '').split('/').pop()}
                        onRemoveExisting={() => {
                          setExistingHiddenFeeAttachment?.(null);
                          setHiddenFeeAttachment?.(null);
                          setHiddenFeeAttachmentCleared?.(true);
                        }}
                      />
                    ) : (
                      <FileAttachmentView
                        fileUrl={existingHiddenFeeAttachment}
                        fileName={existingHiddenFeeAttachmentName || (existingHiddenFeeAttachment || '').split('/').pop()}
                        projectId={project?.id}
                      />
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

        <div className="nfs-fees-row">
          <div className="nfs-block nfs-block--fees">
            <div className="nfs-block__title">{t('fees')}</div>

            <div className="nfs-fees-grid">

              {/* Contractor OHP */}
              <FeeCard
                label={<>
                  {t('contractor_ohp')}
                  {formData.contractor_ohp_type === 'percentage' && formData.contractor_ohp_percentage && (
                    <span className="nfs-fee-row__pct">{formData.contractor_ohp_percentage}%</span>
                  )}
                </>}
                typeValue={formData.contractor_ohp_type}
                inputValue={formData.contractor_ohp_type === 'percentage' ? (formData.contractor_ohp_percentage ?? '') : (formData.contractor_ohp_amount ?? '')}
                onTypeChange={handleContractorOHPTypeChange}
                onInputChange={val => onFormDataChange({ ...formData, [formData.contractor_ohp_type === 'percentage' ? 'contractor_ohp_percentage' : 'contractor_ohp_amount']: val })}
                displayAmount={contractorEngineeringOHP}
                afterDiscountAmount={hasDiscount ? contractorOHPAfterDiscount : null}
                afterDiscountLabel={t('contractor_ohp_after_discount')}
                extras={[
                  isEditMode && formData.discount_type !== 'none' && (
                    <label key="disc" className="nfs-check">
                      <input type="checkbox" checked={formData.discount_applies_to_contractor_ohp} onChange={e => handleDiscountCheckbox('discount_applies_to_contractor_ohp', e.target.checked)} />
                      <span>{t('apply_discount')}</span>
                    </label>
                  ),
                ].filter(Boolean)}
                isEditMode={isEditMode}
                lang={lang}
                renderAmount={renderAmount}
              />

              {/* Consultant Fees */}
              <FeeCard
                label={<>
                  {t('consultant_fees')}
                  {formData.consultant_fees_type === 'percentage' && formData.consultant_fees_percentage && (
                    <span className="nfs-fee-row__pct">{formData.consultant_fees_percentage}%</span>
                  )}
                </>}
                typeValue={formData.consultant_fees_type}
                inputValue={formData.consultant_fees_type === 'percentage' ? (formData.consultant_fees_percentage ?? '') : (formData.consultant_fees_amount ?? '')}
                onTypeChange={handleConsultantFeesTypeChange}
                onInputChange={val => onFormDataChange({ ...formData, [formData.consultant_fees_type === 'percentage' ? 'consultant_fees_percentage' : 'consultant_fees_amount']: val })}
                displayAmount={consultantFees}
                afterDiscountAmount={hasDiscount ? consultantFeesAfterDiscount : null}
                afterDiscountLabel={t('consultant_fees_after_discount')}
                extras={[
                  isEditMode && formData.discount_type !== 'none' && (
                    <label key="disc" className="nfs-check">
                      <input type="checkbox" checked={formData.discount_applies_to_consultant_fees} onChange={e => handleDiscountCheckbox('discount_applies_to_consultant_fees', e.target.checked)} />
                      <span>{t('apply_discount')}</span>
                    </label>
                  ),
                  isEditMode && (
                    <label key="on-added" className="nfs-check">
                      <input type="checkbox" checked={formData.consultant_fee_on_total_added} onChange={e => onFormDataChange({ ...formData, consultant_fee_on_total_added: e.target.checked })} />
                      <span>{t('consultant_fee_on_total_added')}</span>
                    </label>
                  ),
                ].filter(Boolean)}
                isEditMode={isEditMode}
                lang={lang}
                renderAmount={renderAmount}
              />

              {/* Custom Fees */}
              {customFees.map(fee => {
                const computed = (customFeesWithAmounts || []).find(f => f.id === fee.id);
                const feeType = fee.type || 'amount';
                return (
                  <FeeCard
                    key={fee.id}
                    label={<>
                      {fee.name || (t('custom_fee') || 'Custom Fee')}
                      {feeType === 'percentage' && fee.percentage && (
                        <span className="nfs-fee-row__pct">{fee.percentage}%</span>
                      )}
                    </>}
                    nameInput={isEditMode && (
                      <input
                        type="text"
                        className="nvc-input nvc-input--sm nfs-custom-fee-card__name-input"
                        placeholder={t('fee_name') || 'Fee name'}
                        value={fee.name}
                        onChange={e => updateCustomFee(fee.id, 'name', e.target.value)}
                      />
                    )}
                    removeBtn={isEditMode && (
                      <button type="button" className="nfs-custom-fee-remove no-print" onClick={() => removeCustomFee(fee.id)} title={t('remove') || 'Remove'}>
                        <FaTimes size={11} />
                      </button>
                    )}
                    typeValue={feeType}
                    inputValue={feeType === 'percentage' ? (fee.percentage ?? '') : (fee.amount ?? '')}
                    onTypeChange={type => handleCustomFeeTypeChange(fee.id, type)}
                    onInputChange={val => updateCustomFee(fee.id, feeType === 'percentage' ? 'percentage' : 'amount', val)}
                    displayAmount={computed ? computed.computedAmount : 0}
                    extras={[]}
                    isEditMode={isEditMode}
                    lang={lang}
                    renderAmount={renderAmount}
                  />
                );
              })}

              {/* Add Fee button lives in the grid */}
              {isEditMode && (
                <button type="button" className="nfs-add-fee-btn no-print" onClick={addCustomFee}>
                  <FaPlus size={10} />
                  {t('add_fee') || 'Add Fee'}
                </button>
              )}

            </div>

            {/* Discount line */}
            {hasDiscount && (
              <div className="nfs-fee-row nfs-fee-row--discount">
                <div className="nfs-fee-row__info">
                  <span className="nfs-fee-row__name nfs-fee-row__name--disc">
                    {t('discount')}
                    {discountPercentage > 0 && (
                      <span className="nfs-fee-row__pct">{discountPercentage.toFixed(1)}%</span>
                    )}
                  </span>
                </div>
                <div className="nfs-fee-row__right">
                  <span className="nfs-fee-row__amount nfs-fee-row__amount--neg">
                    - {renderAmount(discountAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
});

FinancialSummary.displayName = 'FinancialSummary';

export default FinancialSummary;
