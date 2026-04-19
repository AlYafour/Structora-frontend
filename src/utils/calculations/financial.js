/**
 * Financial Calculation Utilities
 * Consolidated from: contractFinancial.js
 *
 * @module calculations/financial
 */

import { num, round } from '../formatters/number.js';

/**
 * Calculate inclusive fee (fee embedded in gross amount)
 * Formula: fee = gross * rate / (100 + rate)
 *
 * @param {string|number} gross - Gross amount (including fee)
 * @param {string|number} percent - Fee percentage
 * @returns {{fee: number, net: number}} Fee amount and net amount
 */
export const feeInclusive = (gross, percent) => {
  const g = num(gross, 0);
  const r = num(percent, 0);
  if (g <= 0 || r <= 0) return { fee: 0, net: g };
  const fee = round(g * (r / (100 + r)));
  return { fee, net: g - fee };
};

/**
 * Calculate amount including VAT
 * @param {string|number} amount - Base amount
 * @param {number} [rate=0.05] - VAT rate (default 5%)
 * @returns {number} Total amount including VAT
 */
export const withVatTotal = (amount, rate = 0.05) => {
  const base = num(amount, 0);
  const vat = round(base * rate);
  return base + vat;
};

/**
 * Compute complete contract financial summary
 * Same logic as ContractFinancialSummary but without UI
 *
 * @param {Object} contract - Contract object
 * @returns {Object|null} Financial summary or null if invalid
 */
export function computeContractSummary(contract) {
  if (!contract || typeof contract !== 'object') return null;

  const c = contract;

  const grossTotal = num(c.total_project_value, 0);
  if (grossTotal <= 0) {
    return null;
  }

  const grossBank =
    c.contract_classification === 'housing_loan_program' ? num(c.total_bank_value, 0) : 0;

  // Calculate owner share: for housing loan = difference, for private financing = total
  const calculatedOwner =
    c.contract_classification === 'housing_loan_program'
      ? Math.max(0, grossTotal - grossBank) // For housing loan: difference
      : grossTotal; // For private financing: full total

  // Use saved value if correct (equals calculated value), otherwise use calculated value
  const savedOwner = num(c.total_owner_value, 0);
  const grossOwner = Math.abs(savedOwner - calculatedOwner) < 0.01 ? savedOwner : calculatedOwner;

  const ownerIncludes =
    c.owner_includes_consultant === true || c.owner_includes_consultant === 'yes';

  const bankIncludes = c.bank_includes_consultant === true || c.bank_includes_consultant === 'yes';

  const ownerPct = ownerIncludes
    ? num(c.owner_fee_design_percent, 0) +
      num(c.owner_fee_supervision_percent, 0) +
      (c.owner_fee_extra_mode === 'percent' ? num(c.owner_fee_extra_value, 0) : 0)
    : 0;

  const bankPct = bankIncludes
    ? num(c.bank_fee_design_percent, 0) +
      num(c.bank_fee_supervision_percent, 0) +
      (c.bank_fee_extra_mode === 'percent' ? num(c.bank_fee_extra_value, 0) : 0)
    : 0;

  // Calculate totalPct for overall display only
  // If percentages are equal, use them, otherwise use weighted average
  let totalPct = 0;
  if (ownerPct > 0 && bankPct > 0 && Math.abs(ownerPct - bankPct) < 1e-6) {
    // Percentages are equal
    totalPct = ownerPct;
  } else if (ownerPct > 0 && bankPct > 0) {
    // Different percentages - calculate weighted average based on amounts
    const totalFees =
      (grossOwner * ownerPct) / (100 + ownerPct) + (grossBank * bankPct) / (100 + bankPct);
    const totalNet = grossTotal - totalFees;
    if (totalNet > 0) {
      totalPct = (totalFees / totalNet) * 100;
    }
  } else {
    // Only one has percentage
    totalPct = ownerPct || bankPct || 0;
  }

  // Break down fees from totals - each part uses its own percentage only
  const total = feeInclusive(grossTotal, totalPct);
  const bank = feeInclusive(grossBank, bankPct); // Use bankPct directly only
  const owner = feeInclusive(grossOwner, ownerPct); // Use ownerPct directly only

  // Calculate design and supervision fees separately (for owner only)
  // Use proportional distribution from total fee to avoid math error
  // (3/103 + 3/103 ≠ 6/106)
  // Must include extra fee in the denominator so each part gets its correct share
  let ownerDesignFee = 0;
  let ownerSupervisionFee = 0;
  if (ownerIncludes && grossOwner > 0) {
    const designPct = num(c.owner_fee_design_percent, 0);
    const supervisionPct = num(c.owner_fee_supervision_percent, 0);
    const extraPct = c.owner_fee_extra_mode === 'percent' ? num(c.owner_fee_extra_value, 0) : 0;
    const totalFeePct = designPct + supervisionPct + extraPct;
    if (totalFeePct > 0 && owner.fee > 0) {
      ownerDesignFee = round(owner.fee * (designPct / totalFeePct));
      ownerSupervisionFee = round(owner.fee * (supervisionPct / totalFeePct));
    }
  }

  /*
  عدّله وبعدها الاستحقاق المالي النهائي المفروض يطلع:
  ownerTotalOriginal = 943,396 + 56,604 - 56,604 = 943,396
  finalPayableAmount = (256,000 × 1.05) + (943,396 × 1.05) + (1,886,792 × 1.05)
                    = 268,800 + 990,566 + 1,981,132
                    = 3,240,498
  */

  // Calculate parts where Pay To = Consultant (excluded from contractor payables)
  const ownerDesignPayTo = c.owner_fee_design_pay_to || 'contractor';
  const ownerSupervisionPayTo = c.owner_fee_supervision_pay_to || 'contractor';
  const ownerFeesExcludedFromPayable =
    (ownerDesignPayTo === 'consultant' ? ownerDesignFee : 0) +
    (ownerSupervisionPayTo === 'consultant' ? ownerSupervisionFee : 0);

  return {
    contract: c,
    grossTotal,
    grossBank,
    grossOwner,
    ownerPct,
    bankPct,
    totalPct,
    total,
    bank,
    owner,
    ownerDesignFee,
    ownerSupervisionFee,
    ownerFeesExcludedFromPayable,
  };
}
