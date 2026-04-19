/**
 * Payment Formatters Utilities
 *
 * Data formatting and transformation for payments
 */

import { removeCommas, formatNumberWithCommas } from '../../../../../../utils/formatters/number';

/**
 * Format payment data from API for form
 */
export function formatPaymentDataForForm(data) {
  const formattedAmount = data.amount ? formatNumberWithCommas(String(data.amount)) : '';

  return {
    amount: formattedAmount,
    date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
    description: data.description || '',
    project: data.project || '',
    payer: data.payer || 'owner',
    payment_method: data.payment_method || '',
    actual_invoice: data.actual_invoice_id || '',
    recipient_account_number: data.recipient_account_number || '',
    sender_account_number: data.sender_account_number || '',
    transferor_name: data.transferor_name || '',
    cheque_holder_name: data.cheque_holder_name || '',
    cheque_account_number: data.cheque_account_number || '',
    cheque_date: data.cheque_date ? new Date(data.cheque_date).toISOString().split('T')[0] : '',
    project_financial_account: data.project_financial_account || '',
    completion_percentage: data.completion_percentage || '',
    is_advance_payment: data.is_advance_payment || false,
    advance_percentage: data.advance_percentage || '',
  };
}

/**
 * Build FormData for payment submission
 */
export function buildPaymentFormData(formData, allocations, allocationMode, files, t) {
  const formDataToSend = new FormData();
  const amountValue = removeCommas(formData.amount);

  // Basic payment data
  formDataToSend.append('amount', parseFloat(amountValue) || 0);
  formDataToSend.append('date', formData.date);
  formDataToSend.append('description', formData.description || '');
  formDataToSend.append('payer', formData.payer);
  formDataToSend.append(
    'payment_method',
    formData.payer === 'bank'
      ? 'bank_transfer'
      : (formData.payment_method || 'credit_offset')
  );

  // Project
  if (formData.project) {
    formDataToSend.append('project', parseInt(formData.project));
  }

  // Legacy support: if actual_invoice is provided and no allocations, use it
  if (formData.actual_invoice && allocations.length === 0) {
    formDataToSend.append('actual_invoice', parseInt(formData.actual_invoice));
  }

  // Send allocations if they exist
  if (allocations.length > 0) {
    const allocationsData = allocations
      .filter(alloc => {
        const amount = parseFloat(removeCommas(alloc.allocated_amount || '0')) || 0;
        return amount > 0.01;
      })
      .map(alloc => ({
        invoice_id: alloc.invoice_id,
        amount: parseFloat(removeCommas(alloc.allocated_amount || '0')) || 0,
        notes:
          allocationMode === 'auto'
            ? t('auto_allocate_fifo_description')
            : t('manual_allocate_description')
      }));

    if (allocationsData.length > 0) {
      formDataToSend.append('allocations', JSON.stringify(allocationsData));
    }
  }

  // Additional fields
  const optionalFields = [
    'recipient_account_number',
    'sender_account_number',
    'transferor_name',
    'cheque_holder_name',
    'cheque_account_number',
    'cheque_date',
    'project_financial_account'
  ];

  optionalFields.forEach(field => {
    if (formData[field]) {
      formDataToSend.append(field, formData[field]);
    }
  });

  // Completion percentage
  if (formData.completion_percentage) {
    formDataToSend.append('completion_percentage', parseFloat(formData.completion_percentage));
  }

  // Advance payment fields
  if (formData.is_advance_payment) {
    formDataToSend.append('is_advance_payment', 'true');
    if (formData.advance_percentage) {
      formDataToSend.append('advance_percentage', formData.advance_percentage);
    }
    formDataToSend.append('advance_amount', parseFloat(amountValue) || 0);
  }

  // Credit usage fields
  if (formData.use_credit && formData.credit_amount) {
    const creditValue = parseFloat(removeCommas(formData.credit_amount)) || 0;
    if (creditValue > 0) {
      formDataToSend.append('use_credit_amount', creditValue);
    }
  }

  // File attachments
  if (files.depositSlip instanceof File) {
    formDataToSend.append('deposit_slip', files.depositSlip);
  }
  if (files.invoiceFile instanceof File) {
    formDataToSend.append('invoice_file', files.invoiceFile);
  }
  if (files.receiptVoucher instanceof File) {
    formDataToSend.append('receipt_voucher', files.receiptVoucher);
  }
  if (files.bankPaymentAttachments instanceof File) {
    formDataToSend.append('bank_payment_attachments', files.bankPaymentAttachments);
  }

  return formDataToSend;
}

/**
 * Check if deposit slip should be shown
 */
export function shouldShowDepositSlip(payer, paymentMethod) {
  return (
    payer === 'owner' &&
    (paymentMethod === 'cash_deposit' || paymentMethod === 'bank_transfer')
  );
}

/**
 * Get payment method options
 */
export function getPaymentMethodOptions(payer, t) {
  if (payer === 'bank') {
    return [{ value: 'bank_transfer', label: t('bank_transfer') }];
  }

  return [
    { value: 'cash_office', label: t('cash_office') },
    { value: 'bank_cheque', label: t('bank_cheque') },
    { value: 'bank_transfer', label: t('bank_transfer') },
    { value: 'cash_deposit', label: t('cash_deposit') }
  ];
}

/**
 * Initialize allocations from invoices
 */
export function initializeAllocationsFromInvoices(invoices) {
  return invoices.map(inv => ({
    invoice_id: inv.id,
    invoice_number: inv.invoice_number || `#${inv.id}`,
    total_amount: inv.amount,
    remaining_amount: inv.remaining_amount,
    allocated_amount: ''
  }));
}
