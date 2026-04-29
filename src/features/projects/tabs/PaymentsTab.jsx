import { useState, useEffect, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../contexts/NotificationContext";
import { api } from "../../../services/api";
import { paymentApi } from "../../../services/payments";
import { creditApi } from "../../../services/credits";
import { receiptVoucherApi } from "../../../services/receiptVouchers";
import { handleError } from "../../../utils/errorHandler";
import Button from "../../../components/common/Button";
import ActionMenu from "../../../components/common/ActionMenu";
import Dialog from "../../../components/common/Dialog";
import { formatMoney, formatDate } from "../../../utils/formatters";
import DirhamsIcon from "../../../components/common/DirhamsIcon";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import AdvancePaymentMonitor from "../entries/payments/pages/components/AdvancePaymentMonitor";
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import { useAuth } from '../../../contexts/AuthContext';

const PaymentsTab = memo(function PaymentsTab({ projectId, payments, onReload }) {
 const { t, i18n } = useTranslation();
 const { hasPermission, isAdmin } = useAuth();
 const canCreatePayment = isAdmin || hasPermission('payments.create');
 const canEditPayment   = isAdmin || hasPermission('payments.edit');
 const canVoidPayment   = isAdmin || hasPermission('payments.approve');

 const renderAmount = (value) => {
  const str = formatMoney(value, { lang: i18n.language });
  if (i18n.language === 'en') {
   const numPart = str.replace(/AED\s?/, '').trim();
   return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{numPart} <DirhamsIcon size={10} color="#374151" /></span>;
  }
  return str;
 };
 const { success, error: showError } = useNotifications();
 const navigate = useTenantNavigate();

 // State management
 const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
 const [voidingPaymentId, setVoidingPaymentId] = useState(null);
 const [voidReason, setVoidReason] = useState("");
 const [voidLoading, setVoidLoading] = useState(false);
 const [showVoided, setShowVoided] = useState(false);
 const [allPayments, setAllPayments] = useState(null);
 const [totalCredit, setTotalCredit] = useState(0);
 const [creditApps, setCreditApps] = useState([]);
 const [vouchers, setVouchers] = useState([]);

 // Fetch all payments (including voided) when toggle is on
 useEffect(() => {
  if (showVoided && projectId) {
   api.get(`projects/${projectId}/payments/?include_voided=true`)
    .then(res => {
     const data = res.data;
     setAllPayments(Array.isArray(data) ? data : (data?.results || []));
    })
    .catch((err) => { handleError(err, 'PaymentsTab.fetchAllPayments'); setAllPayments([]); });
  } else {
   setAllPayments(null);
  }
 }, [showVoided, projectId]);

 // Fetch available credit + credit applications + vouchers
 useEffect(() => {
  if (projectId) {
   creditApi.getSummary(projectId)
    .then(data => setTotalCredit(parseFloat(data?.total_credit) || 0))
    .catch((err) => { handleError(err, 'PaymentsTab.fetchCreditSummary'); setTotalCredit(0); });
   creditApi.getApplications(projectId)
    .then(data => setCreditApps(Array.isArray(data) ? data : []))
    .catch((err) => { handleError(err, 'PaymentsTab.fetchCreditApps'); setCreditApps([]); });

   // Fetch vouchers (include voided when toggle is on), auto-backfill if needed
   const voucherUrl = showVoided
    ? `projects/${projectId}/receipt-vouchers/?include_voided=true`
    : `projects/${projectId}/receipt-vouchers/`;
   api.get(voucherUrl)
    .then(res => {
     const vList = Array.isArray(res.data) ? res.data : [];
     setVouchers(vList);
     if (vList.length === 0 && payments && payments.length > 0) {
      receiptVoucherApi.backfill(projectId)
       .then(() => api.get(voucherUrl))
       .then(res2 => setVouchers(Array.isArray(res2.data) ? res2.data : []))
       .catch((err) => handleError(err, 'PaymentsTab.backfillVouchers'));
     }
    })
    .catch((err) => { handleError(err, 'PaymentsTab.fetchVouchers'); setVouchers([]); });
  }
 }, [projectId, payments, showVoided]);

 // Use allPayments (with voided) when toggle is on, otherwise use parent's payments (active only)
 const effectivePayments = showVoided && allPayments ? allPayments : (payments || []);

 // Real payments (amount > 0)
 const realPayments = useMemo(() =>
  effectivePayments.filter(p => parseFloat(p.amount) > 0.01),
  [effectivePayments]
 );

 // Active payments only (for statistics)
 const activePayments = useMemo(() =>
  realPayments.filter(p => p.status !== 'voided'),
  [realPayments]
 );

 // Displayed payments (filter voided based on toggle)
 const displayedPayments = useMemo(() =>
  showVoided ? realPayments : activePayments,
  [realPayments, activePayments, showVoided]
 );

 // Map payment/credit to their vouchers
 const voucherMap = useMemo(() => {
  const byPayment = {};
  const byCredit = {};
  for (const v of vouchers) {
   if (v.payment) byPayment[v.payment] = v;
   if (v.credit_application_ref) byCredit[v.credit_application_ref] = v;
  }
  return { byPayment, byCredit };
 }, [vouchers]);

 // Merge displayed payments + credit applications, sorted by date descending
 const allRows = useMemo(() => {
  const paymentRows = displayedPayments.map(p => ({ ...p, _type: 'payment' }));
  const creditRows = creditApps.map(c => ({ ...c, _type: 'credit' }));
  return [...paymentRows, ...creditRows].sort((a, b) => {
   const dateA = a.date || '';
   const dateB = b.date || '';
   return dateB.localeCompare(dateA);
  });
 }, [displayedPayments, creditApps]);

 // Payment Statistics (active payments only — voided not counted)
 const paymentStats = useMemo(() => {
 if (activePayments.length === 0) {
 return { total: 0, ownerCount: 0, bankCount: 0, ownerTotal: 0, bankTotal: 0, overallTotal: 0, baseContractTotal: 0, variationsTotal: 0, bankVatTotal: 0 };
 }

 const ownerPayments = activePayments.filter(p => (p.payer || "owner") === "owner");
 const bankPayments = activePayments.filter(p => (p.payer || "owner") === "bank");

 const ownerTotal = ownerPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
 const bankTotal = bankPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
 const overallTotal = ownerTotal + bankTotal;

 const baseContractTotal = activePayments.reduce(
  (sum, p) => sum + (parseFloat(p.breakdown?.base_contract) || 0), 0
 );
 const variationsTotal = activePayments.reduce(
  (sum, p) => sum + (parseFloat(p.breakdown?.variations) || 0), 0
 );
 const bankVatTotal = activePayments.reduce(
  (sum, p) => sum + (parseFloat(p.breakdown?.bank_vat) || 0), 0
 );

 return {
 total: activePayments.length,
 ownerCount: ownerPayments.length,
 bankCount: bankPayments.length,
 ownerTotal,
 bankTotal,
 overallTotal,
 baseContractTotal,
 variationsTotal,
 bankVatTotal
 };
 }, [activePayments]);

 const handleAddPayment = () => {
 navigate(`/payments/create?project=${projectId}`);
 };

 const handleEditPayment = (payment) => {
 navigate(`/payments/${payment.id}/edit?project=${projectId}`);
 };

 const reloadAllPayments = () => {
  if (showVoided && projectId) {
   api.get(`projects/${projectId}/payments/?include_voided=true`)
    .then(res => {
     const data = res.data;
     setAllPayments(Array.isArray(data) ? data : (data?.results || []));
    })
    .catch((err) => { handleError(err, 'PaymentsTab.reloadAllPayments'); setAllPayments([]); });
  }
 };

 const handleVoidPayment = async () => {
 if (!voidingPaymentId) return;
 setVoidLoading(true);
 try {
  await paymentApi.void(voidingPaymentId, voidReason);
  success(t("void_success"));
  onReload();
  reloadAllPayments();
 } catch (error) {
  const apiDetail = error?.response?.data?.detail;
  if (apiDetail) {
   const msg = Array.isArray(apiDetail) ? apiDetail.join('\n') : apiDetail;
   showError(msg);
  } else {
   const handledError = handleError(error, 'PaymentsTab.handleVoidPayment');
   showError(handledError.message || t("void_error"));
  }
 } finally {
  setVoidConfirmOpen(false);
  setVoidingPaymentId(null);
  setVoidReason("");
  setVoidLoading(false);
 }
 };


 return (
 <div className="prj-tab-panel">
 <div className="prj-tab-header">
 <div className="prj-tab-actions">
 {canCreatePayment && (
 <Button onClick={handleAddPayment} variant="primary" size="md">
 {t("add_payment")}
 </Button>
 )}
 <Button variant="outline" size="md" onClick={() => setShowVoided(!showVoided)}>
  {showVoided ? t("hide_voided") : t("show_voided")}
 </Button>
 </div>
 </div>
 {/* Advance Payment Monitor */}
 <AdvancePaymentMonitor projectId={projectId} onReload={onReload} />

 {allRows.length > 0 ? (
 <>
 {/* Summary Section */}
 <div className="prj-tab-section">
 <div className="prj-tab-section__title">{t("payments_summary")}</div>
 <MetricGrid>
 <MetricCard variant="blue" icon="dollar" label={t("overall_total")} value={renderAmount(paymentStats.overallTotal)} />
 <MetricCard variant="emerald" icon="wallet" label={t("owner_total")} value={renderAmount(paymentStats.ownerTotal)} />
 <MetricCard variant="emerald" icon="hash" label={t("owner_payments_count")} value={paymentStats.ownerCount} />
 <MetricCard variant="blue" icon="building" label={t("bank_total")} value={renderAmount(paymentStats.bankTotal)} />
 <MetricCard variant="blue" icon="hash" label={t("bank_payments_count")} value={paymentStats.bankCount} />
 {totalCredit > 0 && (
 <MetricCard variant="violet" icon="creditCard" label={t("available_credit")} value={renderAmount(totalCredit)} />
 )}
 </MetricGrid>
 </div>
 {/* Breakdown Summary */}
 {(paymentStats.baseContractTotal > 0 || paymentStats.variationsTotal > 0 || paymentStats.bankVatTotal > 0) && (
 <div className="prj-tab-section">
 <div className="prj-tab-section__title">{t("payment_breakdown_title")}</div>
 <MetricGrid>
 <MetricCard variant="emerald" icon="file" label={t("base_contract_total")} value={renderAmount(paymentStats.baseContractTotal)} />
 {paymentStats.variationsTotal > 0 && (
 <MetricCard variant="amber" icon="layers" label={t("variations_total")} value={renderAmount(paymentStats.variationsTotal)} />
 )}
 {paymentStats.bankVatTotal > 0 && (
 <MetricCard variant="blue" icon="percent" label={t("bank_vat_total")} value={renderAmount(paymentStats.bankVatTotal)} />
 )}
 </MetricGrid>
 </div>
 )}

 <div className="prj-table__wrapper">
 <table className="prj-table">
 <thead>
 <tr>
 <th className="ds-text-center ds-w-60">#</th>
 <th>{t("payment_date")}</th>
 <th>{t("payment_type")}</th>
 <th>{t("recipient")}</th>
 <th className="ds-text-right">{t("amount")}</th>
 <th className="ds-text-right">{t("base_contract_amount")}</th>
 <th className="ds-text-right">{t("variations_amount")}</th>
 <th className="ds-text-right">{t("bank_vat_amount")}</th>
 <th>{t("receipt_voucher_title")}</th>
 <th>{t("allocated_invoices_col")}</th>
 <th className="ds-text-center">{t("status")}</th>
 <th className="ds-w-60 ds-text-center">{t("action")}</th>
 </tr>
 </thead>
 <tbody>
 {allRows.map((row, i) => {
 if (row._type === 'credit') {
 const invoicesList = (row.invoices_covered || [])
  .map(inv => inv.invoice_number)
  .join(', ');
 return (
 <tr key={row.id} className="prj-table__row--credit">
 <td className="ds-text-center ds-font-medium prj-table__index">
 {i + 1}
 </td>
 <td className="prj-nowrap">
 {formatDate(row.date, i18n.language)}
 </td>
 <td>
 <span className="prj-badge prj-badge--purple">
 {t("credit_transaction")}
 </span>
 {invoicesList && (
 <span className="prj-table__credit-invoices" style={{ marginInlineStart: '4px', fontSize: '12px', color: 'var(--text-tertiary, #9ca3af)' }}>
 {invoicesList}
 </span>
 )}
 </td>
 <td>-</td>
 <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
 {renderAmount(row.amount)}
 </td>
 <td className="ds-text-right">-</td>
 <td className="ds-text-right">-</td>
 <td className="ds-text-right">-</td>
 <td>
 {(() => {
  const v = voucherMap.byCredit[row.id];
  return v ? (
   <a href={`/receipt-vouchers/${v.id}/view?project=${projectId}`}
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/receipt-vouchers/${v.id}/view?project=${projectId}`); }}
    className="prj-link">
    {v.voucher_number}
   </a>
  ) : '-';
 })()}
 </td>
 <td>-</td>
 <td className="ds-text-center">-</td>
 <td className="col-actions"></td>
 </tr>
 );
 }

 // Regular payment row
 const payment = row;
 const payerType = payment.payer || "owner";
 const payerLabel = payerType === "bank"
 ? t("payer_bank")
 : t("payer_owner");
 const isVoided = payment.status === 'voided';

 return (
 <tr
  key={payment.id}
  className={isVoided ? "prj-table__row--voided" : ""}
  style={isVoided ? { opacity: 0.5 } : undefined}
  onClick={() => navigate(`/payments/${payment.id}/view?project=${projectId}`)}
 >
 <td className="ds-text-center ds-font-medium prj-table__index">
 {i + 1}
 </td>
 <td className="prj-nowrap">
 {formatDate(payment.date, i18n.language)}
 </td>
 <td>
 <span className={`prj-badge ${payerType === "bank" ? "prj-badge--info" : "prj-badge--success"}`}>
 {payerLabel}
 </span>
 {payment.is_advance_payment && (
 <span className="prj-badge prj-badge--warning" style={{ marginInlineStart: '4px' }}>
 {t("advance_payment")}
 </span>
 )}
 {!isVoided && parseFloat(payment.credit_balance) > 0 && (
 <span className="prj-badge prj-badge--purple" style={{ marginInlineStart: '4px' }}>
 {t("credit_balance")}: {renderAmount(payment.credit_balance)}
 </span>
 )}
 </td>
 <td className="prj-nowrap" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
 {payment.recipient_name || '-'}
 </td>
 <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
 {renderAmount(payment.amount)}
 </td>
 <td className="prj-nowrap ds-text-right">
 {payment.breakdown?.base_contract && parseFloat(payment.breakdown.base_contract) > 0
  ? renderAmount(payment.breakdown.base_contract) : '-'}
 </td>
 <td className="prj-nowrap ds-text-right">
 {payment.breakdown?.variations && parseFloat(payment.breakdown.variations) > 0
  ? renderAmount(payment.breakdown.variations) : '-'}
 </td>
 <td className="prj-nowrap ds-text-right">
 {payment.breakdown?.bank_vat && parseFloat(payment.breakdown.bank_vat) > 0
  ? renderAmount(payment.breakdown.bank_vat) : '-'}
 </td>
 <td onClick={(e) => e.stopPropagation()}>
 {(() => {
  const v = voucherMap.byPayment[payment.id];
  return v ? (
   <a href={`/receipt-vouchers/${v.id}/view?project=${projectId}`}
    onClick={(e) => { e.preventDefault(); navigate(`/receipt-vouchers/${v.id}/view?project=${projectId}`); }}
    className="prj-link">
    {v.voucher_number}
   </a>
  ) : '-';
 })()}
 </td>
 <td onClick={(e) => e.stopPropagation()}>
 {(() => {
  const allocInvoices = payment.allocated_invoices || [];
  if (allocInvoices.length === 0) return '-';
  return (
   <div className="payment-invoice-chips">
    {allocInvoices.map(inv => (
     <a
      key={inv.invoice_id}
      className="payment-invoice-chip"
      onClick={(e) => { e.preventDefault(); navigate(`/invoices/${inv.invoice_id}/view`); }}
     >
      {inv.invoice_number}: <span className="payment-invoice-chip__amount">{renderAmount(inv.allocated_amount)}</span>
     </a>
    ))}
   </div>
  );
 })()}
 </td>
 <td className="ds-text-center">
 {isVoided ? (
  <span className="prj-badge prj-badge--muted">{t("voided")}</span>
 ) : (
  <span className="prj-badge prj-badge--success">{t("active")}</span>
 )}
 </td>
 <td className="col-actions" onClick={(e) => e.stopPropagation()}>
 {!isVoided && (
 <ActionMenu items={[
 ...(canEditPayment ? [{ label: t("edit"), type: "button", onClick: () => handleEditPayment(payment) }] : []),
 ...(canVoidPayment ? [{ label: t("void"), type: "button", variant: "danger", onClick: () => { setVoidingPaymentId(payment.id); setVoidConfirmOpen(true); } }] : []),
 ]} />
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </>
 ) : (
 <div className="prj-empty-state">
 {t("no_payments")}
 </div>
 )}

 {/* Void Payment Confirm Dialog */}
 <Dialog
 open={voidConfirmOpen}
 title={t("void_payment")}
 desc={
  <div>
   <p>{t("confirm_void_payment")}</p>
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
 onClose={() => { if (!voidLoading) { setVoidConfirmOpen(false); setVoidingPaymentId(null); setVoidReason(""); } }}
 onConfirm={handleVoidPayment}
 danger
 busy={voidLoading}
 />

 </div>
 );
});

export default PaymentsTab;
