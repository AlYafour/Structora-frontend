/**
 * PaymentFormFields Component
 *
 * Main form fields for payment information
 * Organized into clear sections with auto-fill indicators
 */

import { memo } from 'react';
import CurrencyField from '../../../../../../components/forms/CurrencyField';
import DateInput from '../../../../../../components/forms/DateInput';
import { getPaymentMethodOptions } from '../utils/paymentFormatters';
import './PaymentFormFields.css';

const PaymentFormFields = memo(({
 formData,
 onUpdateField,
 ownerShare = 0,
 autoFilledFields = {},
 hasExistingAdvance = false,
 availableCredit = 0,
 t
}) => {
 const paymentMethodOptions = getPaymentMethodOptions(formData.payer, t);

 return (
 <>
 {/* Section 1: Payment Details */}
 <div className="payment-form-fields__section">
  <div className="payment-form-fields__section-title">{t('payment_details')}</div>
  <div className="ds-grid ds-grid-cols-2 ds-gap-4">
   <div>
    <label className="payment-form-fields__label">
     {t('amount')} <span className="payment-form-fields__required">*</span>
    </label>
    <CurrencyField
     value={formData.amount}
     onChange={value => onUpdateField('amount', value)}
     placeholder="0.00"
     showCurrency={true}
     showArabicWords={false}
    />
    {formData.actual_invoice && (
     <small className="payment-form-fields__hint payment-form-fields__hint--success">
      ✓ {t('linked_to_invoice')}
     </small>
    )}
   </div>
   <div>
    <label className="payment-form-fields__label">
     {t('payment_date')} <span className="payment-form-fields__required">*</span>
    </label>
    <DateInput
     className="prj-input"
     value={formData.date}
     onChange={value => onUpdateField('date', value)}
    />
   </div>
  </div>
 </div>

 {/* Section 2: Payer & Payment Method */}
 <div className="payment-form-fields__section">
  <div className="payment-form-fields__section-title">{t('payer_and_method')}</div>
  <div className="ds-grid ds-grid-cols-2 ds-gap-4">
   <div>
    <label className="payment-form-fields__label">
     {t('payer')} <span className="payment-form-fields__required">*</span>
    </label>
    <select
     className="prj-select w-full"
     value={formData.payer}
     onChange={e => onUpdateField('payer', e.target.value)}
    >
     <option value="owner">{t('payer_owner')}</option>
     <option value="bank">{t('payer_bank')}</option>
    </select>
   </div>
   <div>
    <label className="payment-form-fields__label">
     {t('payment_method')} <span className="payment-form-fields__required">*</span>
    </label>
    <select
     className="prj-select w-full"
     value={formData.payer === 'bank' ? 'bank_transfer' : formData.payment_method}
     onChange={e => onUpdateField('payment_method', e.target.value)}
     disabled={formData.payer === 'bank'}
    >
     <option value="">{t('select_payment_method')}</option>
     {paymentMethodOptions.map(option => (
      <option key={option.value} value={option.value}>
       {option.label}
      </option>
     ))}
    </select>
    {formData.payer === 'bank' && (
     <small className="payment-form-fields__hint">
      {t('payment_bank_transfer_only')}
     </small>
    )}
   </div>
  </div>

  {/* Bank Transfer Sub-section */}
  {(formData.payment_method === 'bank_transfer' || formData.payer === 'bank') && (
   <div className="payment-form-fields__sub-section">
    <div className="payment-form-fields__sub-title">{t('bank_transfer_details')}</div>
    <div className="ds-grid ds-grid-cols-3 ds-gap-4">
     <div>
      <label className="payment-form-fields__label">
       {t('sender_account_number')}
      </label>
      <input
       type="text"
       className="prj-input"
       value={formData.sender_account_number}
       onChange={e => onUpdateField('sender_account_number', e.target.value)}
       placeholder={t('sender_account_number_placeholder')}
      />
     </div>
     <div>
      <label className="payment-form-fields__label">
       {t('recipient_account_number')}
      </label>
      <input
       type="text"
       className="prj-input"
       value={formData.recipient_account_number}
       onChange={e => onUpdateField('recipient_account_number', e.target.value)}
       placeholder={t('recipient_account_number_placeholder')}
      />
     </div>
     <div>
      <label className="payment-form-fields__label">
       {t('transferor_name')}
      </label>
      <input
       type="text"
       className="prj-input"
       value={formData.transferor_name}
       onChange={e => onUpdateField('transferor_name', e.target.value)}
       placeholder={t('transferor_name_placeholder')}
      />
     </div>
    </div>
   </div>
  )}

  {/* Cash Deposit Sub-section */}
  {formData.payment_method === 'cash_deposit' && (
   <div className="payment-form-fields__sub-section">
    <div className="payment-form-fields__sub-title">{t('cash_deposit_details')}</div>
    <div className="ds-grid ds-grid-cols-2 ds-gap-4">
     <div>
      <label className="payment-form-fields__label">
       {t('sender_name')}
      </label>
      <input
       type="text"
       className="prj-input"
       value={formData.sender_account_number}
       onChange={e => onUpdateField('sender_account_number', e.target.value)}
       placeholder={t('sender_name_placeholder')}
      />
     </div>
     <div>
      <label className="payment-form-fields__label">
       {t('recipient_account_number')}
      </label>
      <input
       type="text"
       className="prj-input"
       value={formData.recipient_account_number}
       onChange={e => onUpdateField('recipient_account_number', e.target.value)}
       placeholder={t('recipient_account_number_placeholder')}
      />
     </div>
    </div>
   </div>
  )}

  {/* Cheque Sub-section */}
  {formData.payment_method === 'bank_cheque' && (
   <div className="payment-form-fields__sub-section">
    <div className="payment-form-fields__sub-title">{t('bank_cheque_details')}</div>
    <div className="ds-grid ds-grid-cols-3 ds-gap-4">
     <div>
      <label className="payment-form-fields__label">
       {t('cheque_holder_name')}
      </label>
      <input
       type="text"
       className="prj-input"
       value={formData.cheque_holder_name}
       onChange={e => onUpdateField('cheque_holder_name', e.target.value)}
       placeholder={t('cheque_holder_name_placeholder')}
      />
     </div>
     <div>
      <label className="payment-form-fields__label">
       {t('cheque_account_number')}
      </label>
      <input
       type="text"
       className="prj-input"
       value={formData.cheque_account_number}
       onChange={e => onUpdateField('cheque_account_number', e.target.value)}
       placeholder={t('cheque_account_number_placeholder')}
      />
     </div>
     <div>
      <label className="payment-form-fields__label">
       {t('cheque_date')}
      </label>
      <DateInput
       className="prj-input"
       value={formData.cheque_date}
       onChange={value => onUpdateField('cheque_date', value)}
       placeholder={t('cheque_date_placeholder')}
      />
     </div>
    </div>
   </div>
  )}

  {/* Advance Payment Sub-section - Owner only */}
  {formData.payer === 'owner' && (
   <div className="payment-form-fields__sub-section">
    <label className="payment-form-fields__label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: hasExistingAdvance ? 'not-allowed' : 'pointer', opacity: hasExistingAdvance ? 0.6 : 1 }}>
     <input
      type="checkbox"
      checked={formData.is_advance_payment || false}
      disabled={hasExistingAdvance}
      onChange={e => {
       onUpdateField('is_advance_payment', e.target.checked);
       if (!e.target.checked) {
        onUpdateField('advance_percentage', '');
       }
      }}
     />
     {t('advance_payment', 'دفعة مقدمة')}
    </label>
    {hasExistingAdvance && (
     <small className="payment-form-fields__hint payment-form-fields__hint--warning">
      {t('advance_already_exists')}
     </small>
    )}

    {formData.is_advance_payment && !hasExistingAdvance && (
     <div style={{ marginTop: '8px' }}>
      <div className="ds-grid ds-grid-cols-2 ds-gap-4">
       <div>
        <label className="payment-form-fields__label">
         {t('advance_percentage', 'نسبة الدفعة المقدمة (%)')}
        </label>
        <input
         type="number"
         className="prj-input"
         value={formData.advance_percentage || ''}
         onChange={e => {
          const pct = e.target.value;
          onUpdateField('advance_percentage', pct);
          if (pct && ownerShare > 0) {
           const calculated = (ownerShare * parseFloat(pct) / 100).toFixed(2);
           onUpdateField('amount', calculated);
          }
         }}
         placeholder="10"
         min="0.01"
         max="100"
         step="0.01"
        />
       </div>
       <div>
        <label className="payment-form-fields__label">
         {t('advance_amount', 'مبلغ الدفعة المقدمة')}
        </label>
        <CurrencyField
         value={formData.amount}
         onChange={value => {
          onUpdateField('amount', value);
          if (value && ownerShare > 0) {
           const raw = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : parseFloat(value);
           if (!isNaN(raw) && raw > 0) {
            const pct = (raw / ownerShare * 100).toFixed(2);
            onUpdateField('advance_percentage', pct);
           }
          }
         }}
         placeholder="0.00"
         showCurrency={true}
         showArabicWords={false}
        />
       </div>
      </div>
      {ownerShare > 0 && (
       <small className="payment-form-fields__hint" style={{ marginTop: '4px' }}>
        {t('owner_share', 'حصة المالك')}: {Number(ownerShare).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('aed', 'د.إ')}
       </small>
      )}
     </div>
    )}
   </div>
  )}

  {/* Use Credit Sub-section - Owner only, shown when credit available */}
  {formData.payer === 'owner' && availableCredit > 0 && !formData.is_advance_payment && (
   <div className="payment-form-fields__sub-section">
    <label className="payment-form-fields__label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
     <input
      type="checkbox"
      checked={formData.use_credit || false}
      onChange={e => {
       onUpdateField('use_credit', e.target.checked);
       if (!e.target.checked) {
        onUpdateField('credit_amount', '');
       }
      }}
     />
     {t('use_credit')} ({Number(availableCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('aed', 'د.إ')})
    </label>

    {formData.use_credit && (
     <div style={{ marginTop: '8px' }}>
      <div className="ds-grid ds-grid-cols-2 ds-gap-4">
       <div>
        <label className="payment-form-fields__label">
         {t('credit_amount_to_use')}
        </label>
        <CurrencyField
         value={formData.credit_amount}
         onChange={value => {
          const raw = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : parseFloat(value);
          if (!isNaN(raw) && raw > availableCredit) {
           onUpdateField('credit_amount', String(availableCredit));
          } else {
           onUpdateField('credit_amount', value);
          }
         }}
         placeholder="0.00"
         showCurrency={true}
         showArabicWords={false}
        />
       </div>
       <div>
        <label className="payment-form-fields__label">
         {t('available_credit')}
        </label>
        <div className="payment-form-fields__info-display">
         {Number(availableCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('aed', 'د.إ')}
        </div>
       </div>
      </div>
     </div>
    )}
   </div>
  )}
 </div>

 {/* Section 3: Description */}
 <div className="payment-form-fields__section">
  <label className="payment-form-fields__label">
   {t('description')}
  </label>
  <textarea
   className="prj-input ds-w-full payment-form-fields__textarea"
   value={formData.description}
   onChange={e => onUpdateField('description', e.target.value)}
   placeholder={t('description_placeholder')}
   rows={2}
  />
 </div>

 {/* Section 4: Additional Information */}
 {(formData.payer === 'bank' || formData.completion_percentage) && (
 <div className="payment-form-fields__section payment-form-fields__section--last">
  <div className="payment-form-fields__section-title">{t('additional_info')}</div>
  <div className="ds-grid ds-grid-cols-2 ds-gap-4">
   {/* Project Financial Account - only for bank payer */}
   {formData.payer === 'bank' && (
   <div>
    <label className="payment-form-fields__label">
     {t('project_financial_account')}
    </label>
    <input
     type="text"
     className="prj-input"
     value={formData.project_financial_account}
     onChange={e => onUpdateField('project_financial_account', e.target.value)}
     placeholder={t('project_financial_account_placeholder')}
    />
    {formData.project_financial_account && (
     <small className="payment-form-fields__hint">
      {t('project_financial_account_note')}
     </small>
    )}
    {autoFilledFields.project_financial_account && (
     <small className="payment-form-fields__hint payment-form-fields__hint--auto">
      ✦ {t('auto_filled_from_payment')}
     </small>
    )}
   </div>
   )}
   {/* Completion Percentage - read-only info from progress page */}
   {formData.completion_percentage && (
   <div>
    <label className="payment-form-fields__label">
     {t('completion_percentage')}
    </label>
    <div className="payment-form-fields__info-display">
     {formData.completion_percentage}%
    </div>
    <small className="payment-form-fields__hint payment-form-fields__hint--auto">
     ✦ {t('auto_filled_from_progress')}
    </small>
   </div>
   )}
  </div>
 </div>
 )}
 </>
 );
});

PaymentFormFields.displayName = 'PaymentFormFields';

export default PaymentFormFields;
