/**
 * ContractBreakdownTables
 *
 * Displays the 3-column breakdown tables: Total / Bank / Owner shares.
 * Extracted from ContractFinancialSummary.jsx (lines 538-706).
 */

export default function ContractBreakdownTables({
  grossTotal, grossBank, grossOwner,
  ownerPct, bankPct, totalPct,
  total, bank, owner,
  actualContractorAmount,
  prolongationFeesAmount = 0,
  isPrivateFunding,
  t, RowAmount
}) {
  return (
    <div className={`cfs-tables-grid ${isPrivateFunding ? "cfs-tables-grid--2col" : "cfs-tables-grid--3col"}`}>
      {/* 1. Total contract amounts */}
      <div className="cfs-table-wrapper">
        <div className="cfs-section-title">
          {t("contract_total_title")}
        </div>
        <table className="cfs-table cfs-table--flex">
          <thead>
            <tr>
              <th className="cfs-th ds-w-3-5">{t("contract_description")}</th>
              <th className="cfs-th ds-w-2-5">{t("contract_value_excl_vat")}</th>
            </tr>
          </thead>
          <tbody>
            {RowAmount(t("contract_total_contract_amount"), grossTotal, "total_contract", null, true)}
            {RowAmount(t("contract_consultant_percentage"), 0, "fee_pct", total.fee > 0 ? totalPct : 0, false, true)}
            {RowAmount(t("contract_total_consultant_fees"), total.fee, "fee_total")}
            {total.extraFeeWithVat > 0 && (
              <>{RowAmount(t("contract_extra_fees"), total.extraFeeWithVat, "total_extra_fee")}</>
            )}
            {prolongationFeesAmount > 0 && (
              <>{RowAmount(t("prolongation_fees") || "Prolongation Fees", prolongationFeesAmount, "net_total")}</>
            )}
            {RowAmount(t("contract_total_actual_contractor"), actualContractorAmount, "net_total", null, true)}
          </tbody>
        </table>
      </div>

      {/* 2. Bank - hide when private funding */}
      {!isPrivateFunding && (
        <div className="cfs-table-wrapper">
          <div className="cfs-section-title">
            {t("contract_bank_share_title")}
          </div>
          <table className="cfs-table cfs-table--flex">
            <thead>
              <tr>
                <th className="cfs-th ds-w-3-5">{t("contract_description")}</th>
                <th className="cfs-th ds-w-2-5">{t("contract_value_aed")}</th>
              </tr>
            </thead>
            <tbody>
              {RowAmount(t("contract_total_bank_financing"), grossBank, "bank_total", null, true)}
              {RowAmount(t("contract_consultant_percentage"), 0, "bank_fee_pct", bank.fee > 0 ? bankPct : 0, false, true)}
              {RowAmount(t("contract_consultant_fees_bank"), bank.fee, "bank_fee")}
              {bank.extraFeeWithVat > 0 && (
                <>{RowAmount(bank.extraDescription || t("contract_extra_fees"), bank.extraFeeWithVat, "bank_extra_fee")}</>
              )}
              {RowAmount(t("contract_contractor_from_bank"), bank.net, "bank_net", null, true)}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Owner */}
      <div className="cfs-table-wrapper">
        <div className="cfs-section-title">
          {t("contract_owner_share_title")}
        </div>
        <table className="cfs-table cfs-table--flex">
          <thead>
            <tr>
              <th className="cfs-th ds-w-3-5">{t("contract_description")}</th>
              <th className="cfs-th ds-w-2-5">{t("contract_value_aed")}</th>
            </tr>
          </thead>
          <tbody>
            {RowAmount(t("contract_total_owner_financing"), grossOwner, "owner_total", null, true)}
            <tr className="cfs-table__spacer-row">
              <td colSpan="2"></td>
            </tr>
            {RowAmount(t("contract_consultant_percentage"), 0, "owner_fee_pct", owner.fee > 0 ? ownerPct : 0, false, true)}
            {RowAmount(t("contract_consultant_fees_owner"), owner.fee, "owner_fee")}
            {owner.extraFeeWithVat > 0 && (
              <>{RowAmount(owner.extraDescription || t("contract_extra_fees"), owner.extraFeeWithVat, "owner_extra_fee")}</>
            )}
            {RowAmount(t("contract_contractor_from_owner"), owner.net, "owner_net", null, true)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
