/**
 * Variation Calculations Utility
 *
 * All financial calculations for Notice of Variation
 */

/**
 * Round to 2 decimals
 */
export function round2(value) {
  if (!value || isNaN(value)) return 0;
  return Math.round(Number(value) * 100) / 100;
}

/**
 * Calculate total amount for items
 */
export function calculateItemsTotal(items) {
  return items.reduce((sum, item) => {
    const amount = typeof item.amount === 'number' ? item.amount : (parseFloat(item.amount) || 0);
    return sum + amount;
  }, 0);
}

/**
 * Calculate item amount from qty and rate
 */
export function calculateItemAmount(qty, rate) {
  const q = typeof qty === 'number' ? qty : (parseFloat(qty) || 0);
  const r = typeof rate === 'number' ? rate : (parseFloat(rate) || 0);
  return q * r;
}

/**
 * Calculate omitted items total for overhead base
 * Excludes items that already include overhead and profit
 */
export function calculateOmittedTotalForOverhead(omittedItems) {
  return omittedItems.reduce((sum, item) => {
    const amount = typeof item.amount === 'number' ? item.amount : (parseFloat(item.amount) || 0);
    if (item.includesOverheadProfit) {
      return sum;
    }
    return sum + amount;
  }, 0);
}

/**
 * Calculate contractor OHP
 */
export function calculateContractorOHP(formData, totalAdded, totalOmittedForOverhead) {
  const overheadProfitBase = totalAdded - totalOmittedForOverhead;

  if (formData.contractor_ohp_type === 'amount') {
    return parseFloat(formData.contractor_ohp_amount || 0);
  }
  return (overheadProfitBase * parseFloat(formData.contractor_ohp_percentage || 15)) / 100;
}

/**
 * Calculate consultant fees
 */
export function calculateConsultantFees(formData, totalVariationAmount, totalAdded) {
  const consultantFeesBase = formData.consultant_fee_on_total_added ? totalAdded : totalVariationAmount;

  if (formData.consultant_fees_type === 'amount') {
    return parseFloat(formData.consultant_fees_amount || 0);
  }
  return (consultantFeesBase * parseFloat(formData.consultant_fees_percentage || 4)) / 100;
}

/**
 * Calculate discount based on type with component selection
 */
