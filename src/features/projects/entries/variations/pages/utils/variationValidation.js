/**
 * Variation Validation Utility
 *
 * Validation functions for Notice of Variation
 */

/**
 * Validate discount settings
 */
export function validateDiscount(formData, totalVariationAmount, contractorOHP, consultantFees, totalAmountBeforeDiscount, t, formatMoney) {
  if (formData.discount_type === 'none') {
    return { valid: true };
  }

  // Check at least one component is selected
  const hasSelectedComponents =
    formData.discount_applies_to_variation ||
    formData.discount_applies_to_contractor_ohp ||
    formData.discount_applies_to_consultant_fees;

  if (!hasSelectedComponents) {
    return {
      valid: false,
      error: t('select_at_least_one_component') || 'يجب اختيار بند واحد على الأقل لتطبيق الخصم عليه',
    };
  }

  // Calculate discount base
  const discountBase =
    (formData.discount_applies_to_variation ? totalVariationAmount : 0) +
    (formData.discount_applies_to_contractor_ohp ? contractorOHP : 0) +
    (formData.discount_applies_to_consultant_fees ? consultantFees : 0);

  // Validate by discount type
  if (formData.discount_type === 'amount') {
    const enteredDiscount = parseFloat(formData.discount_amount || 0);
    if (enteredDiscount > discountBase) {
      return {
        valid: false,
        error:
          t('discount_exceeds_base') ||
          `الخصم المدخل (${formatMoney(enteredDiscount)}) يتجاوز المبلغ القابل للخصم (${formatMoney(discountBase)})`,
      };
    }
  } else if (formData.discount_type === 'final_amount') {
    const enteredFinalAmount = parseFloat(formData.final_amount_after_discount || totalAmountBeforeDiscount);

    const nonSelectedAmount =
      (formData.discount_applies_to_variation ? 0 : totalVariationAmount) +
      (formData.discount_applies_to_contractor_ohp ? 0 : contractorOHP) +
      (formData.discount_applies_to_consultant_fees ? 0 : consultantFees);

    const maxAmount = totalAmountBeforeDiscount;
    const minAmount = nonSelectedAmount;

    if (enteredFinalAmount < minAmount || enteredFinalAmount > maxAmount) {
      return {
        valid: false,
        error:
          t('final_amount_invalid') ||
          `المبلغ النهائي يجب أن يكون بين ${formatMoney(minAmount)} و ${formatMoney(maxAmount)}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate variation before submit
 */
export function validateVariationSubmit(formData, calculations, omittedItems, addedItems, t, formatMoney) {
  const hasText = (value) => String(value ?? '').trim().length > 0;

  if (!hasText(formData.variation_description)) {
    return t('variation_description_required') || 'Variation description is required';
  }

  if (!hasText(formData.variation_cause)) {
    return t('variation_cause_required') || 'Variation cause is required';
  }

  if ((omittedItems?.length || 0) + (addedItems?.length || 0) === 0) {
    return t('variation_item_required') || 'Please add at least one variation item';
  }

  // Validate at least one component is selected when discount is applied
  if (formData.discount_type !== 'none') {
    const hasSelectedComponents =
      formData.discount_applies_to_variation ||
      formData.discount_applies_to_contractor_ohp ||
      formData.discount_applies_to_consultant_fees;

    if (!hasSelectedComponents) {
      return t('select_at_least_one_component') || 'يجب اختيار بند واحد على الأقل لتطبيق الخصم عليه';
    }

    const discountBase =
      (formData.discount_applies_to_variation ? calculations.totalVariationAmount : 0) +
      (formData.discount_applies_to_contractor_ohp ? calculations.contractorOHP : 0) +
      (formData.discount_applies_to_consultant_fees ? calculations.consultantFees : 0);

    if (formData.discount_type === 'amount') {
      const enteredDiscount = parseFloat(formData.discount_amount || 0);

      if (enteredDiscount > discountBase) {
        return (
          t('discount_exceeds_base') ||
          `الخصم المدخل (${formatMoney(enteredDiscount)}) يتجاوز المبلغ القابل للخصم (${formatMoney(discountBase)})`
        );
      }
    } else if (formData.discount_type === 'final_amount') {
      const enteredFinalAmount = parseFloat(
        formData.final_amount_after_discount || calculations.totalAmountBeforeDiscount
      );

      const nonSelectedAmount =
        (formData.discount_applies_to_variation ? 0 : calculations.totalVariationAmount) +
        (formData.discount_applies_to_contractor_ohp ? 0 : calculations.contractorOHP) +
        (formData.discount_applies_to_consultant_fees ? 0 : calculations.consultantFees);

      const maxAmount = calculations.totalAmountBeforeDiscount;
      const minAmount = nonSelectedAmount;

      if (enteredFinalAmount < minAmount || enteredFinalAmount > maxAmount) {
        return (
          t('final_amount_invalid') ||
          `المبلغ النهائي يجب أن يكون بين ${formatMoney(minAmount)} و ${formatMoney(maxAmount)}`
        );
      }
    }
  }

  return null;
}