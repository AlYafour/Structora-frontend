import { useState, useEffect, useMemo, memo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useDownloadFinancialPDFs } from "../../../hooks/useDownloadFinancialPDFs";
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
import TabPrintWrapper from "../../../components/print/TabPrintWrapper";
import DownloadAllButton from "../../../components/common/DownloadAllButton";
import "./PaymentsTab.css";
import useTableSelection from '../hooks/useTableSelection';
import BulkActionsBar from '../../../components/common/BulkActionsBar';

const PaymentsTab = memo(function PaymentsTab({ projectId, payments, onReload }) {
  const { t, i18n } = useTranslation();
  const { hasPermission, isAdmin } = useAuth();
  const canCreatePayment = isAdmin || hasPermission('payments.create');
  const canEditPayment = isAdmin || hasPermission('payments.edit');
  const canVoidPayment = isAdmin || hasPermission('payments.approve');

  const [showVat, setShowVat] = useState(false);
  const vatLabel = showVat ? t("including_vat") : t("excluding_vat");
  const vg = (val) => showVat ? val : val / 1.05;

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

  // Promissory note honor/dishonor state
  const [honorOpen, setHonorOpen] = useState(false);
  const [honorPaymentId, setHonorPaymentId] = useState(null);
  const [honorDate, setHonorDate] = useState('');
  const [honorLoading, setHonorLoading] = useState(false);
  const [dishonorOpen, setDishonorOpen] = useState(false);
  const [dishonorPaymentId, setDishonorPaymentId] = useState(null);
  const [dishonorReason, setDishonorReason] = useState('');
  const [dishonorLoading, setDishonorLoading] = useState(false);
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

    // Separate non-honored promissory notes from real cash payments
    // pending = awaiting honor, dishonored = bounced — neither counts as cash received
    const isNonHonoredNote = p =>
      p.payment_method === 'promissory_note' && p.promissory_note_status !== 'honored';

    const ownerCashPayments = ownerPayments.filter(p => !isNonHonoredNote(p));
    const ownerPendingNotes = ownerPayments.filter(p =>
      p.payment_method === 'promissory_note' && p.promissory_note_status === 'pending'
    );

    // Only count cash payments in financial totals — pending notes are not received cash
    const ownerTotal = ownerCashPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const bankTotal = bankPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const overallTotal = ownerTotal + bankTotal;
    const promissoryNoteTotal = ownerPendingNotes.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const promissoryNoteCount = ownerPendingNotes.length;

    // Breakdown totals exclude all non-honored promissory notes
    const cashPayments = activePayments.filter(p => !isNonHonoredNote(p));
    const baseContractTotal = cashPayments.reduce(
      (sum, p) => sum + (parseFloat(p.breakdown?.base_contract) || 0), 0
    );
    const variationsTotal = cashPayments.reduce(
      (sum, p) => sum + (parseFloat(p.breakdown?.variations) || 0), 0
    );
    const bankVatTotal = cashPayments.reduce(
      (sum, p) => sum + (parseFloat(p.breakdown?.bank_vat) || 0), 0
    );

    return {
      total: activePayments.length,
      ownerCount: ownerCashPayments.length,
      bankCount: bankPayments.length,
      ownerTotal,
      bankTotal,
      overallTotal,
      promissoryNoteTotal,
      promissoryNoteCount,
      baseContractTotal,
      variationsTotal,
      bankVatTotal
    };
  }, [activePayments]);

  const [payerFilter, setPayerFilter] = useState("");

  // Unvoid state
  const [unvoidConfirmOpen, setUnvoidConfirmOpen] = useState(false);
  const [unvoidingPaymentId, setUnvoidingPaymentId] = useState(null);
  const [unvoidLoading, setUnvoidLoading] = useState(false);

  // Delete state
  const [deletePaymentOpen, setDeletePaymentOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [deletePaymentLoading, setDeletePaymentLoading] = useState(false);

  // Bulk void state
  const [bulkVoidOpen, setBulkVoidOpen] = useState(false);
  const [bulkVoidReason, setBulkVoidReason] = useState('');
  const [bulkVoiding, setBulkVoiding] = useState(false);

  const filteredRows = useMemo(() => {
    if (!payerFilter) return allRows;
    return allRows.filter(row => {
      if (row._type === 'credit') return true;
      return (row.payer || "owner") === payerFilter;
    });
  }, [allRows, payerFilter]);

  // Selectable rows for bulk void: active payment rows only
  const selectablePayments = useMemo(() =>
    filteredRows.filter(r => r._type === 'payment' && r.status !== 'voided'),
    [filteredRows]
  );

  const {
    selectedIds: selectedPaymentIds,
    handleSelect: handleSelectPayment,
    handleSelectAll: handleSelectAllPayments,
    clearSelection: clearPaymentSelection,
    isAllSelected: isAllPaymentsSelected,
    selectAllRef: paymentSelectAllRef,
  } = useTableSelection({ items: selectablePayments, t });

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Payments",
    pageStyle: `
      @page { size: A4 landscape; margin: 8mm; }
      html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
    `,
  });

  const { downloadZip, zipLoading } = useDownloadFinancialPDFs(projectId);
  const handleDownloadZip = () =>
    downloadZip({
      items:        displayedPayments,
      documentType: "payment",
      getFileName:  (p) => `PAY-${p.id}`,
      zipName:      "Payments.zip",
    });

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

  const handleHonorNote = async () => {
    if (!honorPaymentId) return;
    setHonorLoading(true);
    try {
      await paymentApi.honorPromissoryNote(honorPaymentId, honorDate);
      success(t('promissory_note_honored_success', 'Promissory note marked as honored. Receipt voucher created.'));
      onReload();
      reloadAllPayments();
    } catch (error) {
      const apiDetail = error?.response?.data?.detail;
      showError(apiDetail || t('promissory_note_honor_error', 'Failed to honor promissory note.'));
    } finally {
      setHonorOpen(false);
      setHonorPaymentId(null);
      setHonorDate('');
      setHonorLoading(false);
    }
  };

  const handleDishonorNote = async () => {
    if (!dishonorPaymentId) return;
    setDishonorLoading(true);
    try {
      await paymentApi.dishonorPromissoryNote(dishonorPaymentId, dishonorReason);
      success(t('promissory_note_dishonored_success', 'Promissory note marked as dishonored. Allocations reversed.'));
      onReload();
      reloadAllPayments();
    } catch (error) {
      const apiDetail = error?.response?.data?.detail;
      showError(apiDetail || t('promissory_note_dishonor_error', 'Failed to dishonor promissory note.'));
    } finally {
      setDishonorOpen(false);
      setDishonorPaymentId(null);
      setDishonorReason('');
      setDishonorLoading(false);
    }
  };

  const handleBulkVoidPayments = async () => {
    setBulkVoiding(true);
    const ids = Array.from(selectedPaymentIds);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        await paymentApi.void(id, bulkVoidReason);
        ok++;
      } catch (_e) {
        fail++;
      }
    }
    clearPaymentSelection();
    setBulkVoiding(false);
    setBulkVoidOpen(false);
    setBulkVoidReason('');
    if (fail === 0) success(t('void_success'));
    else if (ok > 0) showError(`${ok} ${t('voided_successfully', 'voided')}, ${fail} ${t('failed', 'failed')}`);
    else showError(t('void_error'));
    onReload();
    reloadAllPayments();
  };

  const handleUnvoidPayment = async () => {
    if (!unvoidingPaymentId) return;
    setUnvoidLoading(true);
    try {
      await paymentApi.unvoid(unvoidingPaymentId);
      success(t("unvoid_success", "Payment restored successfully"));
      onReload();
      reloadAllPayments();
    } catch (err) {
      const apiDetail = err?.response?.data?.detail || err?.response?.data?.error;
      showError(apiDetail || t("unvoid_error", "Failed to restore payment"));
    } finally {
      setUnvoidConfirmOpen(false);
      setUnvoidingPaymentId(null);
      setUnvoidLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deletingPaymentId) return;
    setDeletePaymentLoading(true);
    try {
      await api.delete(`payments/${deletingPaymentId}/?include_voided=true`);
      success(t("delete_success", "Payment deleted permanently"));
      onReload();
      reloadAllPayments();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showError(detail || t("delete_error", "Failed to delete payment"));
    } finally {
      setDeletePaymentOpen(false);
      setDeletingPaymentId(null);
      setDeletePaymentLoading(false);
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
          {allRows.length > 0 && (
            <button
              onClick={handlePrint}
              className="payments-tab__btn-outline"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 17V3M6 11l6 6 6-6" />
                <path d="M4 21h16" />
              </svg>
              {t("download_pdf", "Download PDF")}
            </button>
          )}
          <DownloadAllButton
            onClick={handleDownloadZip}
            loading={zipLoading}
            count={displayedPayments.length}
          />
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
              <MetricCard
                tip={t(
                  "invoices_total_amount_tooltip",
                  "Includes VAT and excludes consultant fees."
                )}
                variant="blue" icon="dollar" label={t("overall_total")} value={renderAmount(vg(paymentStats.overallTotal))} sub={vatLabel} />
              <MetricCard
                tip={t(
                  "invoices_total_amount_tooltip",
                  "Includes VAT and excludes consultant fees."
                )}
                variant="emerald" icon="wallet" label={t("owner_total")} value={renderAmount(vg(paymentStats.ownerTotal))} sub={vatLabel} />
              <MetricCard variant="emerald" icon="hash" label={t("owner_payments_count")} value={paymentStats.ownerCount} />
              <MetricCard
                tip={t(
                  "invoices_total_amount_tooltip",
                  "Includes VAT and excludes consultant fees."
                )}
                variant="blue" icon="building" label={t("bank_total")} value={renderAmount(vg(paymentStats.bankTotal))} sub={vatLabel} />
              <MetricCard variant="blue" icon="hash" label={t("bank_payments_count")} value={paymentStats.bankCount} />
              {paymentStats.promissoryNoteTotal > 0 && (
                <MetricCard
                  variant="amber"
                  icon="file"
                  label={t("promissory_notes_pending", "Promissory Notes (Pending)")}
                  value={renderAmount(vg(paymentStats.promissoryNoteTotal))}
                  sub={`${paymentStats.promissoryNoteCount} ${t("notes", "note(s)")} — ${t("not_yet_honored", "not yet honored / لم تُصرف بعد")}`}
                />
              )}
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
                <MetricCard variant="emerald" icon="file" label={t("base_contract_total")} value={renderAmount(vg(paymentStats.baseContractTotal))} sub={vatLabel} />
                {paymentStats.variationsTotal > 0 && (
                  <MetricCard variant="amber" icon="layers" label={t("variations_total")} value={renderAmount(vg(paymentStats.variationsTotal))} sub={vatLabel} />
                )}
                {paymentStats.bankVatTotal > 0 && (
                  <MetricCard variant="blue" icon="percent" label={t("bank_vat_total")} value={renderAmount(vg(paymentStats.bankVatTotal))} sub={vatLabel} />
                )}
              </MetricGrid>
            </div>
          )}

          <div className="payments-tab__filter-bar">
            <span className="payments-tab__filter-label">{t("filter_by", "Filter by")}:</span>
            <div className="payments-tab__filter-chips">
              {[
                { value: "", label: t("all", "All") },
                { value: "owner", label: t("payer_owner", "Owner") },
                { value: "bank", label: t("payer_bank", "Bank") },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPayerFilter(opt.value)}
                  className={`payments-tab__chip${payerFilter === opt.value ? " payments-tab__chip--active" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {payerFilter && (
              <span className="payments-tab__filter-count">
                {filteredRows.length} {t("results", "results")}
              </span>
            )}
          </div>

          {canVoidPayment && (
            <BulkActionsBar
              selectedCount={selectedPaymentIds.size}
              onClear={clearPaymentSelection}
              actions={[{
                label: t('bulk_void', 'Void Selected'),
                onClick: () => setBulkVoidOpen(true),
                variant: 'danger',
              }]}
            />
          )}
          <TabPrintWrapper
            ref={printRef}
            title={t("payments", "Payments")}
            filterLabel={payerFilter ? `${t("filter_by", "Filter")}: ${payerFilter === "bank" ? t("payer_bank", "Bank") : t("payer_owner", "Owner")}` : undefined}
          >
          <div className="prj-table__wrapper payments-tab__table">
            <table className="prj-table">
              <thead>
                <tr>
                  {canVoidPayment && (
                    <th style={{ width: '40px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        ref={paymentSelectAllRef}
                        checked={isAllPaymentsSelected}
                        onChange={(e) => handleSelectAllPayments(e.target.checked)}
                      />
                    </th>
                  )}
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
                {filteredRows.map((row, i) => {
                  if (row._type === 'credit') {
                    const invoicesList = (row.invoices_covered || [])
                      .map(inv => inv.invoice_number)
                      .join(', ');
                    return (
                      <tr key={row.id} className="prj-table__row--credit">
                        {canVoidPayment && <td onClick={(e) => e.stopPropagation()}></td>}
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
                      style={isVoided ? { opacity: 0.5 } : (selectedPaymentIds.has(payment.id) ? { backgroundColor: '#eff6ff' } : undefined)}
                      onClick={() => navigate(`/payments/${payment.id}/detail?project=${projectId}`)}
                    >
                      {canVoidPayment && (
                        <td className="ds-text-center" onClick={(e) => e.stopPropagation()}>
                          {!isVoided && (
                            <input
                              type="checkbox"
                              checked={selectedPaymentIds.has(payment.id)}
                              onChange={(e) => handleSelectPayment(payment.id, e.target.checked)}
                            />
                          )}
                        </td>
                      )}
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
                        {payment.payment_method === 'promissory_note' && (
                          <span
                            className="prj-badge"
                            style={{
                              marginTop: '4px',
                              marginInlineStart: '4px',
                              background: payment.promissory_note_status === 'honored'
                                ? '#d1fae5' : payment.promissory_note_status === 'dishonored'
                                ? '#fee2e2' : '#fef3c7',
                              color: payment.promissory_note_status === 'honored'
                                ? '#065f46' : payment.promissory_note_status === 'dishonored'
                                ? '#991b1b' : '#92400e',
                              border: payment.promissory_note_status === 'honored'
                                ? '1px solid #6ee7b7' : payment.promissory_note_status === 'dishonored'
                                ? '1px solid #fca5a5' : '1px solid #fcd34d',
                            }}
                          >
                            {payment.promissory_note_status === 'honored'
                              ? `✓ ${t('promissory_note_honored', 'Note Honored')}`
                              : payment.promissory_note_status === 'dishonored'
                              ? `✗ ${t('promissory_note_dishonored', 'Note Dishonored')}`
                              : `⏳ ${t('promissory_note_pending', 'Promissory Note — Pending')}`
                            }
                          </span>
                        )}
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
                        {!isVoided ? (
                          <ActionMenu items={[
                            ...(canEditPayment ? [{ label: t("edit"), type: "button", onClick: () => handleEditPayment(payment) }] : []),
                            ...(payment.payment_method === 'promissory_note' && payment.promissory_note_status === 'pending' && canEditPayment ? [
                              { label: `✓ ${t('honor_note', 'Honor Note')}`, type: "button", onClick: () => { setHonorPaymentId(payment.id); setHonorDate(new Date().toISOString().slice(0, 10)); setHonorOpen(true); } },
                              { label: `✗ ${t('dishonor_note', 'Dishonor Note')}`, type: "button", variant: "danger", onClick: () => { setDishonorPaymentId(payment.id); setDishonorOpen(true); } },
                            ] : []),
                            ...(canVoidPayment ? [{ label: t("void"), type: "button", variant: "danger", onClick: () => { setVoidingPaymentId(payment.id); setVoidConfirmOpen(true); } }] : []),
                            ...(isAdmin ? [{ label: t("delete", "Delete"), type: "button", variant: "danger", onClick: () => { setDeletingPaymentId(payment.id); setDeletePaymentOpen(true); } }] : []),
                          ]} />
                        ) : (
                          isAdmin && (
                            <ActionMenu items={[
                              { label: t("unvoid", "Unvoid"), type: "button", variant: "warning", onClick: () => { setUnvoidingPaymentId(payment.id); setUnvoidConfirmOpen(true); } },
                              { label: t("delete", "Delete"), type: "button", variant: "danger", onClick: () => { setDeletingPaymentId(payment.id); setDeletePaymentOpen(true); } },
                            ]} />
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Print-only summary */}
          <div className="tpw-print-only" style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', border: '1.5px solid #d8c9b3', borderRadius: '12px', overflow: 'hidden', minHeight: '130px' }}>
              {/* Left — dark panel */}
              <div style={{ flex: '0 0 42%', background: '#17202f', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '7pt', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {t("overall_total")}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px' }}>
                    <span style={{ fontSize: '26pt', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {parseFloat(vg(paymentStats.overallTotal) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '12pt', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>AED</span>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '2px 9px', fontSize: '6.5pt', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {vatLabel}
                    </span>
                    <span style={{ fontSize: '7.5pt', color: 'rgba(255,255,255,0.4)' }}>
                      {paymentStats.total} {t("payments").toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
              {/* Right — light panel */}
              <div style={{ flex: 1, background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '8pt', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {t("payments_summary")}
                  </span>
                  <span style={{ fontSize: '24pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>
                    {paymentStats.total}
                  </span>
                </div>
                <div style={{ height: '10px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', height: '100%' }}>
                    <div style={{ width: `${paymentStats.total > 0 ? (paymentStats.ownerCount / paymentStats.total) * 100 : 0}%`, background: '#10b981' }} />
                    <div style={{ width: `${paymentStats.total > 0 ? (paymentStats.bankCount / paymentStats.total) * 100 : 0}%`, background: '#3b82f6' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {[
                    { dot: '#10b981', label: t("payer_owner"), value: renderAmount(vg(paymentStats.ownerTotal)), sub: `${paymentStats.ownerCount} ${t("payments").toLowerCase()}` },
                    { dot: '#3b82f6', label: t("payer_bank"), value: renderAmount(vg(paymentStats.bankTotal)), sub: `${paymentStats.bankCount} ${t("payments").toLowerCase()}` },
                    ...(totalCredit > 0 ? [{ dot: '#8b5cf6', label: t("available_credit"), value: renderAmount(totalCredit), sub: null }] : []),
                  ].map(({ dot, label, value, sub }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '6.5pt', fontWeight: 700, color: dot, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                        {label}
                      </div>
                      <div style={{ fontSize: '11pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>{value}</div>
                      {sub && <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '3px' }}>{sub}</div>}
                    </div>
                  ))}
                </div>
                {(paymentStats.baseContractTotal > 0 || paymentStats.variationsTotal > 0 || paymentStats.bankVatTotal > 0) && (
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px' }}>
                    <div style={{ fontSize: '6pt', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                      {t("payment_breakdown_title")}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      {[
                        { dot: '#10b981', label: t("base_contract_total"), value: renderAmount(vg(paymentStats.baseContractTotal)), show: paymentStats.baseContractTotal > 0 },
                        { dot: '#f59e0b', label: t("variations_total"), value: renderAmount(vg(paymentStats.variationsTotal)), show: paymentStats.variationsTotal > 0 },
                        { dot: '#3b82f6', label: t("bank_vat_total"), value: renderAmount(vg(paymentStats.bankVatTotal)), show: paymentStats.bankVatTotal > 0 },
                      ].filter(i => i.show).map(({ dot, label, value }) => (
                        <div key={label}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '6.5pt', fontWeight: 700, color: dot, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                            {label}
                          </div>
                          <div style={{ fontSize: '10pt', fontWeight: 800, color: '#17202f', lineHeight: 1 }}>{value}</div>
                          <div style={{ fontSize: '6.5pt', color: '#64748b', marginTop: '3px' }}>{vatLabel}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </TabPrintWrapper>
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

      {/* Bulk Void Payments Dialog */}
      <Dialog
        open={bulkVoidOpen}
        title={t("bulk_void_payments", "Void Selected Payments")}
        desc={
          <div>
            <p>{t("bulk_void_payments_confirm", `Void ${selectedPaymentIds.size} selected payment(s)?`)}</p>
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t("void_reason")}
              </label>
              <textarea
                value={bulkVoidReason}
                onChange={(e) => setBulkVoidReason(e.target.value)}
                placeholder={t("void_reason_placeholder")}
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '14px', resize: 'vertical' }}
              />
            </div>
          </div>
        }
        confirmLabel={bulkVoiding ? t("voiding") : t("void")}
        cancelLabel={t("cancel")}
        onClose={() => { if (!bulkVoiding) { setBulkVoidOpen(false); setBulkVoidReason(''); } }}
        onConfirm={handleBulkVoidPayments}
        danger
        busy={bulkVoiding}
      />

      {/* Honor Promissory Note Dialog */}
      <Dialog
        open={honorOpen}
        title={t('honor_promissory_note', 'Honor Promissory Note')}
        desc={
          <div>
            <p style={{ marginBottom: '12px', color: '#374151' }}>
              {t('honor_note_confirm', 'Mark this promissory note as honored (cash received). A receipt voucher will be created and the amount will be deducted from the outstanding balance.')}
            </p>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t('honored_date', 'Date Honored')} *
              </label>
              <input
                type="date"
                value={honorDate}
                onChange={(e) => setHonorDate(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '14px' }}
              />
            </div>
          </div>
        }
        confirmLabel={honorLoading ? t('processing', 'Processing…') : `✓ ${t('honor_note', 'Honor Note')}`}
        cancelLabel={t('cancel')}
        onClose={() => { if (!honorLoading) { setHonorOpen(false); setHonorPaymentId(null); setHonorDate(''); } }}
        onConfirm={handleHonorNote}
        busy={honorLoading}
      />

      {/* Dishonor Promissory Note Dialog */}
      <Dialog
        open={dishonorOpen}
        title={t('dishonor_promissory_note', 'Dishonor Promissory Note')}
        desc={
          <div>
            <p style={{ marginBottom: '12px', color: '#374151' }}>
              {t('dishonor_note_confirm', 'Mark this note as dishonored (bounced/returned). Invoice allocations will be reversed and the outstanding balance will be restored.')}
            </p>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t('dishonor_reason', 'Reason')}
              </label>
              <textarea
                value={dishonorReason}
                onChange={(e) => setDishonorReason(e.target.value)}
                placeholder={t('dishonor_reason_placeholder', 'e.g. Insufficient funds, account closed…')}
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color, #d1d5db)', fontSize: '14px', resize: 'vertical' }}
              />
            </div>
          </div>
        }
        confirmLabel={dishonorLoading ? t('processing', 'Processing…') : `✗ ${t('dishonor_note', 'Dishonor Note')}`}
        cancelLabel={t('cancel')}
        onClose={() => { if (!dishonorLoading) { setDishonorOpen(false); setDishonorPaymentId(null); setDishonorReason(''); } }}
        onConfirm={handleDishonorNote}
        danger
        busy={dishonorLoading}
      />

      {/* Unvoid Payment Confirm Dialog */}
      <Dialog
        open={unvoidConfirmOpen}
        title={t("unvoid_payment", "Restore Payment")}
        desc={<p>{t("confirm_unvoid_payment", "This will restore the payment to active status. Previously voided allocations will not be restored automatically.")}</p>}
        confirmLabel={unvoidLoading ? t("restoring", "Restoring...") : t("unvoid", "Unvoid")}
        cancelLabel={t("cancel")}
        onClose={() => { if (!unvoidLoading) { setUnvoidConfirmOpen(false); setUnvoidingPaymentId(null); } }}
        onConfirm={handleUnvoidPayment}
        busy={unvoidLoading}
      />

      {/* Delete Payment Confirm Dialog */}
      <Dialog
        open={deletePaymentOpen}
        title={t("delete_payment", "Delete Payment")}
        desc={<p>{t("confirm_delete_payment", "This will permanently delete the payment. This action cannot be undone.")}</p>}
        confirmLabel={deletePaymentLoading ? t("deleting", "Deleting...") : t("delete", "Delete")}
        cancelLabel={t("cancel")}
        onClose={() => { if (!deletePaymentLoading) { setDeletePaymentOpen(false); setDeletingPaymentId(null); } }}
        onConfirm={handleDeletePayment}
        danger
        busy={deletePaymentLoading}
      />

    </div>
  );
});

export default PaymentsTab;
