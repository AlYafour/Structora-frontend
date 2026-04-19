/**
 * usePaymentForm Hook
 *
 * Manages payment form state
 */

import { useState, useCallback } from 'react';

const defaultFormData = {
  amount: '',
  date: '',
  description: '',
  project: '',
  payer: 'owner',
  payment_method: '',
  actual_invoice: '',
  recipient_account_number: '',
  sender_account_number: '',
  transferor_name: '',
  cheque_holder_name: '',
  cheque_account_number: '',
  cheque_date: '',
  project_financial_account: '',
  completion_percentage: '',
  is_advance_payment: false,
  advance_percentage: '',
  use_credit: false,
  credit_amount: '',
};

/**
 * Hook for managing payment form state
 */
export function usePaymentForm(initialProject = '') {
  const [formData, setFormData] = useState({
    ...defaultFormData,
    project: initialProject
  });

  /**
   * Update single form field
   */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Update multiple form fields
   */
  const updateFields = useCallback(updates => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Reset form to defaults
   */
  const resetForm = useCallback(() => {
    setFormData({ ...defaultFormData, project: initialProject });
  }, [initialProject]);

  /**
   * Load form data (for edit mode)
   */
  const loadFormData = useCallback(data => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  return {
    formData,
    setFormData,
    updateField,
    updateFields,
    resetForm,
    loadFormData
  };
}
