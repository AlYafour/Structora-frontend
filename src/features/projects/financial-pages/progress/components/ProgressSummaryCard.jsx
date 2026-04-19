import React from 'react';
import { formatPercent, formatMoney } from '../../../../../utils/formatters';
import { MetricCard, MetricGrid } from '../../../../../components/common/MetricCard';
// VatBreakdownPopover is used via MetricCard's vatBreakdown prop

function computeGap(totalInvoiced, totalPaidRegular) {
  if (totalInvoiced == null || totalPaidRegular == null) return null;
  return Number(totalInvoiced) - Number(totalPaidRegular);
}

function gapVariant(val) {
  if (val == null) return 'neutral';
  if (val > 0) return 'danger';
  if (val < 0) return 'warning';
  return 'success';
}


export default function ProgressSummaryCard({ projectData, isRTL, t }) {
  if (!projectData) return null;

  const fmtPct = (val) => formatPercent(val, { fallback: '-' });
  const amounts = projectData.progress_amounts;

  // Total project value — prefer net (excl VAT), fall back to legacy field
  const totalNet     = amounts ? (amounts.total_project_value ?? null)          : null;
  const totalVat     = amounts ? (amounts.total_project_value_vat ?? null)      : null;
  const totalWithVat = amounts ? (amounts.total_project_value_with_vat ?? null) : null;

  const projectValueSub = totalNet != null ? `${t('excluding_vat') || 'بدون ضريبة'}: ${formatMoney(totalNet)}` : null;
  const vatBreakdown = totalNet != null
    ? { net: totalNet, withVat: totalWithVat ?? totalNet * 1.05, format: formatMoney }
    : null;

  const totalInvoicedNet = amounts ? (amounts.total_invoiced_net != null ? amounts.total_invoiced_net : amounts.total_invoiced) : null;
  const totalPaidRegular = amounts ? amounts.total_paid_regular : null;
  const gap = computeGap(totalInvoicedNet, totalPaidRegular);

  const advanceAmount   = amounts ? amounts.advance_payment_amount : 0;
  const advanceRecovered = amounts ? amounts.advance_recovered : 0;
  const advanceRemaining = amounts ? amounts.advance_remaining : 0;
  const hasAdvance = advanceAmount > 0;

  const dueAmount = projectData.current_due_amount != null ? Number(projectData.current_due_amount) : null;

  return (
    <div className="psc">
      <h3 className="psc__title">{t('progress_buckets_overall')}</h3>

      <MetricGrid>
        <MetricCard variant="cyan" icon="eye" label={t('progress_actual_current')} tip={t('progress_tip_actual_current')}
          value={fmtPct(projectData.overall_actual_current)}
          sub={projectValueSub}
          vatBreakdown={vatBreakdown}
        />
        <MetricCard variant="blue" icon="gauge" label={t('progress_buckets_technical_current')} tip={t('progress_tip_technical_current')}
          value={fmtPct(projectData.overall_technical_current)}
          sub={projectValueSub}
          vatBreakdown={vatBreakdown}
        />
        <MetricCard variant="emerald" icon="check" label={t('progress_buckets_technical_approved')} tip={t('progress_tip_technical_approved')}
          value={fmtPct(projectData.overall_technical_approved)}
          vatBreakdown={amounts && amounts.total_invoiced != null
            ? { net: amounts.total_invoiced / 1.05, withVat: amounts.total_invoiced, format: formatMoney }
            : null}
        />
        <MetricCard variant="amber" icon="dollar" label={t('progress_buckets_financial')} tip={t('progress_tip_financial')}
          value={fmtPct(projectData.overall_financial)}
          vatBreakdown={amounts && amounts.total_paid_regular != null
            ? { net: amounts.total_paid_regular / 1.05, withVat: amounts.total_paid_regular, format: formatMoney }
            : null}
        />
        <MetricCard variant="violet" icon="file" label={t('progress_buckets_invoice_approved')} tip={t('progress_tip_invoice_approved')}
          value={fmtPct(projectData.overall_invoice_approved)}
          vatBreakdown={amounts && amounts.contractor_entitlement != null
            ? { net: amounts.contractor_entitlement / 1.05, withVat: amounts.contractor_entitlement, format: formatMoney }
            : null}
        />
        <MetricCard variant={gapVariant(gap)} icon="scale" label={t('progress_buckets_gap')} tip={t('progress_tip_gap')}
          value={gap != null ? formatMoney(Math.abs(gap)) : '-'}
          vatBreakdown={gap != null && gap !== 0
            ? { net: Math.abs(gap) / 1.05, withVat: Math.abs(gap), format: formatMoney }
            : null}
          sub={gap != null && gap === 0 ? t('progress_gap_balanced') : (gap != null ? (gap > 0 ? t('progress_gap_owed') : t('progress_gap_excess')) : null)}
        />
      </MetricGrid>

      {hasAdvance && (
        <MetricGrid sub>
          <MetricCard variant="slate" icon="wallet" label={t('progress_advance_payment')} tip={t('progress_tip_advance')}
            value={formatMoney(advanceAmount)}
            vatBreakdown={{ net: advanceAmount / 1.05, withVat: advanceAmount, format: formatMoney }}
          />
          <MetricCard
            variant={dueAmount > 0 ? 'danger' : dueAmount < 0 ? 'warning' : 'success'}
            icon="alert" label={t('progress_total_due')} tip={t('progress_tip_total_due')}
            value={dueAmount != null ? formatMoney(Math.abs(dueAmount)) : '-'}
            vatBreakdown={dueAmount != null && dueAmount !== 0
              ? { net: Math.abs(dueAmount) / 1.05, withVat: Math.abs(dueAmount), format: formatMoney }
              : null}
            sub={dueAmount != null && dueAmount !== 0 ? (dueAmount > 0 ? t('progress_gap_owed') : t('progress_gap_excess')) : null}
          />
        </MetricGrid>
      )}

      {!hasAdvance && dueAmount != null && dueAmount !== 0 && (
        <MetricGrid sub>
          <MetricCard
            variant={dueAmount > 0 ? 'danger' : 'warning'}
            icon="alert" label={t('progress_total_due')}
            value={formatMoney(Math.abs(dueAmount))}
            vatBreakdown={{ net: Math.abs(dueAmount) / 1.05, withVat: Math.abs(dueAmount), format: formatMoney }}
            sub={dueAmount > 0 ? t('progress_gap_owed') : t('progress_gap_excess')}
          />
        </MetricGrid>
      )}
    </div>
  );
}
