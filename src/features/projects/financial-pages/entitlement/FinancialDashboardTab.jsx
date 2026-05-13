import { memo, useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DirhamsIcon from "../../../../components/common/DirhamsIcon";
import Button from "../../../../components/common/Button";
import { formatMoney } from "../../../../utils/formatters";
import { MetricCard, MetricGrid } from "../../../../components/common/MetricCard";
import useFinancialEntitlement from "./hooks/useFinancialEntitlement";
import { sumPaymentsByPayer } from "../../../../utils/helpers/payments";
import { advancePaymentApi } from "../../../../services/advancePayments";
import { VatAmount } from "../../../../components/common/VatBreakdownPopover";
import InfoTip from "../../../../components/common/InfoTip";

/**
 * Financial Dashboard Tab
 * Unified financial tab displaying a professional Dashboard
 */
const FinancialDashboardTab = memo(function FinancialDashboardTab({
  projectId,
  contract,
  variations = [],
  prolongationFees = [],
  payments = [],
}) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  const formatCurrency = (value) => formatMoney(value);

  const renderAmount = (value) => {
    const str = formatCurrency(value);
    if (isEnglish) {
      const numPart = str.replace(/د\.إ\s?/, '').trim();
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{numPart} <DirhamsIcon size={10} color="#374151" /></span>;
    }
    return str;
  };

  // Advance payment summary
  const [advanceSummary, setAdvanceSummary] = useState(null);
  const [showVat, setShowVat] = useState(false);
  useEffect(() => {
    if (projectId) {
      advancePaymentApi.getSummary(projectId)
        .then(data => setAdvanceSummary(data?.has_advance ? data : null))
        .catch(() => setAdvanceSummary(null));
    }
  }, [projectId]);

  // Use hook for precise financial calculations
  const ownerPaymentsFromData = sumPaymentsByPayer(payments, 'owner');
  const bankPaymentsFromData = sumPaymentsByPayer(payments, 'bank');

  const financialCalculations = useFinancialEntitlement({
    contract,
    variations: variations || [],
    prolongationFees: prolongationFees || [],
    payments: payments || [],
    totalApprovedVOValue: 0,
    consultantFeePercentage: 0,
    consultantFeeValue: 0,
    ownerPaymentsTotal: ownerPaymentsFromData,
    bankPaymentsTotal: bankPaymentsFromData,
    contractorDeferredAmount: 0,
    reportDate: null,
  });

  // Quick financial calculations
  const financialStats = useMemo(() => {
    const VAT_MULTIPLIER = 1.05;
    const contractValue = parseFloat(contract?.total_project_value) || 0;
    const bankValue = parseFloat(contract?.total_bank_value) || 0;
    const ownerValue = parseFloat(contract?.total_owner_value) || 0;

    const approvedVariations = variations.filter(
      (v) => v.status === "approved" || v.status === "final_approved"
    );
    const pendingVariations = variations.filter(
      (v) => v.status !== "approved" && v.status !== "final_approved" && v.status !== "rejected"
    );
    // Variation amounts are WITHOUT VAT (net)
    const totalVariationsValue = approvedVariations.reduce((sum, v) => {
      const totalForVariation = parseFloat(v.total_amount || v.final_amount || 0);
      return sum + (isNaN(totalForVariation) ? 0 : totalForVariation);
    }, 0);
    const activeProlongationFees = prolongationFees.filter(
      (f) => (f.status || "active") === "active"
    );
    const totalProlongationFeesValue = activeProlongationFees.reduce((sum, f) => {
      const feeValue = parseFloat(f.net_amount || f.amount || 0);
      return sum + (isNaN(feeValue) ? 0 : feeValue);
    }, 0);

    const ownerPayments = sumPaymentsByPayer(payments, 'owner');
    const bankPayments = sumPaymentsByPayer(payments, 'bank');
    const totalPayments = ownerPayments + bankPayments;

    // Resolve consultant-fee-excluded values before computing totals
    const hasFinancialData = financialCalculations?.data && !financialCalculations?.error;
    const contractValueExcludingConsultantFees = hasFinancialData
      ? (financialCalculations.data.balance?.contractValueWithoutConsultantFee ?? contractValue)
      : contractValue;
    const bankNetValue = hasFinancialData
      ? (financialCalculations.data.contractBaseline?.bank?.net || 0)
      : bankValue;

    // Contract + variations WITHOUT VAT — uses consultant-fee-excluded contract value
    const totalContractWithVariations =
      contractValueExcludingConsultantFees + totalVariationsValue + totalProlongationFeesValue;

    const totalContractWithVariationsWithVAT = totalContractWithVariations * VAT_MULTIPLIER;

    const totalPaymentsNet = totalPayments / VAT_MULTIPLIER;
    const totalPaymentsVAT = totalPayments - totalPaymentsNet;

    const netRemaining = totalContractWithVariationsWithVAT - totalPayments;
    const isOverpaid = netRemaining < -0.01;
    const remainingAmount = Math.abs(netRemaining);

    const finalPayableAmount = hasFinancialData
      ? (financialCalculations.data.entitlement?.finalPayableAmount || totalContractWithVariations)
      : totalContractWithVariations;

    const completionPercentage =
      totalContractWithVariationsWithVAT > 0
        ? Math.min(100, Math.round((totalPayments / totalContractWithVariationsWithVAT) * 100))
        : 0;

    return {
      contractValue,
      bankValue,
      ownerValue,
      bankNetValue,
      totalVariationsValue,
      totalProlongationFeesValue,
      activeProlongationFeesCount: activeProlongationFees.length,
      approvedVariationsCount: approvedVariations.length,
      pendingVariationsCount: pendingVariations.length,
      ownerPayments,
      bankPayments,
      totalPayments,
      totalPaymentsNet,
      totalPaymentsVAT,
      paymentsCount: payments.length,
      completionPercentage,
      remainingAmount,
      isOverpaid,
      totalContractWithVariations,
      totalContractWithVariationsWithVAT,
      finalPayableAmount,
      contractValueExcludingConsultantFees,
    };
  }, [contract, variations, prolongationFees, payments, financialCalculations]);

  const hasContract = !!contract;
  const isHousingLoan = contract?.contract_classification === "housing_loan_program";

  // VAT toggle helpers
  const v = (val) => showVat ? val * 1.05 : val;           // excl → incl when toggled
  const vg = (val) => showVat ? val : val / 1.05;           // incl → excl when toggled
  const vatLabel = showVat ? t("including_vat") : t("excluding_vat");

  return (
    <div className="prj-tab-panel">
      {/* Dashboard Header - Quick Actions */}
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          <Button
            as={Link}
            to={`/projects/${projectId}/summary`}
            variant="primary"
            size="md"
          >
            {t("contract_financial_summary")}
          </Button>
          <Button
            as={Link}
            to={`/projects/${projectId}/financial-entitlement`}
            variant="secondary"
            size="md"
          >
            {t("financial_entitlements")}
          </Button>
          <button
            onClick={() => setShowVat(s => !s)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: showVat ? '2px solid #3b82f6' : '1.5px solid #d1d5db',
              background: showVat ? '#eff6ff' : 'transparent',
              color: showVat ? '#1d4ed8' : '#6b7280',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            {showVat ? t("including_vat") : t("excluding_vat")}
          </button>
        </div>
      </div>

      {!hasContract ? (
        <div className="financial-dashboard__empty">
          <div className="financial-dashboard__empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <h3>{t("no_contract_data")}</h3>
          <p>{t("add_contract_first")}</p>
          <Button
            as={Link}
            to={`/projects/${projectId}/wizard?step=contract&mode=edit`}
            variant="primary"
          >
            {t("add_contract")}
          </Button>
        </div>
      ) : (
        <>
          {/* KPI Cards — Unified MetricCard */}
          <MetricGrid>
            <MetricCard
              variant="blue"
              icon="building"
              label={
                <span className="ds-flex ds-items-center ds-gap-1">
                  {t("total_contract_value")}
                  <InfoTip text={t("total_contract_value_tooltip")} />
                </span>
              }
              value={renderAmount(v(financialStats.contractValue))}
              sub={vatLabel}
            />
            {isHousingLoan && (
              <MetricCard
                variant="cyan"
                icon="building"
                label={
                  <span className="ds-flex ds-items-center ds-gap-1">
                    {t("total_contract_value_excluding_consultant_fees")}
                    <InfoTip text={t("total_contract_value_excluding_consultant_fees_tooltip")} />
                  </span>
                }
                value={renderAmount(v(financialStats.contractValueExcludingConsultantFees))}
                sub={vatLabel}
              />
            )}

            {isHousingLoan && (
              <MetricCard
                variant="slate"
                icon="building"
                label={
                  <span className="ds-flex ds-items-center ds-gap-1">
                    {t("bank_contract_net")}
                    <InfoTip text={t("bank_contract_net_tooltip")} />
                  </span>
                }
                value={renderAmount(v(financialStats.bankNetValue))}
                sub={vatLabel}
              />
            )}
            <MetricCard
              variant="violet"
              icon="layers"
              label={
                <span className="ds-flex ds-items-center ds-gap-1">
                  {t("total_variations")}
                  <InfoTip text={t("variation_amount_tooltip_card")} />
                </span>
              }
              value={renderAmount(v(financialStats.totalVariationsValue))}
              sub={`${financialStats.approvedVariationsCount} ${t("approved")} · ${vatLabel}`}
            />
            <MetricCard
              variant="slate"
              icon="wallet"
              label={t("prolongation_fees")}
              value={renderAmount(v(financialStats.totalProlongationFeesValue))}
              sub={`${financialStats.activeProlongationFeesCount} ${t("active")} · ${vatLabel}`}
            />
            <MetricCard
              variant="emerald"
              icon="dollar"
              label={
                <span className="ds-flex ds-items-center ds-gap-1">
                  {t("total_payments")}
                  <InfoTip text={t("total_payments_tooltip")} />
                </span>
              }
              value={renderAmount(vg(financialStats.totalPayments))}
              sub={showVat
                ? <>{vatLabel} · {t("vat_amount")}: {renderAmount(financialStats.totalPaymentsVAT)}</>
                : vatLabel
              }
            />
            <MetricCard
              variant={financialStats.isOverpaid ? "emerald" : "amber"}
              icon={financialStats.isOverpaid ? "arrowUp" : "clock"}
              label={
                <span className="ds-flex ds-items-center ds-gap-1">
                  {financialStats.isOverpaid ? t("surplus_amount") : t("remaining_amount")}
                  <InfoTip text={t("remaining_amount_tooltip")} />
                </span>
              }
              value={renderAmount(vg(financialStats.remainingAmount))}
              sub={financialStats.isOverpaid ? t("overpaid_note") : vatLabel}
            />
            {advanceSummary && (
              <MetricCard variant="slate" icon="wallet" label={t("advance_payment")}
                value={renderAmount(parseFloat(advanceSummary.totals.total_amount) || 0)}
                sub={<>{t("recovered")}: {renderAmount(parseFloat(advanceSummary.totals.total_recovered) || 0)} | {t("remaining")}: {renderAmount(parseFloat(advanceSummary.totals.total_remaining) || 0)}</>}
              />
            )}
          </MetricGrid>

          {/* Progress Bar */}
          <div className="financial-dashboard__progress">
            <div className="financial-progress__header">
              <span className="financial-progress__label">
                {t("financial_completion")}
              </span>
              <span className="financial-progress__percentage">
                {financialStats.completionPercentage}%
              </span>
            </div>
            <div className="financial-progress__bar">
              <div
                className="financial-progress__fill"
                style={{ width: `${financialStats.completionPercentage}%` }}
              />
            </div>
            <div className="financial-progress__footer">
              <span>
                {t("paid")}: {renderAmount(vg(financialStats.totalPayments))}
              </span>
              <span>
                {t("invoices_total_label")}:{" "}
                {renderAmount(showVat ? financialStats.totalContractWithVariationsWithVAT : financialStats.totalContractWithVariations)}
              </span>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="financial-dashboard__grid">
            {/* Contract Breakdown */}
            <div className="financial-dashboard__section">
              <h3 className="financial-section__title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                {t("contract_breakdown")}
              </h3>
              <div className="financial-breakdown">
                {isHousingLoan && (
                  <>
                    <div className="financial-breakdown__row">
                      <span className="financial-breakdown__label">
                        <span className="ds-flex ds-items-center ds-gap-1">
                          {t("bank_share")}
                          <span className="financial-breakdown__vat-tag">{vatLabel}</span>
                          <InfoTip text={t("bank_share_tooltip")} />
                        </span>
                      </span>
                      <span className="financial-breakdown__value">
                        {renderAmount(v(financialStats.bankValue))}
                      </span>
                    </div>

                    <div className="financial-breakdown__row">
                      <span className="financial-breakdown__label">
                        <span className="ds-flex ds-items-center ds-gap-1">
                          {t("owner_share")}
                          <span className="financial-breakdown__vat-tag">{vatLabel}</span>
                          <InfoTip text={t("owner_share_tooltip")} />
                        </span>
                      </span>
                      <span className="financial-breakdown__value">
                        {renderAmount(v(financialStats.ownerValue))}
                      </span>
                    </div>
                    <div className="financial-breakdown__divider" />
                  </>
                )}
                <div className="financial-breakdown__row financial-breakdown__row--total">
                  <span className="financial-breakdown__label">
                    {t("contract_value")}
                    <span className="financial-breakdown__vat-tag">{vatLabel}</span>
                    <InfoTip text={t("total_contract_value_excluding_consultant_fees_tooltip")} />
                  </span>
                  <span className="financial-breakdown__value">
                    {renderAmount(v(financialStats.contractValueExcludingConsultantFees))}
                  </span>
                </div>
                <div className="financial-breakdown__row">
                  <span className="financial-breakdown__label">
                    {t("approved_variations")}
                    <span className="financial-breakdown__vat-tag">{vatLabel}</span>
                    <InfoTip text={t("variation_amount_tooltip")} />
                  </span>
                  <span className="financial-breakdown__value financial-breakdown__value--highlight">
                    + {renderAmount(v(financialStats.totalVariationsValue))}
                  </span>
                </div>
                <div className="financial-breakdown__row">
                  <span className="financial-breakdown__label">
                    {t("prolongation_fees")}
                    <span className="financial-breakdown__vat-tag">{vatLabel}</span>
                  </span>
                  <span className="financial-breakdown__value financial-breakdown__value--highlight">
                    + {renderAmount(v(financialStats.totalProlongationFeesValue))}
                  </span>
                </div>
                <div className="financial-breakdown__divider" />
                <div className="financial-breakdown__row financial-breakdown__row--grand">
                  <span className="financial-breakdown__label">
                    {t("total_with_variations")}
                  </span>
                  <span className="financial-breakdown__value">
                    {renderAmount(showVat ? financialStats.totalContractWithVariationsWithVAT : financialStats.totalContractWithVariations)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payments Breakdown */}
            <div className="financial-dashboard__section">
              <h3 className="financial-section__title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                {t("payments_breakdown")}
              </h3>
              <div className="financial-breakdown">
                {isHousingLoan && (
                  <>
                    <div className="financial-breakdown__row">
                      <span className="financial-breakdown__label">
                        {t("bank_payments")}
                        <span className="financial-breakdown__vat-tag">{vatLabel}</span>
                        <InfoTip text={t("bank_payments_tooltip")} />
                      </span>
                      <span className="financial-breakdown__value">
                        {renderAmount(vg(financialStats.bankPayments))}
                      </span>
                    </div>

                    <div className="financial-breakdown__row">
                      <span className="financial-breakdown__label">
                        {t("owner_payments")}
                        <span className="financial-breakdown__vat-tag">{vatLabel}</span>
                        <InfoTip text={t("owner_payments_tooltip")} />
                      </span>
                      <span className="financial-breakdown__value">
                        {renderAmount(vg(financialStats.ownerPayments))}
                      </span>
                    </div>
                    <div className="financial-breakdown__divider" />
                  </>
                )}
                <div className="financial-breakdown__row financial-breakdown__row--total">
                  <span className="financial-breakdown__label">
                    {t("total_paid")}
                    <span className="financial-breakdown__vat-tag">{vatLabel}</span>
                  </span>
                  <span className="financial-breakdown__value financial-breakdown__value--success">
                    {renderAmount(vg(financialStats.totalPayments))}
                  </span>
                </div>
                {showVat && (
                  <div className="financial-breakdown__row">
                    <span className="financial-breakdown__label" style={{ fontSize: '0.85em', opacity: 0.75 }}>
                      {t("vat_included_in_payments")}
                    </span>
                    <span className="financial-breakdown__value" style={{ fontSize: '0.85em', opacity: 0.75 }}>
                      {renderAmount(financialStats.totalPaymentsVAT)}
                    </span>
                  </div>
                )}
                <div className="financial-breakdown__divider" />
                <div className="financial-breakdown__row">
                  <span className="financial-breakdown__label" style={financialStats.isOverpaid ? { color: 'var(--color-emerald, #10b981)', fontWeight: 600 } : {}}>
                    {financialStats.isOverpaid ? t("surplus_amount") : t("remaining")}
                    <span className="financial-breakdown__vat-tag">{vatLabel}</span>
                  </span>
                  <span className={`financial-breakdown__value ${financialStats.isOverpaid ? 'financial-breakdown__value--success' : 'financial-breakdown__value--warning'}`}>
                    {financialStats.isOverpaid ? '+ ' : ''}{renderAmount(vg(financialStats.remainingAmount))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Variations Alert */}
          {financialStats.pendingVariationsCount > 0 && (
            <div className="financial-dashboard__alert">
              <Button
                as={Link}
                to={`/projects/${projectId}?tab=variations`}
                variant="outline"
                size="sm"
              >
                {t("pending_variations")} ({financialStats.pendingVariationsCount})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default FinancialDashboardTab;
