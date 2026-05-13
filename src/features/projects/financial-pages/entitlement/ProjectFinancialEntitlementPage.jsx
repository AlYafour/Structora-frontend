import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageLayout from "../../../../components/layout/PageLayout";
import ViewPageHeader from "../../../../components/ui/ViewPageHeader";
import InfoTip from "../../../../components/common/InfoTip";
import DirhamsIcon from "../../../../components/common/DirhamsIcon";
import useProjectData from "../../../../hooks/useProjectData";
import useFinancialEntitlement from "./hooks/useFinancialEntitlement";
import { formatMoney } from "../../../../utils/formatters";
import { round } from "../../../../utils/formatters/number";
import { sumPaymentsByPayer } from "../../../../utils/helpers/payments";
import { VAT_RATE } from "../../../../utils/financialConstants";
import "./financial-entitlement.css";

export default function ProjectFinancialEntitlementPage() {
  const { projectId } = useParams();
  const { t, i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || "");
  const dir = isAR ? "rtl" : "ltr";
  const { contract, variations, prolongationFees, payments, loading: dataLoading } = useProjectData(projectId);

  const approvedVariations = variations?.filter(v => v.status === 'approved' || v.status === 'final_approved') || [];
  const totalVOFromVariations = approvedVariations.reduce((sum, v) => {
    const finalAmount = parseFloat(v.total_amount || v.net_amount || 0);
    return sum + finalAmount;
  }, 0);

  const ownerPaymentsFromData = sumPaymentsByPayer(payments, 'owner');
  const bankPaymentsFromData = sumPaymentsByPayer(payments, 'bank');

  const calculations = useFinancialEntitlement({
    contract,
    variations: variations || [],
    prolongationFees: prolongationFees || [],
    payments: payments || [],
    totalApprovedVOValue: totalVOFromVariations,
    consultantFeePercentage: 0,
    consultantFeeValue: 0,
    ownerPaymentsTotal: ownerPaymentsFromData,
    bankPaymentsTotal: bankPaymentsFromData,
    contractorDeferredAmount: 0,
    reportDate: new Date().toISOString().split('T')[0],
  });

  const formatAmountString = (value) => formatMoney(round(value || 0), { lang: i18n.language });
  const renderAmount = (value) => {
    const str = formatAmountString(value);
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

  if (dataLoading) {
    return (
      <PageLayout>
        <div className="container">
          <div className="card text-center ds-p-10">
            {t("loading")}
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!contract || calculations.error || !calculations.data) {
    return (
      <PageLayout>
        <div className="container">
          <div className="card alert error">
            <div className="fw-700 mb-12">
              {t("error_loading_data")}
            </div>
            {calculations.error && (
              <div className="text-muted">{calculations.error}</div>
            )}
          </div>
        </div>
      </PageLayout>
    );
  }

  const { data } = calculations;
  const { contractBaseline, voSummary, prolongationFeesSummary, rebuiltContract, entitlement, completionPercentages, balance, deferred, accountStatus, reference } = data;

  const vatRate = VAT_RATE;

  /** Render a financial table row */
  const Row = ({ label, amount, percentage, note, isTotal, isHighlight, custom, showVAT }) => {
    let amtExcl = amount, amtVAT = 0, amtIncl = amount;
    if (amount != null && showVAT) {
      amtExcl = round(amount);
      amtVAT = round(amount * vatRate);
      amtIncl = amtExcl + amtVAT;
    }

    const rowCls = [
      isTotal && "fe-row--total",
      isHighlight && "fe-row--highlight",
    ].filter(Boolean).join(" ");

    const val = custom != null ? custom :
      amount != null ? renderAmount(amount) :
      percentage != null ? `${round(percentage).toFixed(2)}%` : "—";

    return (
      <tr className={rowCls}>
        <td className="fe-td-label" dir={dir}>
          <div className="fe-label-wrap" dir={dir}>
            <span>{label}</span>
            {note && <InfoTip text={note} align={isAR ? "end" : "start"} />}
          </div>
        </td>
        {showVAT ? (
          <>
            <td className="fe-td-value">{amount != null ? renderAmount(amtExcl) : "—"}</td>
            <td className="fe-td-value">{amount != null ? renderAmount(amtVAT) : "—"}</td>
            <td className="fe-td-value">{amount != null ? renderAmount(amtIncl) : "—"}</td>
          </>
        ) : (
          <td className="fe-td-value">{val}</td>
        )}
      </tr>
    );
  };

  /** Render a section with numbered header */
  const Section = ({ num, title, children }) => (
    <div className="fe-section">
      <div className="fe-section__header" dir={dir}>
        <span className="fe-section__number">{num}</span>
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <PageLayout>
      <div className="container">
        <ViewPageHeader
          title={t("fe_page_title")}
          projectId={projectId}
        />

        <div className="fe-page">
          {/* 1 — Variation Orders Financial Summary */}
          <Section num={1} title={t("fe_vo_financial_summary")}>
            <table className="fe-table fe-table--vat" dir={dir}>
              <colgroup>
                <col className="fe-col-label" />
                <col className="fe-col-excl" />
                <col className="fe-col-vat" />
                <col className="fe-col-incl" />
              </colgroup>
              <thead>
                <tr>
                  <th>{t("fe_statement")}</th>
                  <th>{t("fe_amount_excl_vat")}</th>
                  <th>{t("fe_vat_5")}</th>
                  <th>{t("fe_amount_incl_vat")}</th>
                </tr>
              </thead>
              <tbody>
                <Row
                  label={t("fe_actual_vo_excl_fees")}
                  amount={voSummary.actualVOValueExcludingFees}
                  showVAT
                  note={t("fe_actual_vo_excl_fees_note")}
                />
                <Row
                  label={t("fe_consultant_fees_on_vo")}
                  amount={voSummary.consultantFeeOnVO}
                  showVAT
                  note={t("fe_consultant_fees_on_vo_note")}
                />
                {voSummary.totalFixedConsultantFees > 0 && (
                  <Row
                    label={t("fe_fixed_consultant_fees_on_vo")}
                    amount={voSummary.totalFixedConsultantFees}
                    showVAT
                    note={t("fe_fixed_consultant_fees_on_vo_note")}
                  />
                )}
                <Row
                  label={t("fe_total_vo_with_fees")}
                  amount={voSummary.totalVOWithFees}
                  showVAT
                  isHighlight
                  note={t("fe_total_vo_with_fees_note")}
                />
                <Row
                  label={t("prolongation_fees") || "Prolongation Fees"}
                  amount={prolongationFeesSummary?.totalNet || 0}
                  showVAT
                  isHighlight
                />
                <Row
                  label={t("fe_owner_actual_original")}
                  amount={rebuiltContract.ownerActualOriginal || contractBaseline.owner.net}
                  showVAT
                  note={t("fe_owner_actual_original_note")}
                />
                <Row
                  label={t("fe_owner_actual_after_vo")}
                  amount={rebuiltContract.ownerActualAfterVO}
                  showVAT
                  note={t("fe_owner_actual_after_vo_note")}
                />
                <Row
                  label={t("fe_owner_total_original")}
                  amount={rebuiltContract.ownerTotalOriginal || (contractBaseline.owner.net + contractBaseline.owner.fee)}
                  showVAT
                  note={t("fe_owner_total_original_note")}
                />
                <Row
                  label={t("fe_owner_total_after_vo")}
                  amount={rebuiltContract.ownerTotalAfterVO}
                  showVAT
                  note={t("fe_owner_total_after_vo_note")}
                />
                <Row
                  label={t("fe_bank_actual_original")}
                  amount={rebuiltContract.bankActualOriginal || contractBaseline.bank.net}
                  showVAT
                  note={t("fe_bank_actual_original_note")}
                />
                <Row
                  label={t("fe_bank_total_original")}
                  amount={rebuiltContract.bankTotalOriginal || (contractBaseline.bank.net + contractBaseline.bank.fee)}
                  showVAT
                  note={t("fe_bank_total_original_note")}
                />
                <Row
                  label={t("fe_total_actual_after_vo")}
                  amount={rebuiltContract.totalActualAfterVO}
                  showVAT
                  note={t("fe_total_actual_after_vo_note")}
                />
                <Row
                  label={t("fe_total_gross_after_vo")}
                  amount={rebuiltContract.totalGrossAfterVO}
                  showVAT
                  isTotal
                  note={t("fe_total_gross_after_vo_note")}
                />
              </tbody>
            </table>
          </Section>

          {/* 2+3 — Side by side */}
          <div className="fe-pair">
            {/* 2 — Financial Entitlement & Payments */}
            <Section num={2} title={t("fe_entitlement_payments")}>
              <table className="fe-table fe-table--2col" dir={dir}>
                <colgroup>
                  <col className="fe-col-label" />
                  <col className="fe-col-value" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t("fe_statement")}</th>
                    <th>{t("fe_amount_incl_vat")}</th>
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label={t("fe_final_payable")}
                    amount={entitlement.finalPayableAmount}
                    isTotal
                    note={t("fe_final_payable_note")}
                  />
                  <Row
                    label={t("fe_total_payments_made")}
                    amount={entitlement.totalPaymentsMade}
                    note={t("fe_total_payments_made_note")}
                  />
                  <Row
                    label={t("fe_owner_payments_to_date", { date: reference.reportDate })}
                    amount={entitlement.ownerPayments}
                    note={t("fe_owner_payments_to_date_note")}
                  />
                  <Row
                    label={t("fe_bank_payments_to_date", { date: reference.reportDate })}
                    amount={entitlement.bankPayments}
                    note={t("fe_bank_payments_to_date_note")}
                  />
                </tbody>
              </table>
            </Section>

            {/* 3 — Completion Percentages */}
            <Section num={3} title={t("fe_completion_percentages")}>
              <table className="fe-table fe-table--2col" dir={dir}>
                <colgroup>
                  <col className="fe-col-label" />
                  <col className="fe-col-value" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t("fe_statement")}</th>
                    <th>{t("fe_percentage")}</th>
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label={t("fe_owner_completion")}
                    percentage={completionPercentages.ownerCompletionPercentage}
                    note={t("fe_owner_completion_note")}
                  />
                  <Row
                    label={t("fe_bank_completion")}
                    percentage={completionPercentages.bankCompletionPercentage}
                    note={t("fe_bank_completion_note")}
                  />
                </tbody>
              </table>
            </Section>
          </div>

          {/* Deferred (conditional — rarely used) */}
          {deferred.deferredAmount > 0 && (
            <Section num="*" title={t("fe_deferred_title")}>
              <table className="fe-table fe-table--2col" dir={dir}>
                <colgroup>
                  <col className="fe-col-label" />
                  <col className="fe-col-value" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t("fe_statement")}</th>
                    <th>{t("fe_amount_percentage")}</th>
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label={t("fe_deferred_amount")}
                    amount={deferred.deferredAmount}
                    note={t("fe_deferred_amount_note")}
                  />
                  <Row
                    label={t("fe_net_payable_owner", { date: reference.reportDate })}
                    amount={deferred.netPayableToOwner}
                    note={t("fe_net_payable_owner_note")}
                  />
                  <Row
                    label={t("fe_net_payable_percentage", { date: reference.reportDate })}
                    percentage={deferred.netPayablePercentage}
                    note={t("fe_net_payable_percentage_note")}
                  />
                </tbody>
              </table>
            </Section>
          )}

          {/* 4+5 — Side by side */}
          <div className="fe-pair">
            {/* 4 — Outstanding Balance */}
            <Section num={4} title={t("fe_outstanding_balance")}>
              <table className="fe-table fe-table--2col" dir={dir}>
                <colgroup>
                  <col className="fe-col-label" />
                  <col className="fe-col-value" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t("fe_statement")}</th>
                    <th>{t("fe_amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label={t("fe_owner_outstanding")}
                    amount={balance.ownerOutstandingBalance || 0}
                    note={t("fe_owner_outstanding_note")}
                  />
                  <Row
                    label={t("fe_bank_outstanding")}
                    amount={balance.bankOutstandingBalance || 0}
                    note={t("fe_bank_outstanding_note")}
                  />
                  <Row
                    label={t("fe_total_outstanding")}
                    amount={balance.outstandingBalance}
                    isTotal
                    note={t("fe_total_outstanding_note")}
                  />
                </tbody>
              </table>
            </Section>

            {/* 5 — Final Account Status */}
            <Section num={5} title={t("fe_final_account")}>
              <table className="fe-table fe-table--2col" dir={dir}>
                <colgroup>
                  <col className="fe-col-label" />
                  <col className="fe-col-value" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t("fe_statement")}</th>
                    <th>{t("fe_amount_status")}</th>
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label={t("fe_total_payable_to_date")}
                    amount={accountStatus.totalPayableToDate}
                    note={t("fe_total_payable_to_date_note")}
                  />
                  <Row
                    label={t("fe_adjusted_total_payments")}
                    amount={accountStatus.adjustedTotalPayments}
                    note={t("fe_adjusted_total_payments_note")}
                  />
                  <Row
                    label={t("fe_payment_status")}
                    isTotal
                    note={t("fe_payment_status_note")}
                    custom={
                      <span className={`fe-status-badge fe-status-badge--${accountStatus.status}`}>
                        {accountStatus.status === "balanced" ? t("fe_status_balanced") :
                         accountStatus.status === "outstanding" ? t("fe_status_outstanding") :
                         t("fe_status_overpaid")}
                      </span>
                    }
                  />
                </tbody>
              </table>
            </Section>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
