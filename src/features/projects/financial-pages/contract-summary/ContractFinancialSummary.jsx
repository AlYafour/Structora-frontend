import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import InfoTip from "../../../../components/common/InfoTip";
import { formatMoney } from "../../../../utils/formatters";
import { n, round } from "../../../../utils/formatters/number";
import { feeInclusive } from "../../../../utils/calculations/financial";
import { VAT_RATE, VAT_MULTIPLIER } from "../../../../utils/financialConstants";
import { useContractData } from "./hooks/useContractData";
import ContractAmountCards from "./ContractAmountCards";
import ContractBreakdownTables from "./ContractBreakdownTables";
import ContractVATTable from "./ContractVATTable";
import DirhamsIcon from "../../../../components/common/DirhamsIcon";
import "../../wizard/components/wizard.css";

/* ===== Row renderers (extracted from inline functions) ===== */
const RowAmount = (notes, A) => (label, value, noteKey, percent = null, isTotal = false, isPercentageRow = false) => (
  <tr key={label}>
    <td className="cfs-td">
      <div className="cfs-row-label">
        <span>{label}</span>
        {percent !== null && percent > 0 && (
          <span className="cfs-row-percent">({percent}%)</span>
        )}
        <InfoTip text={notes[noteKey]} />
      </div>
    </td>
    <td className={isTotal ? "cfs-td-total" : "cfs-td-value"}>
      {isPercentageRow ? (
        <span className="cfs-row-percent">
          {percent !== null && percent > 0 ? `${percent}%` : "0%"}
        </span>
      ) : (
        A(value)
      )}
    </td>
  </tr>
);

const RowVAT = (A, vatFn, incFn) => (label, amt, isTotal = false) => (
  <tr key={label}>
    <td className="cfs-td">{label}</td>
    <td className={isTotal ? "cfs-td-total" : "cfs-td-value"}>{A(amt)}</td>
    <td className={isTotal ? "cfs-td-total" : "cfs-td-value"}>{A(vatFn(amt))}</td>
    <td className={isTotal ? "cfs-td-total" : "cfs-td-value"}>{A(incFn(amt))}</td>
  </tr>
);

