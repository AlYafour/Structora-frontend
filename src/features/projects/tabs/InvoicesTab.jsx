import { useState, useEffect, memo, useMemo, Fragment } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../contexts/NotificationContext";
import { api } from "../../../services/api";
import { projectApi } from "../../../services";
import { handleError } from "../../../utils/errorHandler";
import Button from "../../../components/common/Button";
import ActionMenu from "../../../components/common/ActionMenu";
import Dialog from "../../../components/common/Dialog";
import { formatMoney, formatDate } from "../../../utils/formatters";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import { VatAmount } from "../../../components/common/VatBreakdownPopover";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

const InvoicesTab = memo(function InvoicesTab({ projectId, invoices, onReload }) {
 const { t, i18n } = useTranslation();
 const { success, error: showError } = useNotifications();
 const navigate = useTenantNavigate();

 // Void state
 const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
 const [voidingInvoiceId, setVoidingInvoiceId] = useState(null);
 const [voidReason, setVoidReason] = useState("");
 const [voidLoading, setVoidLoading] = useState(false);
 const [showVoided, setShowVoided] = useState(false);
 const [allInvoices, setAllInvoices] = useState(null);
 const [expandedRows, setExpandedRows] = useState({});

 const toggleExpand = (invoiceId) => {
  setExpandedRows(prev => ({ ...prev, [invoiceId]: !prev[invoiceId] }));
 };

 // Fetch all invoices (including voided) when toggle is on
 useEffect(() => {
  if (showVoided && projectId) {
   api.get(`projects/${projectId}/actual-invoices/?include_voided=true`)
    .then(res => {
     const data = res.data;
     setAllInvoices(Array.isArray(data) ? data : (data?.results || []));
    })
    .catch(() => setAllInvoices([]));
  } else {
   setAllInvoices(null);
  }
 }, [showVoided, projectId]);

 // Use allInvoices (with voided) when toggle is on, otherwise use parent's invoices (active only)
 const effectiveInvoices = showVoided && allInvoices ? allInvoices : (invoices || []);

 // Active invoices only (for statistics)
 const activeInvoices = useMemo(() =>
  effectiveInvoices.filter(inv => inv.status !== 'voided'),
  [effectiveInvoices]
 );

 // Displayed invoices (filter voided based on toggle)
 const displayedInvoices = useMemo(() =>
  showVoided ? effectiveInvoices : activeInvoices,
  [effectiveInvoices, activeInvoices, showVoided]
 );

 // Calculate statistics (active only) — including advance deduction
 const stats = useMemo(() => {
 if (activeInvoices.length === 0) {
 return { total: 0, totalNet: 0, paid: 0, remaining: 0, count: 0, fullyPaid: 0, partiallyPaid: 0, unpaid: 0, advanceDeduction: 0, netDue: 0 };
 }

 let total = 0;
 let totalNet = 0;
 let paid = 0;
 let totalRemaining = 0;
 let fullyPaid = 0;
 let partiallyPaid = 0;
 let unpaid = 0;
 let advanceDeduction = 0;

 activeInvoices.forEach((inv) => {
 const amount = parseFloat(inv.amount) || 0;
 const netAmount = parseFloat(inv.net_amount) || (amount / 1.05);
 const paidAmount = parseFloat(inv.paid_amount) || 0;
 const remainingAmount = inv.remaining_amount != null ? parseFloat(inv.remaining_amount) : amount;
 const deduction = parseFloat(inv.advance_deduction_amount) || 0;

 total += amount;
 totalNet += netAmount;
 paid += paidAmount;
 totalRemaining += remainingAmount;
 advanceDeduction += deduction;

 if (remainingAmount <= 0.01) {
 fullyPaid++;
 } else if (paidAmount > 0.01) {
 partiallyPaid++;
 } else {
 unpaid++;
 }
 });

 const netDue = total - advanceDeduction;

 return { total, totalNet, paid, remaining: totalRemaining, count: activeInvoices.length, fullyPaid, partiallyPaid, unpaid, advanceDeduction, netDue };
 }, [activeInvoices]);

 // Function to determine invoice status
 const getInvoiceStatus = (invoice) => {
 if (invoice.status === 'voided') {
 return { label: t("voided"), color: "muted", icon: "⊘" };
 }
 const totalAmount = parseFloat(invoice.amount) || 0;
 const paidAmount = parseFloat(invoice.paid_amount) || 0;
 const remainingAmount = invoice.remaining_amount != null ? parseFloat(invoice.remaining_amount) : totalAmount;

 if (remainingAmount <= 0.01) {
 return { label: t("fully_paid"), color: "success", icon: "✓" };
 } else if (paidAmount > 0.01) {
 return { label: t("partially_paid"), color: "warning", icon: "◐" };
 } else {
 return { label: t("unpaid"), color: "danger", icon: "○" };
 }
 };

 const reloadAllInvoices = () => {
  if (showVoided && projectId) {
   api.get(`projects/${projectId}/actual-invoices/?include_voided=true`)
    .then(res => {
     const data = res.data;
     setAllInvoices(Array.isArray(data) ? data : (data?.results || []));
    })
    .catch(() => setAllInvoices([]));
  }
 };

 const handleVoidInvoice = async () => {
 if (!voidingInvoiceId) return;
 setVoidLoading(true);
 try {
  await projectApi.voidInvoice(projectId, voidingInvoiceId, voidReason);
  success(t("void_success"));
  onReload();
  reloadAllInvoices();
 } catch (error) {
  const apiDetail = error?.response?.data?.detail;
  if (apiDetail) {
   const msg = Array.isArray(apiDetail) ? apiDetail.join('\n') : apiDetail;
   showError(msg);
  } else {
   const handledError = handleError(error, 'InvoicesTab.handleVoidInvoice');
   showError(handledError.message || t("void_error"));
  }
 } finally {
  setVoidConfirmOpen(false);
  setVoidingInvoiceId(null);
  setVoidReason("");
  setVoidLoading(false);
 }
 };

 // Count total columns for expand row colspan
 const totalColumns = 10; // # + expand + invoice_number + payer + date + amount + paid + remaining + status + action

 return (
 <div className="prj-tab-panel">
 <div className="prj-tab-header">
 <div className="prj-tab-actions">
 <Button as={Link} to={`/invoices/create?project=${projectId}`} variant="primary" size="md">
 {t("add_invoice")}
 </Button>
 <Button variant="outline" size="md" onClick={() => setShowVoided(!showVoided)}>
  {showVoided ? t("hide_voided") : t("show_voided")}
 </Button>
 </div>
 </div>

 {displayedInvoices.length > 0 ? (
 <>
 {/* Statistics (active only) */}
 <MetricGrid columns={stats.advanceDeduction > 0 ? 5 : 4}>
 <MetricCard variant="blue" icon="hash" label={t("invoices_count")} value={stats.count} />
 <MetricCard variant="emerald" icon="dollar" label={t("total_amount")}
  value={formatMoney(stats.total)}
  vatBreakdown={{ net: stats.totalNet, withVat: stats.total, format: formatMoney }}
 />
 {stats.advanceDeduction > 0 && (
 <MetricCard variant="amber" icon="minus" label={t("advance_deduction_total")} value={formatMoney(stats.advanceDeduction)} />
 )}
 <MetricCard variant="emerald" icon="check" label={t("paid_amount")} value={formatMoney(stats.paid)} />
 <MetricCard variant="amber" icon="alert" label={t("remaining_amount")} value={formatMoney(stats.remaining)} />
 </MetricGrid>

 {/* Math flow bar — shows calculation breakdown when advance deduction exists */}
 {stats.advanceDeduction > 0 && (
 <div className="invoices-math-flow">
  <span className="invoices-math-flow__item">
   <span className="invoices-math-flow__label">{t("invoices_total_label")}:</span>
   <span className="invoices-math-flow__value">{formatMoney(stats.total)}</span>
  </span>
  <span className="invoices-math-flow__op">{t("minus_sign")}</span>
  <span className="invoices-math-flow__item">
   <span className="invoices-math-flow__label">{t("advance_deduction_total")}:</span>
   <span className="invoices-math-flow__value invoices-math-flow__value--warning">{formatMoney(stats.advanceDeduction)}</span>
  </span>
  <span className="invoices-math-flow__op">{t("equals_sign")}</span>
  <span className="invoices-math-flow__item">
   <span className="invoices-math-flow__label">{t("net_due_label")}:</span>
   <span className="invoices-math-flow__value">{formatMoney(stats.netDue)}</span>
  </span>
  <span className="invoices-math-flow__op">{t("minus_sign")}</span>
  <span className="invoices-math-flow__item">
   <span className="invoices-math-flow__label">{t("paid_label")}:</span>
   <span className="invoices-math-flow__value invoices-math-flow__value--success">{formatMoney(stats.paid)}</span>
  </span>
  <span className="invoices-math-flow__op">{t("equals_sign")}</span>
  <span className="invoices-math-flow__item">
   <span className="invoices-math-flow__label">{t("remaining_label")}:</span>
   <span className="invoices-math-flow__value">{formatMoney(stats.remaining)}</span>
  </span>
 </div>
 )}

 {/* Invoice status badges */}
 <div className="invoices-status-summary">
 <span className="prj-badge prj-badge--success">
 ✓ {t("fully_paid")}: {stats.fullyPaid}
 </span>
 <span className="prj-badge prj-badge--warning">
 ◐ {t("partially_paid")}: {stats.partiallyPaid}
 </span>
 <span className="prj-badge prj-badge--danger">
 ○ {t("unpaid")}: {stats.unpaid}
 </span>
 </div>

 {/* Invoice table */}
 <div className="prj-table__wrapper">
 <table className="prj-table">
 <thead>
 <tr>
 <th style={{ width: '36px' }}></th>
 <th className="ds-text-center ds-w-60">#</th>
 <th>{t("invoice_number")}</th>
 <th>{t("payer")}</th>
 <th>{t("invoice_date")}</th>
 <th className="ds-text-right">{t("total_amount")}</th>
 <th className="ds-text-right">{t("paid_amount")}</th>
 <th className="ds-text-right">{t("remaining_amount")}</th>
 <th className="ds-text-center">{t("status")}</th>
 <th className="ds-w-60 ds-text-center">{t("action")}</th>
 </tr>
 </thead>
 <tbody>
 {displayedInvoices.map((invoice, i) => {
 const paidAmount = parseFloat(invoice.paid_amount) || 0;
 const remainingAmount = invoice.remaining_amount != null ? parseFloat(invoice.remaining_amount) : (parseFloat(invoice.amount) || 0);
 const totalAmount = parseFloat(invoice.amount) || 0;
 const advanceDeduction = parseFloat(invoice.advance_deduction_amount) || 0;
 const effectiveAmount = totalAmount - advanceDeduction;
 const creditPaid = parseFloat(invoice.credit_paid_amount) || 0;
 const status = getInvoiceStatus(invoice);
 const paymentPercentage = effectiveAmount > 0 ? ((paidAmount / effectiveAmount) * 100).toFixed(1) : 0;
 const isVoided = invoice.status === 'voided';
 const isExpanded = expandedRows[invoice.id];
 const linkedPayments = invoice.linked_payments || [];
 const advanceDetails = invoice.advance_deduction_details || [];
 const hasLinkedDocs = linkedPayments.length > 0 || advanceDetails.length > 0;

 return (
 <Fragment key={invoice.id}>
 <tr
 className={isVoided ? "prj-table__row--voided" : ""}
 style={isVoided ? { opacity: 0.5 } : undefined}
 >
 <td onClick={(e) => e.stopPropagation()} style={{ padding: '4px 6px', textAlign: 'center' }}>
 {!isVoided && hasLinkedDocs && (
  <button
   className={`prj-expand-chevron ${isExpanded ? 'prj-expand-chevron--open' : ''}`}
   onClick={() => toggleExpand(invoice.id)}
   title={t("linked_payments")}
  >
   ▶
  </button>
 )}
 </td>
 <td className="ds-text-center ds-font-medium prj-table__index" onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
 {i + 1}
 </td>
 <td onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
 <span className="prj-code">
 {invoice.invoice_number || `#${invoice.id}`}
 </span>
 </td>
 <td onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
 <span className={`prj-badge ${(invoice.payer || 'owner') === 'bank' ? 'prj-badge--info' : 'prj-badge--success'}`}>
 {(invoice.payer || 'owner') === 'bank' ? t('payer_bank') : t('payer_owner')}
 </span>
 </td>
 <td className="prj-nowrap" onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
 {formatDate(invoice.invoice_date, i18n.language)}
 </td>
 <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold" onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
 <VatAmount
  net={parseFloat(invoice.net_amount) || totalAmount / 1.05}
  withVat={totalAmount}
  format={formatMoney}
  showBtn={false}
 />
 </td>
 <td className="prj-nowrap ds-text-right prj-td--paid" onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
 {formatMoney(paidAmount)}
 </td>
 <td className={`prj-nowrap ds-text-right ${!isVoided && remainingAmount > 0.01 ? 'prj-td--remaining-warning' : 'prj-td--remaining-ok'}`} onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
 {formatMoney(remainingAmount)}
 </td>
 <td className="ds-text-center" onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
 <div className="prj-td--status-col">
 <span className={`prj-badge prj-badge--${status.color}`}>
 {status.icon} {status.label}
 </span>
 {!isVoided && creditPaid > 0 && (
 <span className="prj-badge prj-badge--purple" style={{ marginBlockStart: '4px' }}>
 {creditPaid >= paidAmount - 0.01 ? t("paid_from_credit") : t("partially_paid_from_credit")}
 </span>
 )}
 {!isVoided && totalAmount > 0 && (
 <>
 <div className="invoice-progress-bar">
 <div
 className="invoice-progress-fill"
 style={{ width: `${Math.min(100, paymentPercentage)}%` }}
 />
 </div>
 <div className="invoice-progress-text">{paymentPercentage}%</div>
 </>
 )}
 </div>
 </td>
 <td className="col-actions" onClick={(e) => e.stopPropagation()}>
 {!isVoided && (
 <ActionMenu items={[
 { label: t("edit"), to: `/invoices/${invoice.id}/edit`, type: "link" },
 { label: t("void"), type: "button", variant: "danger", onClick: () => { setVoidingInvoiceId(invoice.id); setVoidConfirmOpen(true); } },
 ]} />
 )}
 </td>
 </tr>

 {/* Expanded row: linked documents */}
 {isExpanded && hasLinkedDocs && (
 <tr className="prj-table__expand-row">
 <td colSpan={totalColumns} className="prj-table__expand-cell">
 <div className="invoice-linked-docs">
  {/* Advance Deduction */}
  {advanceDetails.length > 0 && (
   <div>
    <div className="invoice-linked-docs__section-title">{t("advance_deduction_label")}</div>
    {advanceDetails.map((ded) => (
     <span key={ded.id || ded.advance_percentage} className="invoice-linked-docs__deduction">
      {formatMoney(ded.deduction_amount)}
      {ded.advance_percentage && ` (${ded.advance_percentage}%)`}
     </span>
    ))}
   </div>
  )}

  {/* Linked Payments */}
  <div>
   <div className="invoice-linked-docs__section-title">{t("linked_payments")}</div>
   {linkedPayments.length > 0 ? (
    <div className="invoice-linked-docs__payments-grid">
     {linkedPayments.map((lp) => (
      <div key={lp.payment_id || lp.payment_date} className="invoice-linked-docs__payment-card">
       <div className="invoice-linked-docs__payment-card-row">
        <span className="invoice-linked-docs__payment-card-label">{t("payment_date")}</span>
        <span className="invoice-linked-docs__payment-card-value">{formatDate(lp.payment_date, i18n.language)}</span>
       </div>
       <div className="invoice-linked-docs__payment-card-row">
        <span className="invoice-linked-docs__payment-card-label">{t("allocated_amount_label")}</span>
        <span className="invoice-linked-docs__payment-card-value">{formatMoney(lp.allocated_amount)}</span>
       </div>
       {lp.receipt_voucher_number && (
        <div className="invoice-linked-docs__payment-card-row">
         <span className="invoice-linked-docs__payment-card-label">{t("receipt_voucher_ref")}</span>
         <a
          className="invoice-linked-docs__payment-card-link"
          onClick={(e) => {
           e.stopPropagation();
           navigate(`/receipt-vouchers/${lp.receipt_voucher_id}/view?project=${projectId}`);
          }}
         >
          {lp.receipt_voucher_number}
         </a>
        </div>
       )}
       {lp.tax_invoice_number && (
        <div className="invoice-linked-docs__payment-card-row">
         <span className="invoice-linked-docs__payment-card-label">{t("tax_invoice_ref")}</span>
         <span className="invoice-linked-docs__payment-card-value">{lp.tax_invoice_number}</span>
        </div>
       )}
      </div>
     ))}
    </div>
   ) : (
    <div className="invoice-linked-docs__empty">{t("no_linked_payments")}</div>
   )}
  </div>
 </div>
 </td>
 </tr>
 )}
 </Fragment>
 );
 })}
 </tbody>
 </table>
 </div>
 </>
 ) : (
 <div className="prj-empty-state">
 {t("no_invoices")}
 </div>
 )}

 {/* Void Invoice Confirm Dialog */}
 <Dialog
 open={voidConfirmOpen}
 title={t("void_invoice")}
 desc={
  <div>
   <p>{t("confirm_void_invoice")}</p>
   <div style={{ marginTop: '12px' }}>
    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
     {t("void_reason")}
    </label>
    <textarea
     value={voidReason}
     onChange={(e) => setVoidReason(e.target.value)}
     placeholder={t("void_reason_placeholder")}
     rows={3}
     style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '14px', resize: 'vertical' }}
    />
   </div>
  </div>
 }
 confirmLabel={voidLoading ? t("voiding") : t("void")}
 cancelLabel={t("cancel")}
 onClose={() => { if (!voidLoading) { setVoidConfirmOpen(false); setVoidingInvoiceId(null); setVoidReason(""); } }}
 onConfirm={handleVoidInvoice}
 danger
 busy={voidLoading}
 />
 </div>
 );
});

export default InvoicesTab;
