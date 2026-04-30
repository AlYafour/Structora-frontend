/**
 * Payment Validation Utilities
 *
 * Validation functions for payment form
 */

/**
 * Validate payment form data before submission
 */
export function validatePaymentForm(formData, t) {
  const errors = [];

  // Date is always required; amount can be 0 if paying fully from credit
  const creditAmount = parseFloat((formData.credit_amount || '').replace(/,/g, '')) || 0;
  const paymentAmountRaw = parseFloat((formData.amount || '').replace(/,/g, '')) || 0;
  const effectiveAmount = paymentAmountRaw + (formData.use_credit ? creditAmount : 0);

  if (!formData.date) {
    errors.push(t('fill_required_fields') || 'يرجى ملء جميع الحقول المطلوبة');
  }
  if (effectiveAmount <= 0) {
    errors.push(t('fill_required_fields') || 'يرجى ملء جميع الحقول المطلوبة');
  }

  // Owner payer must have payment method only if paying cash (not purely from credit)
  if (formData.payer === 'owner' && !formData.payment_method && paymentAmountRaw > 0) {
    errors.push(t('payment_method_required') || 'يرجى تحديد طريقة الدفع');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate allocations don't exceed payment amount
 */
export function validateAllocations(allocations, paymentAmount, creditBalance, t) {
  const errors = [];

  if (allocations.length > 0 && creditBalance < -0.01) {
    errors.push(
      t('allocation_exceeds_payment_warning') ||
        'إجمالي التوزيع على الفواتير يتجاوز مبلغ الدفعة'
    );
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate selected invoice is available
 */
export function validateInvoiceAvailability(invoiceId, actualInvoices, isEditMode, t) {
  if (!invoiceId) return { isValid: true };

  const selectedInvoice = actualInvoices.find(inv => inv.id === parseInt(invoiceId));
  if (!selectedInvoice && !isEditMode) {
    return {
      isValid: false,
      error: t('actual_invoice_already_linked') || 'الفاتورة المحددة مرتبطة بدفعة أخرى'
    };
  }

  return { isValid: true };
}

/**
 * Validate all payment submission data
 */
export function validatePaymentSubmission(formData, allocations, actualInvoices, paymentAmount, creditBalance, isEditMode, t) {
  // Advance payments have simplified validation
  if (formData.is_advance_payment) {
    const errors = [];
    if ((!formData.amount || parseFloat((formData.amount || '').replace(/,/g, '')) <= 0) || !formData.date) {
      errors.push(t('fill_required_fields') || 'يرجى ملء جميع الحقول المطلوبة');
    }
    if (!formData.advance_percentage) {
      errors.push(t('advance_percentage_required') || 'يرجى تحديد نسبة الدفعة المقدمة');
    }
    if (formData.payer !== 'owner') {
      errors.push(t('advance_payment_owner_only') || 'الدفعة المقدمة متاحة للمالك فقط');
    }
    if (formData.payer === 'owner' && !formData.payment_method) {
      errors.push(t('payment_method_required') || 'يرجى تحديد طريقة الدفع');
    }
    return { isValid: errors.length === 0, errors };
  }

  // Block if a project is selected but has no invoices for the chosen payer
  if (!isEditMode && formData.project) {
    const payerInvoices = actualInvoices.filter(inv => inv.payer === formData.payer);
    if (payerInvoices.length === 0) {
      return {
        isValid: false,
        errors: [t('no_invoices_for_payer')]
      };
    }
  }

  const formValidation = validatePaymentForm(formData, t);
  if (!formValidation.isValid) {
    return formValidation;
  }

  const allocationValidation = validateAllocations(allocations, paymentAmount, creditBalance, t);
  if (!allocationValidation.isValid) {
    return allocationValidation;
  }

  const invoiceValidation = validateInvoiceAvailability(formData.actual_invoice, actualInvoices, isEditMode, t);
  if (!invoiceValidation.isValid) {
    return invoiceValidation;
  }

  return { isValid: true, errors: [] };
}
