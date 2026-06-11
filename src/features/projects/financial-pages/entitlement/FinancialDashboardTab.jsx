import { memo, useMemo, useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
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
import { api } from "../../../../services/api";
import { getVariationTotalAmount } from "../../entries/variations/utils/variationAmount";
import "./FinancialDashboardPrint.css";

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
  const [printCompany, setPrintCompany] = useState(null);

  useEffect(() => {
    api.get("auth/tenant-settings/current/", { _skipAuthRedirect: true })
      .then((res) => {
        const d = res.data;
        const rawLogo = d.logo_url || d.company_logo || "";
        const cleanPath = rawLogo.split("?")[0];
        const logoUrl = cleanPath
          ? cleanPath.startsWith("http") ? cleanPath : `/media/${cleanPath}`
          : null;
        setPrintCompany({
          name: d.company_name || d.contractor_name || "",
          name_en: d.contractor_name_en || "",
          address: d.company_address || d.contractor_address || "",
          phone: d.company_phone || d.contractor_phone || "",
          logo: logoUrl,
        });
      })
      .catch(() => {});
  }, []);

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Financial Summary",
    pageStyle: `
      @page { size: A4 landscape; margin: 8mm; }
      html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
    `,
  });

  const printDate = new Date().toLocaleDateString("en-AE", { year: "numeric", month: "long", day: "numeric" });

  const printAmount = (value) => {
    const num = parseFloat(value) || 0;
    return `AED ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
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
    const totalVariationsValue = approvedVariations.reduce((sum, variation) => {
      const totalForVariation = parseFloat(getVariationTotalAmount(variation));
      return sum + (isNaN(totalForVariation) ? 0 : totalForVariation);
    }, 0);
    const activeProlongationFees = prolongationFees.filter(
      (f) => (f.status || "active") === "active"
    );
    const totalProlongationFeesValue = activeProlongationFees.reduce((sum, f) => {
      const feeValue = parseFloat(f.net_amount || f.amount || 0);
      return sum + (isNaN(feeValue) ? 0 : feeValue);
    }, 0);
    const totalProlongationFeesValueWithVAT = activeProlongationFees.reduce((sum, f) => {
      const fallbackNet = parseFloat(f.net_amount || f.amount || 0);
      const feeValue = f.gross_amount != null
        ? parseFloat(f.gross_amount)
        : fallbackNet * VAT_MULTIPLIER;
      return sum + (isNaN(feeValue) ? 0 : feeValue);
    }, 0);
    const hasOnlyNoVatProlongationFees = activeProlongationFees.length > 0
      && activeProlongationFees.every((f) => parseFloat(f.vat_rate || 0) === 0);

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

    const totalContractWithVariationsWithVAT =
      ((contractValueExcludingConsultantFees + totalVariationsValue) * VAT_MULTIPLIER) +
      totalProlongationFeesValueWithVAT;

    const totalPaymentsNet = totalPayments / VAT_MULTIPLIER;
    const totalPaymentsVAT = totalPayments - totalPaymentsNet;

    const remainingWithVAT = totalContractWithVariationsWithVAT - totalPayments;
    const remainingWithoutVAT = totalContractWithVariations - totalPaymentsNet;
    const isOverpaid = remainingWithVAT < -0.01;
    const remainingAmount = Math.abs(remainingWithVAT);
    const remainingAmountExcludingVAT = Math.abs(remainingWithoutVAT);

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
      totalProlongationFeesValueWithVAT,
      hasOnlyNoVatProlongationFees,
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
      remainingAmountExcludingVAT,
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
          {hasContract && (
            <button onClick={handlePrint} className="fin-print__download-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 17V3M6 11l6 6 6-6" /><path d="M4 21h16" />
              </svg>
              {t("download_pdf", "Download PDF")}
            </button>
          )}
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
              value={renderAmount(
                financialStats.hasOnlyNoVatProlongationFees
                  ? financialStats.totalProlongationFeesValue
                  : showVat
                    ? financialStats.totalProlongationFeesValueWithVAT
                    : financialStats.totalProlongationFeesValue
              )}
              sub={`${financialStats.activeProlongationFeesCount} ${t("active")} · ${financialStats.hasOnlyNoVatProlongationFees ? t("pf_no_vat", "No VAT") : vatLabel}`}
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
              value={renderAmount(showVat ? financialStats.remainingAmount : financialStats.remainingAmountExcludingVAT)}
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
                    <span className="financial-breakdown__vat-tag">
                      {financialStats.hasOnlyNoVatProlongationFees ? t("pf_no_vat", "No VAT") : vatLabel}
                    </span>
                  </span>
                  <span className="financial-breakdown__value financial-breakdown__value--highlight">
                    + {renderAmount(
                      financialStats.hasOnlyNoVatProlongationFees
                        ? financialStats.totalProlongationFeesValue
                        : showVat
                          ? financialStats.totalProlongationFeesValueWithVAT
                          : financialStats.totalProlongationFeesValue
                    )}
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
                    {financialStats.isOverpaid ? '+ ' : ''}{renderAmount(showVat ? financialStats.remainingAmount : financialStats.remainingAmountExcludingVAT)}
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
      {/* ── Hidden Print Section ── visible only when printing ── */}
      <div ref={printRef} className="fin-print-root">

        {/* Header */}
        <div className="fin-print__accent-bar" />
        <div className="fin-print__header">
          <div className="fin-print__company">
            {printCompany?.logo && (
              <img src={printCompany.logo} alt={printCompany.name} className="fin-print__company-logo"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            )}
            <div className="fin-print__company-body">
              <div className="fin-print__company-name">{printCompany?.name}</div>
              {printCompany?.name_en && <div className="fin-print__company-name-en">{printCompany.name_en}</div>}
              <div className="fin-print__company-details">
                {printCompany?.address && <span>{printCompany.address}</span>}
                {printCompany?.phone && <span dir="ltr">{printCompany.phone}</span>}
              </div>
            </div>
          </div>
          <div className="fin-print__title-panel">
            <div className="fin-print__title">{t("financial_summary", "Financial Summary")}</div>
            <div className="fin-print__print-date">{printDate}</div>
          </div>
        </div>

        {/* Summary split card */}
        <div style={{ display: 'flex', border: '1.5px solid #d8c9b3', borderRadius: '12px', overflow: 'hidden', minHeight: '130px', marginBottom: '10px' }}>
          {/* Left — dark panel */}
          <div style={{ flex: '0 0 42%', background: '#17202f', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '7pt', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t("total_with_variations")}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px' }}>
                <span style={{ fontSize: '26pt', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {printAmount(financialStats.totalContractWithVariations).replace('AED ', '')}
                </span>
                <span style={{ fontSize: '12pt', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>AED</span>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '2px 9px', fontSize: '6.5pt', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t("excluding_vat")}
                </span>
                <span style={{ fontSize: '7.5pt', color: 'rgba(255,255,255,0.4)' }}>
                  {financialStats.approvedVariationsCount} {t("approved").toLowerCase()} · {financialStats.activeProlongationFeesCount} {t("prolongation_fees").toLowerCase()}
                </span>
              </div>
            </div>
          </div>
          {/* Right — light panel */}
          <div style={{ flex: 1, background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '8pt', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {t("financial_completion")}
              </span>
              <span style={{ fontSize: '24pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>
                {financialStats.completionPercentage}%
              </span>
            </div>
            <div style={{ height: '10px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden', margin: '12px 0 14px' }}>
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ width: `${financialStats.completionPercentage}%`, background: '#10b981' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '28px' }}>
              {[
                { dot: '#10b981', label: t("total_payments"), value: printAmount(financialStats.totalPaymentsNet), sub: `${financialStats.paymentsCount} ${t("payments").toLowerCase()} · ${t("excluding_vat")}` },
                { dot: financialStats.isOverpaid ? '#10b981' : '#f59e0b', label: financialStats.isOverpaid ? t("surplus_amount") : t("remaining_amount"), value: printAmount(financialStats.remainingAmountExcludingVAT), sub: t("excluding_vat") },
                { dot: '#8b5cf6', label: t("total_variations"), value: `${financialStats.approvedVariationsCount}`, sub: printAmount(financialStats.totalVariationsValue) },
              ].map(({ dot, label, value, sub }) => (
                <div key={label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '6.5pt', fontWeight: 700, color: dot, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                    {label}
                  </div>
                  <div style={{ fontSize: '11pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '3px' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="fin-print__progress-wrap">
          <div className="fin-print__progress-header">
            <span className="fin-print__progress-label">{t("financial_completion")}</span>
            <span className="fin-print__progress-pct">{financialStats.completionPercentage}%</span>
          </div>
          <div className="fin-print__progress-track">
            <div className="fin-print__progress-fill" style={{ width: `${financialStats.completionPercentage}%` }} />
          </div>
          <div className="fin-print__progress-footer">
            <span>{t("paid")}: {printAmount(financialStats.totalPaymentsNet)}</span>
            <span>{t("total")}: {printAmount(financialStats.totalContractWithVariations)}</span>
          </div>
        </div>

        {/* Breakdown Tables */}
        <div className="fin-print__tables">

          {/* Contract Breakdown */}
          <div className="fin-print__table-block">
            <div className="fin-print__table-title">
              {t("contract_breakdown")}
            </div>
            <table className="fin-print__table">
              <thead>
                <tr>
                  <th>{t("item", "Item")}</th>
                  <th>{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {isHousingLoan && (
                  <>
                    <tr>
                      <td>{t("bank_share")}</td>
                      <td>{printAmount(financialStats.bankValue)}</td>
                    </tr>
                    <tr>
                      <td>{t("owner_share")}</td>
                      <td>{printAmount(financialStats.ownerValue)}</td>
                    </tr>
                    <tr className="fin-print__tr-sep"><td colSpan="2" /></tr>
                  </>
                )}
                <tr>
                  <td>{t("contract_value")} <span className="fin-print__tag">{t("excluding_vat")}</span></td>
                  <td>{printAmount(financialStats.contractValueExcludingConsultantFees)}</td>
                </tr>
                <tr>
                  <td>+ {t("approved_variations")} <span className="fin-print__tag">{financialStats.approvedVariationsCount} {t("items", "items")}</span></td>
                  <td className="fin-print__td-add">{printAmount(financialStats.totalVariationsValue)}</td>
                </tr>
                <tr>
                  <td>+ {t("prolongation_fees")} <span className="fin-print__tag">{financialStats.activeProlongationFeesCount} {t("active")}</span></td>
                  <td className="fin-print__td-add">{printAmount(financialStats.totalProlongationFeesValue)}</td>
                </tr>
                <tr className="fin-print__tr-sep"><td colSpan="2" /></tr>
                <tr className="fin-print__tr-subtotal">
                  <td>{t("total_with_variations")} <span className="fin-print__tag">{t("excluding_vat")}</span></td>
                  <td>{printAmount(financialStats.totalContractWithVariations)}</td>
                </tr>
                <tr className="fin-print__tr-grand">
                  <td>{t("total_with_variations")} <span className="fin-print__tag">{t("including_vat")}</span></td>
                  <td>{printAmount(financialStats.totalContractWithVariationsWithVAT)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payments Breakdown */}
          <div className="fin-print__table-block">
            <div className="fin-print__table-title">
              {t("payments_breakdown")}
            </div>
            <table className="fin-print__table">
              <thead>
                <tr>
                  <th>{t("item", "Item")}</th>
                  <th>{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {isHousingLoan && (
                  <>
                    <tr>
                      <td>{t("bank_payments")}</td>
                      <td>{printAmount(financialStats.bankPayments / 1.05)}</td>
                    </tr>
                    <tr>
                      <td>{t("owner_payments")}</td>
                      <td>{printAmount(financialStats.ownerPayments / 1.05)}</td>
                    </tr>
                    <tr className="fin-print__tr-sep"><td colSpan="2" /></tr>
                  </>
                )}
                <tr className="fin-print__tr-subtotal">
                  <td>{t("total_paid")} <span className="fin-print__tag">{t("excluding_vat")}</span></td>
                  <td className="fin-print__td-success">{printAmount(financialStats.totalPaymentsNet)}</td>
                </tr>
                <tr>
                  <td>{t("vat_amount", "VAT Amount")} <span className="fin-print__tag">5%</span></td>
                  <td>{printAmount(financialStats.totalPaymentsVAT)}</td>
                </tr>
                <tr className="fin-print__tr-grand">
                  <td>{t("total_paid")} <span className="fin-print__tag">{t("including_vat")}</span></td>
                  <td className="fin-print__td-success">{printAmount(financialStats.totalPayments)}</td>
                </tr>
                <tr className="fin-print__tr-sep"><td colSpan="2" /></tr>
                <tr className={financialStats.isOverpaid ? "fin-print__tr-overpaid" : "fin-print__tr-remaining"}>
                  <td>
                    {financialStats.isOverpaid ? t("surplus_amount") : t("remaining")}
                    <span className="fin-print__tag">{t("excluding_vat")}</span>
                  </td>
                  <td>{printAmount(financialStats.remainingAmountExcludingVAT)}</td>
                </tr>
                <tr className={financialStats.isOverpaid ? "fin-print__tr-overpaid" : "fin-print__tr-remaining"}>
                  <td>
                    {financialStats.isOverpaid ? t("surplus_amount") : t("remaining")}
                    <span className="fin-print__tag">{t("including_vat")}</span>
                  </td>
                  <td>{printAmount(financialStats.remainingAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* Footer */}
        <div className="fin-print__footer">
          <span className="fin-print__footer-company">{printCompany?.name}</span>
          <span className="fin-print__footer-center">CONFIDENTIAL — FOR INTERNAL USE ONLY</span>
          <span className="fin-print__footer-date">Generated {printDate}</span>
        </div>

      </div>
    </div>
  );
});

export default FinancialDashboardTab;
