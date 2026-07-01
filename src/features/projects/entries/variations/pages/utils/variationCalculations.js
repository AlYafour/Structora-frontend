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
  return (overheadProfitBase * parseFloat(formData.contractor_ohp_percentage || 0)) / 100;
}

/**
 * Calculate consultant fees
 */
export function calculateConsultantFees(formData, totalVariationAmount, totalAdded) {
  const consultantFeesBase = formData.consultant_fee_on_total_added ? totalAdded : totalVariationAmount;

  if (formData.consultant_fees_type === 'amount') {
    return parseFloat(formData.consultant_fees_amount || 0);
  }
  return (consultantFeesBase * parseFloat(formData.consultant_fees_percentage || 0)) / 100;
}

/**
 * Calculate discount based on type with component selection.
 *
 * Works correctly when the net variation total is negative (omissions > additions).
 * discountAmount is always >= 0 and is distributed across selected components
 * proportionally by their absolute value, so every component's magnitude is
 * reduced (positive components decrease, negative components become more negative).
 */
export function calculateDiscountAdvanced(formData, totalVariationAmount, contractorOHP, consultantFees, totalAmountBeforeDiscount, customFeesTotal = 0) {
  const discountAppliesToVariation = formData.discount_applies_to_variation !== undefined
    ? formData.discount_applies_to_variation
    : true;
  const discountAppliesToContractorOHP = formData.discount_applies_to_contractor_ohp !== undefined
    ? formData.discount_applies_to_contractor_ohp
    : true;
  const discountAppliesToConsultantFees = formData.discount_applies_to_consultant_fees !== undefined
    ? formData.discount_applies_to_consultant_fees
    : true;

  const hasSelectedComponents = discountAppliesToVariation || discountAppliesToContractorOHP || discountAppliesToConsultantFees;

  // Signed sum of selected components (can be negative when omissions dominate)
  let discountBase = 0;
  if (discountAppliesToVariation) discountBase += totalVariationAmount;
  if (discountAppliesToContractorOHP) discountBase += contractorOHP;
  if (discountAppliesToConsultantFees) discountBase += consultantFees;

  // Maximum discount that can be applied (always non-negative)
  const absDiscountBase = Math.abs(discountBase);

  let discountAmount = 0;
  let discountPercentage = 0;

  if (formData.discount_type !== 'none' && hasSelectedComponents && absDiscountBase > 0) {
    if (formData.discount_type === 'percentage') {
      discountPercentage = parseFloat(formData.discount_percentage || 0);
      discountAmount = absDiscountBase * (discountPercentage / 100);
    } else if (formData.discount_type === 'amount') {
      discountAmount = parseFloat(formData.discount_amount || 0) || 0;
      if (discountAmount > absDiscountBase) discountAmount = absDiscountBase;
      discountPercentage = (discountAmount / absDiscountBase) * 100;
    } else if (formData.discount_type === 'final_amount') {
      const targetFinalAmount = parseFloat(formData.final_amount_after_discount);
      if (!isNaN(targetFinalAmount)) {
        // discountAmount = reduction needed to reach the user's target total
        discountAmount = totalAmountBeforeDiscount - targetFinalAmount;
        if (discountAmount < 0) discountAmount = 0;
        if (discountAmount > absDiscountBase) discountAmount = absDiscountBase;
        discountPercentage = (discountAmount / absDiscountBase) * 100;
      }
    }
  }

  // Distribute discountAmount proportionally across selected components by absolute value.
  // discountOnComponent is always >= 0:
  //   positive component → becomes smaller (normal discount)
  //   negative component → becomes more negative (larger credit)
  let discountOnVariation = 0;
  let discountOnContractorOHP = 0;
  let discountOnConsultantFees = 0;

  if (discountAmount > 0) {
    const totalAbsSelected =
      (discountAppliesToVariation ? Math.abs(totalVariationAmount) : 0) +
      (discountAppliesToContractorOHP ? Math.abs(contractorOHP) : 0) +
      (discountAppliesToConsultantFees ? Math.abs(consultantFees) : 0);

    if (totalAbsSelected > 0) {
      if (discountAppliesToVariation) {
        discountOnVariation = discountAmount * (Math.abs(totalVariationAmount) / totalAbsSelected);
      }
      if (discountAppliesToContractorOHP) {
        discountOnContractorOHP = discountAmount * (Math.abs(contractorOHP) / totalAbsSelected);
      }
      if (discountAppliesToConsultantFees) {
        discountOnConsultantFees = discountAmount * (Math.abs(consultantFees) / totalAbsSelected);
      }

      // Fix floating-point rounding: adjust largest share so sum == discountAmount exactly
      const roundingDiff = discountAmount - (discountOnVariation + discountOnContractorOHP + discountOnConsultantFees);
      if (Math.abs(roundingDiff) > 0.001) {
        if (discountOnVariation >= discountOnContractorOHP && discountOnVariation >= discountOnConsultantFees) {
          discountOnVariation += roundingDiff;
        } else if (discountOnContractorOHP >= discountOnConsultantFees) {
          discountOnContractorOHP += roundingDiff;
        } else {
          discountOnConsultantFees += roundingDiff;
        }
      }
    }
  }

  const variationAmountAfterDiscount = totalVariationAmount - discountOnVariation;
  const contractorOHPAfterDiscount = contractorOHP - discountOnContractorOHP;
  const consultantFeesAfterDiscount = consultantFees - discountOnConsultantFees;
  const finalAmountAfterDiscount = variationAmountAfterDiscount + contractorOHPAfterDiscount + consultantFeesAfterDiscount;

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
 * Resolve each custom fee to its computed amount.
 * Percentage fees are applied against totalVariationAmount.
 */
export function calculateCustomFeesWithAmounts(customFees, totalVariationAmount) {
  if (!Array.isArray(customFees)) return [];
  return customFees.map(fee => {
    const computedAmount = fee.type === 'percentage'
      ? (totalVariationAmount * parseFloat(fee.percentage || 0)) / 100
      : parseFloat(fee.amount) || 0;
    return { ...fee, computedAmount };
  });
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
  const customFeesWithAmounts = calculateCustomFeesWithAmounts(formData.custom_fees, totalVariationAmount);
  const customFeesTotal = customFeesWithAmounts.reduce((sum, f) => sum + f.computedAmount, 0);

  const totalAmountBeforeDiscount = totalVariationAmount + contractorOHP + consultantFees + customFeesTotal;

  const discountResults = calculateDiscountAdvanced(
    formData,
    totalVariationAmount,
    contractorOHP,
    consultantFees,
    totalAmountBeforeDiscount,
    customFeesTotal
  );

  // Custom fees are not discounted — added on top of the discounted subtotal
  const totalAmount = discountResults.finalAmountAfterDiscount + customFeesTotal;

  return {
    totalOmitted,
    totalAdded,
    totalVariationAmount,
    contractorOHP,
    consultantFees,
    customFeesWithAmounts,
    customFeesTotal,
    totalAmountBeforeDiscount,
    totalAmount,
    ...discountResults
  };
}