/* =================== Main =================== */
export default function ContractFinancialSummary({ projectId }) {
  const { t, i18n } = useTranslation();
  const { contract, variations, prolongationFees, loading, error } = useContractData(projectId, t);

  // All calculations are performed here safely - PRESERVED VERBATIM
  const computed = useMemo(() => {
    try {
      if (!contract) return { error: null, data: null };

      const c = contract;

      const totalVariationsAmount = variations.reduce((sum, v) => {
        const finalAmount = parseFloat(v.final_amount || 0);
        const consultantFees = parseFloat(v.consultant_fees || 0);
        const consultantFeesPercentage = parseFloat(v.consultant_fees_percentage || 0);
        const vat = parseFloat(v.vat || 0);
        const consultantFeesForVariation = consultantFeesPercentage > 0 ? consultantFees : 0;
        const variationTotal = finalAmount + consultantFeesForVariation + vat;
        return sum + variationTotal;
      }, 0);
      const totalProlongationFeesAmount = prolongationFees
        .filter((f) => (f.status || "active") === "active")
        .reduce((sum, f) => sum + n(f.net_amount || f.amount || 0), 0);
      const totalProlongationFeesVatAmount = prolongationFees
        .filter((f) => (f.status || "active") === "active")
        .reduce((sum, f) => sum + n(f.vat_amount || 0), 0);

      const grossTotal = n(c.total_project_value);
      const grossBank =
        c.contract_classification === "housing_loan_program" ? n(c.total_bank_value) : 0;

      const calculatedOwner = c.contract_classification === "housing_loan_program"
        ? Math.max(0, grossTotal - grossBank)
        : grossTotal;

      const savedOwner = n(c.total_owner_value);
      const grossOwner = (Math.abs(savedOwner - calculatedOwner) < 0.01) ? savedOwner : calculatedOwner;

      const ownerIncludes = c.owner_includes_consultant === true || c.owner_includes_consultant === "yes";
      const bankIncludes = c.bank_includes_consultant === true || c.bank_includes_consultant === "yes";

      const ownerPct = ownerIncludes
        ? n(c.owner_fee_design_percent) + n(c.owner_fee_supervision_percent) +
          (c.owner_fee_extra_mode === "percent" ? n(c.owner_fee_extra_value) : 0)
        : 0;

      const bankPct = bankIncludes
        ? n(c.bank_fee_design_percent) + n(c.bank_fee_supervision_percent) +
          (c.bank_fee_extra_mode === "percent" ? n(c.bank_fee_extra_value) : 0)
        : 0;

      let totalPct = 0;
      if (ownerPct > 0 && bankPct > 0 && Math.abs(ownerPct - bankPct) < 1e-6) {
        totalPct = ownerPct;
      } else if (ownerPct > 0 && bankPct > 0) {
        const totalFees = (grossOwner * ownerPct / (100 + ownerPct)) + (grossBank * bankPct / (100 + bankPct));
        const totalNet = grossTotal - totalFees;
        if (totalNet > 0) {
          totalPct = (totalFees / totalNet) * 100;
        }
      } else {
        totalPct = ownerPct || bankPct || 0;
      }

      const total = feeInclusive(grossTotal, totalPct);
      const bank = feeInclusive(grossBank, bankPct);
      const owner = feeInclusive(grossOwner, ownerPct);

      let ownerDesignFee = 0;
      let ownerSupervisionFee = 0;
      if (ownerIncludes && grossOwner > 0) {
        const designPct = n(c.owner_fee_design_percent);
        const supervisionPct = n(c.owner_fee_supervision_percent);
        const totalFeePct = designPct + supervisionPct;
        if (totalFeePct > 0 && owner.fee > 0) {
          ownerDesignFee = round(owner.fee * (designPct / totalFeePct));
          ownerSupervisionFee = round(owner.fee * (supervisionPct / totalFeePct));
        }
      }

      const ownerDesignPayTo = c.owner_fee_design_pay_to || "contractor";
      const ownerSupervisionPayTo = c.owner_fee_supervision_pay_to || "contractor";
      const ownerFeesExcludedFromPayable =
        (ownerDesignPayTo === "consultant" ? ownerDesignFee : 0) +
        (ownerSupervisionPayTo === "consultant" ? ownerSupervisionFee : 0);

      // Extra fees with VAT - Owner
      let ownerExtraFee = 0;
      let ownerExtraFeeWithVat = 0;
      if (ownerIncludes && c.owner_fee_extra_value && n(c.owner_fee_extra_value) > 0) {
        if (c.owner_fee_extra_mode === "percent") {
          ownerExtraFee = round(owner.net * (n(c.owner_fee_extra_value) / 100));
          ownerExtraFeeWithVat = round(ownerExtraFee * VAT_MULTIPLIER);
        } else {
          if (c.owner_fee_extra_includes_vat === "yes") {
            const totalAmount = n(c.owner_fee_extra_value);
            ownerExtraFeeWithVat = totalAmount;
            ownerExtraFee = round(totalAmount / VAT_MULTIPLIER);
          } else {
            ownerExtraFee = n(c.owner_fee_extra_value);
            ownerExtraFeeWithVat = round(ownerExtraFee * VAT_MULTIPLIER);
          }
        }
      }

      // Extra fees with VAT - Bank
      let bankExtraFee = 0;
      let bankExtraFeeWithVat = 0;
      if (bankIncludes && c.bank_fee_extra_value && n(c.bank_fee_extra_value) > 0) {
        if (c.bank_fee_extra_mode === "percent") {
          bankExtraFee = round(bank.net * (n(c.bank_fee_extra_value) / 100));
          bankExtraFeeWithVat = round(bankExtraFee * VAT_MULTIPLIER);
        } else {
          if (c.bank_fee_extra_includes_vat === "yes") {
            const totalAmount = n(c.bank_fee_extra_value);
            bankExtraFeeWithVat = totalAmount;
            bankExtraFee = round(totalAmount / VAT_MULTIPLIER);
          } else {
            bankExtraFee = n(c.bank_fee_extra_value);
            bankExtraFeeWithVat = round(bankExtraFee * VAT_MULTIPLIER);
          }
        }
      }

      const ownerFinal = {
        fee: owner.fee,
        net: owner.net - ownerExtraFeeWithVat,
        extraFee: ownerExtraFee,
        extraFeeWithVat: ownerExtraFeeWithVat,
        extraDescription: c.owner_fee_extra_description || ""
      };

      const bankFinal = {
        fee: bank.fee,
        net: bank.net - bankExtraFeeWithVat,
        extraFee: bankExtraFee,
        extraFeeWithVat: bankExtraFeeWithVat,
        extraDescription: c.bank_fee_extra_description || ""
      };

      const totalExtraFee = ownerExtraFee + bankExtraFee;
      const totalExtraFeeWithVat = ownerExtraFeeWithVat + bankExtraFeeWithVat;

      // Contract Value Without Consultant Fee
      // Deduct bank consultant fee always; also deduct owner consultant fees paid directly to consultant
      const actualContractorAmount = round(grossTotal - bank.fee - totalExtraFeeWithVat - ownerFeesExcludedFromPayable);

      const totalFinal = {
        fee: bank.fee,
        net: actualContractorAmount,
        extraFee: totalExtraFee,
        extraFeeWithVat: totalExtraFeeWithVat
      };
      const payableAmount = grossOwner - ownerFeesExcludedFromPayable + bankFinal.net + totalProlongationFeesAmount;

      // Display functions
      const formatAmountString = (v) => formatMoney(round(n(v)), { lang: i18n.language });
      const A = (v) => {
        const str = formatAmountString(v);
        if (i18n.language === "en") {
          const numPart = str.replace(/AED\s?/, "").trim();
          return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              {numPart} <DirhamsIcon size={10} color="#374151" />
            </span>
          );
        }
        return str;
      };
      const vatFn = (v) => round(n(v) * VAT_RATE);
      const incFn = (v) => round(n(v) + vatFn(v));

      return {
        error: null,
        data: {
          c, grossTotal, grossBank, grossOwner,
          ownerPct, bankPct, totalPct,
          total: totalFinal, bank: bankFinal, owner: ownerFinal,
          payableAmount, totalVariationsAmount, totalProlongationFeesAmount, totalProlongationFeesVatAmount, actualContractorAmount,
          A, vat: vatFn, inc: incFn,
        },
      };
    } catch (e) {
      return { error: e, data: null };
    }
  }, [contract, variations, prolongationFees, i18n.language]);

  // Loading / Error / Empty states
  if (loading) {
    return <div className="card ds-text-center cfs-loading">{t("contract_loading")}</div>;
  }

  if (error) {
    return (
      <div className="card alert error">
        <div className="fw-700 mb-12">{t("contract_load_error")}</div>
        <div className="pre-wrap mono cfs-error-box">
          {typeof error === "string" ? error : JSON.stringify(error, null, 2)}
        </div>
      </div>
    );
  }

  if (!contract) {
    return <div className="card ds-text-center cfs-no-data">{t("contract_no_data")}</div>;
  }

  if (computed.error) {
    return (
      <div className="card alert error">
        <div className="fw-700 mb-12">{t("contract_summary_error")}</div>
        <div className="pre-wrap mono cfs-error-box">
          {`Error: ${computed.error?.message || String(computed.error)}\n\nContract payload:\n` +
            JSON.stringify(contract, null, 2)}
        </div>
      </div>
    );
  }

  if (!computed.data) {
    return <div className="card ds-text-center cfs-no-data">{t("contract_insufficient_data")}</div>;
  }

  const { grossTotal, grossBank, grossOwner, ownerPct, bankPct, totalPct, total, bank, owner, payableAmount, totalProlongationFeesAmount, totalProlongationFeesVatAmount, actualContractorAmount, A, vat, inc } = computed.data;
  const isPrivateFunding = contract?.contract_classification === "private_funding";

  const notes = {
    total_contract: t("contract_note_total_contract"),
    fee_pct: t("contract_note_fee_pct"),
    fee_total: t("contract_note_fee_total"),
    net_total: t("contract_note_net_total"),
    total_extra_fee: t("contract_note_extra_fees"),
    bank_total: t("contract_note_bank_total"),
    bank_fee_pct: t("contract_note_bank_fee_pct"),
    bank_fee: t("contract_note_bank_fee"),
    bank_net: t("contract_note_bank_net"),
    bank_extra_fee: t("contract_note_extra_fees"),
    owner_total: t("contract_note_owner_total"),
    owner_fee_pct: t("contract_note_owner_fee_pct"),
    owner_fee: t("contract_note_owner_fee"),
    owner_net: t("contract_note_owner_net"),
    owner_extra_fee: t("contract_note_extra_fees"),
  };

  const rowAmount = RowAmount(notes, A);
  const rowVAT = RowVAT(A, vat, inc);

  return (
    <div className="card ds-overflow-x-auto">
      <ContractAmountCards
        grossTotal={grossTotal}
        actualContractorAmount={actualContractorAmount}
        payableAmount={payableAmount}
        prolongationFeesAmount={totalProlongationFeesAmount}
        prolongationFeesVatAmount={totalProlongationFeesVatAmount}
        isPrivateFunding={isPrivateFunding}
        A={A} vat={vat} inc={inc}
        t={t}
        RowAmount={rowAmount}
      />

      <ContractBreakdownTables
        grossTotal={grossTotal} grossBank={grossBank} grossOwner={grossOwner}
        ownerPct={ownerPct} bankPct={bankPct} totalPct={totalPct}
        total={total} bank={bank} owner={owner}
        actualContractorAmount={actualContractorAmount}
        prolongationFeesAmount={totalProlongationFeesAmount}
        isPrivateFunding={isPrivateFunding}
        t={t}
        RowAmount={rowAmount}
      />

      <ContractVATTable
        grossTotal={grossTotal} grossBank={grossBank} grossOwner={grossOwner}
        total={total} bank={bank} owner={owner}
        actualContractorAmount={actualContractorAmount}
        isPrivateFunding={isPrivateFunding}
        t={t}
        RowVAT={rowVAT}
      />
    </div>
  );
}
