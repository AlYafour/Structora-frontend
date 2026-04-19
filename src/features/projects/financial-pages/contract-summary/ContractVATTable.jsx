/**
 * ContractVATTable
 *
 * Displays the full VAT breakdown table with 4 columns.
 * Extracted from ContractFinancialSummary.jsx (lines 708-739).
 */

export default function ContractVATTable({
  grossTotal, grossBank, grossOwner,
  total, bank, owner,
  actualContractorAmount,
  isPrivateFunding,
  t, RowVAT
}) {
  return (
    <div>
      <div className="cfs-section-title">
        {t("contract_vat_title")}
      </div>
      <table className="cfs-table">
        <thead>
          <tr>
            <th className="cfs-th ds-w-2-5">{t("contract_description")}</th>
            <th className="cfs-th ds-w-1-5">{t("contract_value_excl_vat")}</th>
            <th className="cfs-th ds-w-1-5">{t("contract_vat_5")}</th>
            <th className="cfs-th ds-w-1-5">{t("contract_total_incl_vat")}</th>
          </tr>
        </thead>
        <tbody>
          {!isPrivateFunding && RowVAT(t("contract_total_bank_financing"), grossBank)}
          {RowVAT(t("contract_total_owner_financing"), grossOwner)}
          {RowVAT(t("contract_total_contract_amount"), grossTotal, true)}
          {!isPrivateFunding && RowVAT(t("contract_consultant_fees_bank"), bank.fee)}
          {RowVAT(t("contract_consultant_fees_owner"), owner.fee)}
          {RowVAT(t("contract_total_consultant_fees"), total.fee, true)}
          {!isPrivateFunding && bank.extraFee > 0 && RowVAT(bank.extraDescription || t("contract_extra_fees"), bank.extraFee)}
          {owner.extraFee > 0 && RowVAT(owner.extraDescription || t("contract_extra_fees"), owner.extraFee)}
          {total.extraFee > 0 && RowVAT(t("contract_total_extra_fees"), total.extraFee, true)}
          {!isPrivateFunding && RowVAT(t("contract_contractor_from_bank"), bank.net)}
          {RowVAT(t("contract_contractor_from_owner"), owner.net)}
          {RowVAT(t("contract_total_actual_contractor"), actualContractorAmount, true)}
        </tbody>
      </table>
    </div>
  );
}
