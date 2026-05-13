/**
 * ContractAmountCards
 *
 * Displays the top 3 cards: Total Contract Amount, Actual Contract Amount, Payable Amount.
 * Extracted from ContractFinancialSummary.jsx (lines 428-536).
 */

export default function ContractAmountCards({ grossTotal, actualContractorAmount, payableAmount, prolongationFeesAmount = 0, isPrivateFunding, A, vat, inc, t, RowAmount }) {
  return (
    <div className={`cfs-tables-grid ${isPrivateFunding ? "cfs-tables-grid--2col" : "cfs-tables-grid--3col"}`}>
      {/* 1. Total contract amount (incl. VAT / excl. VAT / VAT) */}
      <div className="cfs-table-wrapper">
        <div className="cfs-section-title">
          {t("contract_total_contract_amount_with_vat")}
        </div>
        <table className="cfs-table cfs-table--flex">
          <thead>
            <tr>
              <th className="cfs-th ds-w-3-5">{t("contract_description")}</th>
              <th className="cfs-th ds-w-2-5">{t("contract_value_aed")}</th>
            </tr>
          </thead>
          <tbody>
            {RowAmount(t("contract_amount_excl_vat"), grossTotal, "total_contract_vat", null, false)}
            {RowAmount(t("contract_vat_5"), vat(grossTotal), "total_contract_vat")}
            {RowAmount(t("contract_total_incl_vat"), inc(grossTotal), "total_contract_vat", null, true)}
          </tbody>
        </table>
      </div>

      {/* 2. Actual contract amount */}
      <div className="cfs-table-wrapper">
        <div className="cfs-section-title">
          {t("contract_actual_contract_amount")}
        </div>
        <table className="cfs-table cfs-table--flex">
          <thead>
            <tr>
              <th className="cfs-th ds-w-3-5">{t("contract_description")}</th>
              <th className="cfs-th ds-w-2-5">{t("contract_value_aed")}</th>
            </tr>
          </thead>
          <tbody>
            {RowAmount(t("contract_total_actual_contractor"), actualContractorAmount, "actual_contract_vat", null, true)}
            {RowAmount(t("contract_vat_5"), vat(actualContractorAmount), "actual_contract_vat")}
            {RowAmount(t("contract_total_incl_vat"), inc(actualContractorAmount), "actual_contract_vat", null, true)}
          </tbody>
        </table>
      </div>

      {/* 3. Payable amount to contractor */}
      <div className="cfs-table-wrapper">
        <div className="cfs-section-title">
          {t("contract_payable_amount_contractor")}
        </div>
        <table className="cfs-table cfs-table--flex">
          <thead>
            <tr>
              <th className="cfs-th ds-w-3-5">{t("contract_description")}</th>
              <th className="cfs-th ds-w-2-5">{t("contract_value_aed")}</th>
            </tr>
          </thead>
          <tbody>
            {RowAmount(t("contract_amount_excl_vat"), payableAmount, "payable_contractor_vat", null, false)}
            {prolongationFeesAmount > 0 && RowAmount(t("prolongation_fees") || "Prolongation Fees", prolongationFeesAmount, "payable_contractor_vat")}
            {RowAmount(t("contract_vat_5"), vat(payableAmount), "payable_contractor_vat")}
            {RowAmount(t("contract_total_incl_vat"), inc(payableAmount), "payable_contractor_vat", null, true)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