export function calculateDiscountAdvanced(formData, totalVariationAmount, contractorOHP, consultantFees, totalAmountBeforeDiscount) {
  const discountAppliesToVariation = formData.discount_applies_to_variation !== undefined
    ? formData.discount_applies_to_variation
    : true;
  const discountAppliesToContractorOHP = formData.discount_applies_to_contractor_ohp !== undefined
    ? formData.discount_applies_to_contractor_ohp
    : true;
  const discountAppliesToConsultantFees = formData.discount_applies_to_consultant_fees !== undefined
    ? formData.discount_applies_to_consultant_fees
    : true;

  // Calculate discount base (sum of selected components only)
  let discountBase = 0;
  if (discountAppliesToVariation) {
    discountBase += totalVariationAmount;
  }
  if (discountAppliesToContractorOHP) {
    discountBase += contractorOHP;
  }
  if (discountAppliesToConsultantFees) {
    discountBase += consultantFees;
  }

  const hasSelectedComponents = discountAppliesToVariation || discountAppliesToContractorOHP || discountAppliesToConsultantFees;

  let discountAmount = 0;
  let effectiveDiscountRatio = 0;
  let discountPercentage = 0;
  let finalAmountAfterDiscount = totalAmountBeforeDiscount;

  // Calculate effective discount ratio based on discount type
  if (formData.discount_type === 'percentage' && hasSelectedComponents && discountBase > 0) {
    discountPercentage = parseFloat(formData.discount_percentage || 0);
    effectiveDiscountRatio = discountPercentage / 100;
    discountAmount = discountBase * effectiveDiscountRatio;
  } else if (formData.discount_type === 'amount' && hasSelectedComponents && discountBase > 0) {
    discountAmount = parseFloat(formData.discount_amount || 0) || 0;
    if (discountAmount > discountBase) {
      discountAmount = discountBase;
    }
    effectiveDiscountRatio = discountAmount / discountBase;
    discountPercentage = effectiveDiscountRatio * 100;
  } else if (formData.discount_type === 'final_amount' && hasSelectedComponents && discountBase > 0) {
    const targetFinalAmount = parseFloat(formData.final_amount_after_discount || totalAmountBeforeDiscount);
    let adjustedFinalAmount = targetFinalAmount;
    if (adjustedFinalAmount < 0) adjustedFinalAmount = 0;

    // Calculate final amount for non-selected components (no discount)
    const nonSelectedAmount =
      (discountAppliesToVariation ? 0 : totalVariationAmount) +
      (discountAppliesToContractorOHP ? 0 : contractorOHP) +
      (discountAppliesToConsultantFees ? 0 : consultantFees);

    // Remaining amount for selected components after discount
    const remainingForSelected = adjustedFinalAmount - nonSelectedAmount;

    // Ensure remaining amount is logical (>= 0 and <= discountBase)
    let adjustedRemainingForSelected = remainingForSelected;
    if (adjustedRemainingForSelected < 0) adjustedRemainingForSelected = 0;
    if (adjustedRemainingForSelected > discountBase) adjustedRemainingForSelected = discountBase;

    // Calculate discount amount
    discountAmount = discountBase - adjustedRemainingForSelected;

    // Calculate effective discount ratio
    if (discountBase > 0) {
      effectiveDiscountRatio = discountAmount / discountBase;
      discountPercentage = effectiveDiscountRatio * 100;
    } else {
      effectiveDiscountRatio = 0;
      discountPercentage = 0;
    }

    finalAmountAfterDiscount = adjustedFinalAmount;
  }

  // Apply effective discount ratio to selected components only
  let discountOnVariation = 0;
  let discountOnContractorOHP = 0;
  let discountOnConsultantFees = 0;

  let variationAmountAfterDiscount = totalVariationAmount;
  let contractorOHPAfterDiscount = contractorOHP;
  let consultantFeesAfterDiscount = consultantFees;

  if (hasSelectedComponents && discountBase > 0 && effectiveDiscountRatio >= 0 && !isNaN(effectiveDiscountRatio)) {
    // Calculate discount on each component (only if selected)
    if (discountAppliesToVariation) {
      discountOnVariation = round2(totalVariationAmount * effectiveDiscountRatio);
    }

    if (discountAppliesToContractorOHP) {
      discountOnContractorOHP = round2(contractorOHP * effectiveDiscountRatio);
    }

    if (discountAppliesToConsultantFees) {
      discountOnConsultantFees = round2(consultantFees * effectiveDiscountRatio);
    }

    // Ensure sum of partial discounts equals total discount (handle rounding differences)
    const sumOfPartialDiscounts = discountOnVariation + discountOnContractorOHP + discountOnConsultantFees;
    const roundingDifference = round2(discountAmount - sumOfPartialDiscounts);

    // Distribute rounding difference to largest discount component (from selected only)
    if (Math.abs(roundingDifference) > 0.01) {
      const selectedDiscounts = [];
      if (discountAppliesToVariation && discountOnVariation !== 0) {
        selectedDiscounts.push({ key: 'variation', value: discountOnVariation });
      }
      if (discountAppliesToContractorOHP && discountOnContractorOHP !== 0) {
        selectedDiscounts.push({ key: 'ohp', value: discountOnContractorOHP });
      }
      if (discountAppliesToConsultantFees && discountOnConsultantFees !== 0) {
        selectedDiscounts.push({ key: 'consultant', value: discountOnConsultantFees });
      }

      if (selectedDiscounts.length > 0) {
        const maxDiscount = selectedDiscounts.reduce((max, item) =>
          Math.abs(item.value) > Math.abs(max.value) ? item : max
        );

        if (maxDiscount.key === 'variation') {
          discountOnVariation = round2(discountOnVariation + roundingDifference);
        } else if (maxDiscount.key === 'ohp') {
          discountOnContractorOHP = round2(discountOnContractorOHP + roundingDifference);
        } else if (maxDiscount.key === 'consultant') {
          discountOnConsultantFees = round2(discountOnConsultantFees + roundingDifference);
        }
      }
    }

    // Calculate values after discount
    variationAmountAfterDiscount = round2(totalVariationAmount - discountOnVariation);
    contractorOHPAfterDiscount = round2(contractorOHP - discountOnContractorOHP);
    consultantFeesAfterDiscount = round2(consultantFees - discountOnConsultantFees);
  }

  // Calculate final amount after discount
  if (formData.discount_type === 'final_amount' && hasSelectedComponents && discountBase > 0) {
    // For final_amount type, use the calculated value from above
  } else {
    // For other types, calculate from sum of all components
    finalAmountAfterDiscount = round2(variationAmountAfterDiscount + contractorOHPAfterDiscount + consultantFeesAfterDiscount);
  }

  return {
    discountAmount,
    discountPercentage,
    discountOnVariation,
    discountOnContractorOHP,
    discountOnConsultantFees,
    variationAmountAfterDiscount,
    contractorOHPAfterDiscount,
    consultantFeesAfterDiscount,
    finalAmountAfterDiscount,
    discountAppliesToVariation,
    discountAppliesToContractorOHP,
    discountAppliesToConsultantFees,
    hasSelectedComponents
  };
}

/**
 * Calculate total of all custom fees
 */
export function calculateCustomFeesTotal(customFees) {
  if (!Array.isArray(customFees)) return 0;
  return round2(customFees.reduce((sum, fee) => sum + (parseFloat(fee.amount) || 0), 0));
}

/**
 * Calculate all variation financials with advanced discount logic
 */
export function calculateAllFinancials(formData, omittedItems, addedItems) {
  const totalOmitted = calculateItemsTotal(omittedItems);
  const totalAdded = calculateItemsTotal(addedItems);
  const totalVariationAmount = totalAdded - totalOmitted;

  const totalOmittedForOverhead = calculateOmittedTotalForOverhead(omittedItems);
  const contractorOHP = calculateContractorOHP(formData, totalAdded, totalOmittedForOverhead);
  const consultantFees = calculateConsultantFees(formData, totalVariationAmount, totalAdded);
  const customFeesTotal = calculateCustomFeesTotal(formData.custom_fees);

  const totalAmountBeforeDiscount = totalVariationAmount + contractorOHP + consultantFees + customFeesTotal;

  const discountResults = calculateDiscountAdvanced(
    formData,
    totalVariationAmount,
    contractorOHP,
    consultantFees,
    totalAmountBeforeDiscount
  );

  // Custom fees are not discounted — added on top of the discounted subtotal
  const totalAmount = round2(discountResults.finalAmountAfterDiscount + customFeesTotal);

  return {
    totalOmitted,
    totalAdded,
    totalVariationAmount,
    contractorOHP,
    consultantFees,
    customFeesTotal,
    totalAmountBeforeDiscount,
    totalAmount,
    ...discountResults
  };
}
