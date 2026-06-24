/**
 * useVariationForm Hook
 *
 * Manages form state and handlers for variation form
 */

import { useState, useCallback } from 'react';

const defaultFormData = {
  document_date: new Date().toISOString().split('T')[0],
  variation_number: '',
  reference_no: '',
  first_variation_date: '',
  variation_description: '',
  variation_cause: '',
  additional_time: '',
  trade_discipline: '',
  item_description: '',
  project_description: '',
  remarks: '',
  vat_percentage: '15',
  consultant_fees_type: 'percentage',
  consultant_fees_percentage: '4',
  consultant_fees_amount: '',
  consultant_fee_on_total_added: false,
  contractor_ohp_type: 'percentage',
  contractor_ohp_percentage: '15',
  contractor_ohp_amount: '',
  discount_type: 'none',
  discount_percentage: '',
  discount_amount: '',
  final_amount_after_discount: '',
  discount_applies_to_variation: true,
  discount_applies_to_contractor_ohp: true,
  discount_applies_to_consultant_fees: true,
  hidden_consultant_fee: '',
  hidden_consultant_fee_vat_mode: 'excluded',
  hidden_consultant_fee_vat_included: false,
  hidden_consultant_fee_vat_rate: '5',
  hidden_consultant_fee_net_amount: 0,
  hidden_consultant_fee_vat_amount: 0,
  hidden_consultant_fee_gross_amount: 0,
  hidden_consultant_fee_note: '',
  custom_fees: [],
};

export function useVariationForm() {
  const [formData, setFormData] = useState(defaultFormData);

  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFormData = useCallback(() => {
    setFormData(defaultFormData);
  }, []);

  return {
    formData,
    setFormData,
    updateFormData,
    resetFormData
  };
}
