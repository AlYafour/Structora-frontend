import { useMemo } from "react";
import { n, round } from "../../../../../utils/formatters/number";
import { computeContractSummary } from "../../../../../utils/calculations/financial";

/**
 * Hook for calculating all financial values
 * Matches the table:
 * Variation Orders – Financial Summary (Excel)
 */
export default function useFinancialEntitlement({
  contract,
  variations = [],
  prolongationFees = [],
  payments = [],
  totalApprovedVOValue = 0,
  consultantFeePercentage = 0,
  consultantFeeValue = 0,
  ownerPaymentsTotal = 0,
  bankPaymentsTotal = 0,
  contractorDeferredAmount = 0,
  reportDate = null,
}) {
  return useMemo(() => {
    try {
      if (!contract) {
        return { error: "No contract data", data: null };
      }

      /* ======================================================
         1. Contract Baseline (Original Contract)
      ====================================================== */
      const contractSummary = computeContractSummary(contract);
      if (!contractSummary) {
        return { error: "Invalid contract data", data: null };
      }

      const {
        grossTotal,
        grossBank,
        grossOwner,
        ownerPct,
        bankPct,
        total,
        bank,
        owner,
        ownerFeesExcludedFromPayable = 0,
      } = contractSummary;

      /* ======================================================
         2. Approved Variations Only
      ====================================================== */
      const approvedVariationsList = variations.filter((v) => {
        const status = v.status || v.workflow_status || "draft";
        return status === "approved" || status === "final_approved";
      });

      /* ======================================================
         3. Total Approved VO Value (Including Consultant Fees)
         Excel:
         Total Approved Variation Orders Value (Including Consultant Fees)
         Must equal the sum of total_amount from all variation orders (final_amount after discount)
         total_amount = variation_amount_after_discount + contractor_ohp_after_discount + consultant_fees_after_discount
      ====================================================== */
      // Use total_amount directly from variations (the final amount after discount)
      const totalVOWithFees = approvedVariationsList.reduce(
        (sum, v) => sum + n(v.total_amount || 0),
        0
      );

      /* ======================================================
         4. Consultant Fees on VO
         Excel:
         Total Consultant Fees on Variation Orders
         Must use consultant_fees_after_discount from noticeData
         Do not recalculate or use pre-discount values
      ====================================================== */
      const consultantFeeOnVO = approvedVariationsList.reduce((sum, v) => {
        // Attempt to extract noticeData from description
        let noticeData = {};
        if (v.description) {
          try {
            noticeData = JSON.parse(v.description);
          } catch (e) {
            // If parsing fails, use default values
          }
        }

        // Priority for the post-discount value from noticeData
        // Check for value existence (even if it's 0)
        const hasConsultantFeesAfterDiscount = Object.prototype.hasOwnProperty.call(noticeData, 'consultant_fees_after_discount');
        if (hasConsultantFeesAfterDiscount) {
          const consultantFeesAfterDiscount = n(noticeData.consultant_fees_after_discount || 0);
          return sum + consultantFeesAfterDiscount;
        }

        // Fallback: if not present, use total_amount - actualVOValue
        const totalAmount = n(v.total_amount || 0);
        if (totalAmount > 0) {
          // Calculate actualVOValue from the same variation
          let noticeDataForVO = {};
          if (v.description) {
            try {
              noticeDataForVO = JSON.parse(v.description);
            } catch { /* JSON parse fallback - expected for non-JSON descriptions */ }
          }
          
          const hasVariationAfterDiscount = Object.prototype.hasOwnProperty.call(noticeDataForVO, 'variation_amount_after_discount');
          const hasContractorOHPAfterDiscount = Object.prototype.hasOwnProperty.call(noticeDataForVO, 'contractor_ohp_after_discount');
          
          if (hasVariationAfterDiscount || hasContractorOHPAfterDiscount) {
            const variationAfterDiscount = n(noticeDataForVO.variation_amount_after_discount || 0);
            const contractorOHPAfterDiscount = n(noticeDataForVO.contractor_ohp_after_discount || 0);
            const actualVOValue = variationAfterDiscount + contractorOHPAfterDiscount;
            const calculatedFee = totalAmount - actualVOValue;
            // Even if the value is negative (in case of deductions), use it
            return sum + calculatedFee;
          }
        }

        // Final fallback: use legacy values (for backward compatibility)
        const savedFee = n(v.consultant_fees || 0);
        if (savedFee > 0) return sum + savedFee;
        
        return sum;
      }, 0);

      /* ======================================================
         5. Actual Approved VO Value (Execution + Contractor OHP)
         Excel:
         Actual Approved Variation Works Value (Excluding Consultant Fees)
         Correct calculation: totalVOWithFees - consultantFeeOnVO
         This ensures the value = total variations - consultant fees
      ====================================================== */
      const actualVOValueExcludingFees = totalVOWithFees - consultantFeeOnVO;

      const totalProlongationFees = prolongationFees
        .filter((f) => (f.status || "active") === "active")
        .reduce((sum, f) => sum + n(f.net_amount || f.amount || 0), 0);
      const totalProlongationFeesWithVAT = prolongationFees
        .filter((f) => (f.status || "active") === "active")
        .reduce((sum, f) => {
          const gross = f.gross_amount ?? null;
          return sum + n(gross != null ? gross : (n(f.net_amount || f.amount || 0) * (1 + 0.05)));
        }, 0);

      /* ======================================================
         6. Owner Share – Actual & Total
      ====================================================== */

      // Excel:
      // Actual Contract Amount – Owner’s Share (Original Contract)
      const ownerActualOriginal = owner.net;

      // Excel:
      // Actual Contract Amount – Owner’s Share (After Variations)
      // (Execution works only – NO consultant fees)
      const ownerActualAfterVO =
        owner.net + actualVOValueExcludingFees;

      // Excel:
      // Total Contract Amount – Owner's Share (Original Contract)
      // Exclude consultant fees (in owner's share) where Pay To = Consultant
      const ownerTotalOriginal =
        owner.net + owner.fee - ownerFeesExcludedFromPayable;

      // Excel:
      // Total Contract Amount – Owner’s Share (After Variations)
      const ownerTotalAfterVO =
        ownerActualAfterVO + owner.fee + consultantFeeOnVO;

      /* ======================================================
         7. Bank Share (Fixed – Not affected by VO)
      ====================================================== */

      // Excel:
      // Actual Contract Amount – Bank’s Share (Original Contract)
      const bankActualFixed = bank.net;

      // Excel:
      // Total Contract Amount – Bank’s Share (Original Contract)
      const bankTotalOriginal = bank.net + bank.fee;

      /* ======================================================
         8. Project Totals After Variations
      ====================================================== */

      // Excel:
      // Actual Contract Amount for the Project After Variations
      const totalActualAfterVO =
        owner.net +
        actualVOValueExcludingFees +
        bank.net;

      // Excel:
      // Total Contract Amount for the Project After Variations
      const totalGrossAfterVO =
        totalActualAfterVO +
        owner.fee +
        bank.fee +
        consultantFeeOnVO;

      /* ======================================================
         9. Final Contractor Payable Amount (VAT Included)
         Correct calculation as required:
         Final Contractor Payable Amount =
           (Total Approved Variation Orders Value (Including Consultant Fees) * (1 + VAT))
           + (Total Contract Amount – Owner's Share (Original Contract) * (1 + VAT))
           + (Actual Contract Amount – Bank's Share (Original Contract) * (1 + VAT))
         Note: Values are Excluding VAT; VAT must be added to each item before summing
      ====================================================== */
      const vatRate = 0.05;
      // Calculate final amount Including VAT by adding VAT to each item before summing
      const finalPayableAmount = round(
        (totalVOWithFees * (1 + vatRate)) +
        totalProlongationFeesWithVAT +
        (ownerTotalOriginal * (1 + vatRate)) +
        (bankActualFixed * (1 + vatRate))
      );
      // Calculate VAT from the total amount (for display)
      const vatAmount = round(finalPayableAmount * (vatRate / (1 + vatRate)));

      /* ======================================================
         10. Payments
      ====================================================== */
      let calculatedOwnerPayments = n(ownerPaymentsTotal);
      let calculatedBankPayments = n(bankPaymentsTotal);

      if (calculatedOwnerPayments === 0 && payments.length) {
        calculatedOwnerPayments = payments
          .filter((p) => p.payer === "owner")
          .reduce((sum, p) => sum + n(p.amount || 0), 0);
      }

      if (calculatedBankPayments === 0 && payments.length) {
        calculatedBankPayments = payments
          .filter((p) => p.payer === "bank")
          .reduce((sum, p) => sum + n(p.amount || 0), 0);
      }

      const totalPaymentsMade =
        calculatedOwnerPayments + calculatedBankPayments;

      /* ======================================================
         11. Obligations & Completion %
      ====================================================== */
      const ownerVAT = round(ownerActualAfterVO * vatRate);
      const bankVAT = round(bankActualFixed * vatRate);
      const prolongationFeesWithVAT = round(totalProlongationFeesWithVAT);

      const ownerObligation = ownerActualAfterVO + ownerVAT + prolongationFeesWithVAT;
      const bankObligation = bankActualFixed + bankVAT;

      const ownerCompletionPercentage =
        ownerObligation > 0
          ? (calculatedOwnerPayments / ownerObligation) * 100
          : 0;

      const bankCompletionPercentage =
        bankObligation > 0
          ? (calculatedBankPayments / bankObligation) * 100
          : 0;
      
      // Calculate ownerTotalAfterVO Including VAT (for Outstanding Balance calculation)
      const ownerTotalAfterVOWithVAT = round(ownerTotalAfterVO * (1 + vatRate));

      /* ======================================================
         12. Consultant Fee from Bank Share (Paid Directly to Consultant)
         Excel:
         CONSULTANT FEE BANK WILL PAY DIRECT TO CONSULTANT WITH VAT
         The bank pays consultant fees on its original share directly to the consultant
         This amount is deducted from contractor payable because the bank doesn't pay it to the contractor
         Calculation: consultant fees on bank's original share (grossBank) at bank consultant fee rate (bankPct)
         Must use grossBank (gross amount) not bank.net (after fee deduction)
      ====================================================== */
      // Consultant fees from bank's original share (on grossBank at bankPct rate)
      // If bank includes consultant fees (bankPct > 0), calculate consultant fees on bank's gross amount
      const consultantFeeFromBankShare = bankPct > 0 && grossBank > 0
        ? round(grossBank * (bankPct / (100 + bankPct)))
        : 0;

      // Add VAT to consultant fees from bank's share
      const consultantFeeFromBankShareWithVAT = round(consultantFeeFromBankShare * (1 + vatRate));

      // Contract Value Without Consultant Fee
      // Deduct bank consultant fee always; also deduct owner consultant fees paid directly to consultant
      const contractValueWithoutConsultantFee = round(grossTotal - consultantFeeFromBankShare - ownerFeesExcludedFromPayable);

      /* ======================================================
         13. Outstanding Balances
      ====================================================== */
      // Calculate Outstanding Balance = Final Payable - Total Payments
      // Note: Consultant Fee from Bank's Share is not deducted as this item was removed from UI
      const outstandingBalance =
        finalPayableAmount - totalPaymentsMade;

      // Calculate Outstanding Balance from Owner's Share using correct accounting formula:
      // Outstanding Balance from Owner's Share =
      //   Total Contract Amount – Owner's Share (After Variations) (Including VAT)
      //   + VAT only on Actual Contract Amount – Bank's Share (Original Contract)
      //   - Owner Payments Made up to report date
      const ownerOutstandingBalance =
        ownerTotalAfterVOWithVAT +
        prolongationFeesWithVAT +
        bankVAT -
        calculatedOwnerPayments;

      // Calculate Outstanding Balance from Bank's Share using correct accounting formula:
      // Outstanding Balance from Bank's Share =
      //   Actual Contract Amount – Bank's Share (Original Contract) (NO VAT)
      //   - Bank Payments Made up to report date
      const bankOutstandingBalance =
        bankActualFixed - calculatedBankPayments;

      /* ======================================================
         14. Deferred Funding
      ====================================================== */
      const deferredAmount = n(contractorDeferredAmount);

      const netPayableToOwner =
        ownerObligation -
        calculatedOwnerPayments -
        deferredAmount;

      const netPayablePercentage =
        ownerObligation > 0
          ? ((ownerObligation - deferredAmount) / ownerObligation) * 100
          : 0;

      /* ======================================================
         15. Account Status
      ====================================================== */
      const adjustedTotalPayments =
        totalPaymentsMade + deferredAmount;

      let accountStatus = "balanced";
      if (adjustedTotalPayments < finalPayableAmount) {
        accountStatus = "outstanding";
      } else if (totalPaymentsMade > finalPayableAmount) {
        accountStatus = "overpaid";
      }

      /* ======================================================
         16. Last Approved VO
      ====================================================== */
      const lastApprovedVO =
        [...approvedVariationsList].sort((a, b) => {
          const dA = a.approval_date || a.created_at || "";
          const dB = b.approval_date || b.created_at || "";
          return new Date(dB) - new Date(dA);
        })[0] || null;

      /* ======================================================
         FINAL RETURN
      ====================================================== */
      return {
        error: null,
        data: {
          contractBaseline: {
            grossTotal,
            grossBank,
            grossOwner,
            ownerPct,
            bankPct,
            total,
            bank,
            owner,
          },

          voSummary: {
            actualVOValueExcludingFees,
            consultantFeeOnVO,
            totalVOWithFees,
          },

          prolongationFeesSummary: {
            totalNet: totalProlongationFees,
            totalWithVat: prolongationFeesWithVAT,
          },

          rebuiltContract: {
            ownerActualOriginal,
            ownerActualAfterVO,
            ownerTotalOriginal,
            ownerTotalAfterVO,
            bankActualFixed,
            bankTotalOriginal,
            totalActualAfterVO,
            totalGrossAfterVO,
          },

          entitlement: {
            finalPayableAmount,
            vatAmount,
            ownerPayments: calculatedOwnerPayments,
            bankPayments: calculatedBankPayments,
            totalPaymentsMade,
          },

          completionPercentages: {
            ownerObligation,
            bankObligation,
            ownerCompletionPercentage,
            bankCompletionPercentage,
            // Invoice-specific obligations (correct totals for invoice page)
            // ownerInvoiceObligation = ownerTotalAfterVO × 1.05 + bankVAT
            // This is what the owner is truly liable to pay:
            //   - Their full share (incl consultant fees) × 1.05
            //   - Plus VAT on bank's net share (owner pays this VAT to the contractor)
            ownerInvoiceObligation: round(ownerTotalAfterVO * (1 + vatRate) + prolongationFeesWithVAT + bankVAT),
            // projectTotalInclVAT = total project value including VAT (the invoice denominator)
            projectTotalInclVAT: round((totalGrossAfterVO * (1 + vatRate)) + prolongationFeesWithVAT),
          },

          balance: {
            outstandingBalance,
            ownerOutstandingBalance,
            bankOutstandingBalance,
            consultantFeeFromBankShare,
            consultantFeeFromBankShareWithVAT,
            contractValueWithoutConsultantFee,
          },

          deferred: {
            deferredAmount,
            netPayableToOwner,
            netPayablePercentage,
          },

          accountStatus: {
            status: accountStatus,
            adjustedTotalPayments,
            totalPayableToDate: finalPayableAmount,
          },

          reference: {
            lastVONumber: lastApprovedVO?.variation_number || "—",
            reportDate:
              reportDate ||
              new Date().toISOString().split("T")[0],
          },
        },
      };
    } catch (error) {
      return { error: error.message, data: null };
    }
  }, [
    contract,
    variations,
    prolongationFees,
    payments,
    totalApprovedVOValue,
    consultantFeePercentage,
    consultantFeeValue,
    ownerPaymentsTotal,
    bankPaymentsTotal,
    contractorDeferredAmount,
    reportDate,
  ]);
}
