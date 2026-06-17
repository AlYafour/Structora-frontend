import { useState, useEffect, memo, useMemo, useRef, Fragment } from "react";
import { useReactToPrint } from "react-to-print";
import { useDownloadFinancialPDFs } from "../../../hooks/useDownloadFinancialPDFs";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../contexts/NotificationContext";
import { api } from "../../../services/api";
import { projectApi } from "../../../services";
import { handleError } from "../../../utils/errorHandler";

import Button from "../../../components/common/Button";
import "./PaymentsTab.css";
import ActionMenu from "../../../components/common/ActionMenu";
import Dialog from "../../../components/common/Dialog";
import { formatMoney, formatDate } from "../../../utils/formatters";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import DirhamsIcon from "../../../components/common/DirhamsIcon";
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import { useAuth } from '../../../contexts/AuthContext';
import TabPrintWrapper from "../../../components/print/TabPrintWrapper";
import DownloadAllButton from "../../../components/common/DownloadAllButton";
import useTableSelection from '../hooks/useTableSelection';
import BulkActionsBar from '../../../components/common/BulkActionsBar';

const InvoicesTab = memo(function InvoicesTab({ projectId, invoices, onReload }) {
  const { t, i18n } = useTranslation();
  const { success, error: showError } = useNotifications();

  const renderAmount = (value) => {
    const str = formatMoney(value, { lang: i18n.language });
    if (i18n.language === 'en') {
      const numPart = str.replace(/AED\s?/, '').trim();
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {numPart} <DirhamsIcon size={10} color="#374151" />
        </span>
      );
    }
    return str;
  };
  const navigate = useTenantNavigate();
  const { hasPermission, isAdmin } = useAuth();
  const canCreateInvoice = isAdmin || hasPermission('invoices.create');
  const canEditInvoice = isAdmin || hasPermission('invoices.edit');
  const canVoidInvoice = isAdmin || hasPermission('invoices.approve');

  const [showVat, setShowVat] = useState(false);
  const vatLabel = showVat ? t("including_vat") : t("excluding_vat");
  const vg = (val) => showVat ? val : val / 1.05;

  const [payerFilter, setPayerFilter] = useState("");

  // Unvoid state
  const [unvoidConfirmOpen, setUnvoidConfirmOpen] = useState(false);
  const [unvoidingInvoiceId, setUnvoidingInvoiceId] = useState(null);
  const [unvoidLoading, setUnvoidLoading] = useState(false);

  // Delete state
  const [deleteInvoiceOpen, setDeleteInvoiceOpen] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState(null);
  const [deleteInvoiceLoading, setDeleteInvoiceLoading] = useState(false);

  // Bulk void state
  const [bulkVoidOpen, setBulkVoidOpen] = useState(false);
  const [bulkVoidReason, setBulkVoidReason] = useState('');
  const [bulkVoiding, setBulkVoiding] = useState(false);

  // Void state
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [voidingInvoiceId, setVoidingInvoiceId] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [allInvoices, setAllInvoices] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Invoices",
    pageStyle: `
      @page { size: A4 portrait; margin: 8mm; }
      html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
    `,
  });

  const { downloadZip, zipLoading } = useDownloadFinancialPDFs(projectId);

  const handleDownloadZip = () =>
    downloadZip({
      items:        displayedInvoices,
      documentType: "invoice",
      getFileName:  (inv) => inv.invoice_number || `INV-${inv.id}`,
      zipName:      `Invoices.zip`,
    });

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

  // Active invoices scoped to the active payer filter (for metric cards)
  const filteredActiveInvoices = useMemo(() =>
    payerFilter ? activeInvoices.filter(inv => (inv.payer || 'owner') === payerFilter) : activeInvoices,
    [activeInvoices, payerFilter]
  );

  // Stats shown on metric cards — respects the active filter
  const displayStats = useMemo(() => {
    const invoices = filteredActiveInvoices;
    if (invoices.length === 0) {
      return { total: 0, totalNet: 0, paid: 0, remaining: 0, count: 0, fullyPaid: 0, partiallyPaid: 0, unpaid: 0, advanceDeduction: 0, netDue: 0 };
    }
    let total = 0, totalNet = 0, paid = 0, totalRemaining = 0, fullyPaid = 0, partiallyPaid = 0, unpaid = 0, advanceDeduction = 0;
    invoices.forEach((inv) => {
      const amount = parseFloat(inv.amount) || 0;
      const netAmount = parseFloat(inv.net_amount) || (amount / 1.05);
      const paidAmount = parseFloat(inv.paid_amount) || 0;
      const remainingAmount = inv.remaining_amount != null ? parseFloat(inv.remaining_amount) : amount;
      const deduction = parseFloat(inv.advance_deduction_amount) || 0;
      total += amount; totalNet += netAmount; paid += paidAmount; totalRemaining += remainingAmount; advanceDeduction += deduction;
      if (remainingAmount <= 0.01) fullyPaid++;
      else if (paidAmount > 0.01) partiallyPaid++;
      else unpaid++;
    });
    return { total, totalNet, paid, remaining: totalRemaining, count: invoices.length, fullyPaid, partiallyPaid, unpaid, advanceDeduction, netDue: total - advanceDeduction };
  }, [filteredActiveInvoices]);

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

  const handleUnvoidInvoice = async () => {
    if (!unvoidingInvoiceId) return;
    setUnvoidLoading(true);
    try {
      await projectApi.unvoidInvoice(projectId, unvoidingInvoiceId);
      success(t("unvoid_success", "Invoice restored successfully"));
      onReload();
      reloadAllInvoices();
    } catch (err) {
      const apiDetail = err?.response?.data?.detail || err?.response?.data?.error;
      showError(apiDetail || t("unvoid_error", "Failed to restore invoice"));
    } finally {
      setUnvoidConfirmOpen(false);
      setUnvoidingInvoiceId(null);
      setUnvoidLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deletingInvoiceId) return;
    setDeleteInvoiceLoading(true);
    try {
      await api.delete(`projects/${projectId}/actual-invoices/${deletingInvoiceId}/?include_voided=true`);
      success(t("delete_success", "Invoice deleted permanently"));
      onReload();
      reloadAllInvoices();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showError(detail || t("delete_error", "Failed to delete invoice"));
    } finally {
      setDeleteInvoiceOpen(false);
      setDeletingInvoiceId(null);
      setDeleteInvoiceLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    if (!payerFilter) return displayedInvoices;
    return displayedInvoices.filter(inv => (inv.payer || 'owner') === payerFilter);
  }, [displayedInvoices, payerFilter]);

  // Selectable invoices for bulk void: non-voided only
  const selectableInvoices = useMemo(() =>
    filteredInvoices.filter(inv => inv.status !== 'voided'),
    [filteredInvoices]
  );

  const {
    selectedIds: selectedInvoiceIds,
    handleSelect: handleSelectInvoice,
    handleSelectAll: handleSelectAllInvoices,
    clearSelection: clearInvoiceSelection,
    isAllSelected: isAllInvoicesSelected,
    selectAllRef: invoiceSelectAllRef,
  } = useTableSelection({ items: selectableInvoices, t });

  const handleBulkVoidInvoices = async () => {
    setBulkVoiding(true);
    const ids = Array.from(selectedInvoiceIds);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        await projectApi.voidInvoice(projectId, id, bulkVoidReason);
        ok++;
      } catch (_e) {
        fail++;
      }
    }
    clearInvoiceSelection();
    setBulkVoiding(false);
    setBulkVoidOpen(false);
    setBulkVoidReason('');
    if (fail === 0) success(t('void_success'));
    else if (ok > 0) showError(`${ok} ${t('voided_successfully', 'voided')}, ${fail} ${t('failed', 'failed')}`);
    else showError(t('void_error'));
    onReload();
    reloadAllInvoices();
  };

  // Count total columns for expand row colspan
  const totalColumns = 12; // checkbox + expand + # + invoice_number + description + payer + date + amount + paid + remaining + status + action

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          {canCreateInvoice && (
            <Button as={Link} to={`/invoices/create?project=${projectId}`} variant="primary" size="md">
              {t("add_invoice")}
            </Button>
          )}
          <Button variant="outline" size="md" onClick={() => setShowVoided(!showVoided)}>
            {showVoided ? t("hide_voided") : t("show_voided")}
          </Button>
          <button
            onClick={() => setShowVat(s => !s)}
            className={`financial-tab-action-btn ${showVat ? 'financial-tab-action-btn--vat-active' : ''}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            {showVat ? t("including_vat") : t("excluding_vat")}
          </button>
          {displayedInvoices.length > 0 && (
            <button
              onClick={handlePrint}
              className="financial-tab-action-btn"
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
            count={displayedInvoices.length}
          />
        </div>
      </div>

      {displayedInvoices.length > 0 ? (
        <>
          {/* Filter bar — placed above metrics so selection drives the numbers below */}
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
                {filteredInvoices.length} {t("invoices_count", "invoices").toLowerCase()}
              </span>
            )}
          </div>

          {/* Filter context banner */}
          {payerFilter && (
            <div className={`payments-tab__filter-banner payments-tab__filter-banner--${payerFilter}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>
                {payerFilter === "bank"
                  ? t("filter_showing_bank_invoices", "Showing bank invoices only")
                  : t("filter_showing_owner_invoices", "Showing owner invoices only")}
                {" · "}{displayStats.count} {t("invoices_count", "invoices").toLowerCase()}
              </span>
              <button onClick={() => setPayerFilter("")} className="payments-tab__filter-banner-clear">
                {t("view_all", "View all")} ×
              </button>
            </div>
          )}

          {/* Statistics — reflects active filter */}
          <MetricGrid columns={displayStats.advanceDeduction > 0 ? 5 : 4}>
            <MetricCard variant="blue" icon="hash" label={t("invoices_count")} value={displayStats.count} />
            <MetricCard variant="emerald" icon="dollar" label={t("total_amount")}
              value={renderAmount(showVat ? displayStats.total : displayStats.totalNet)}
              tip={t("invoices_total_amount_tooltip", "Includes VAT and excludes consultant fees.")}
              sub={vatLabel}
            />
            {displayStats.advanceDeduction > 0 && (
              <MetricCard variant="amber" icon="minus" label={t("advance_deduction_total")} value={renderAmount(vg(displayStats.advanceDeduction))} sub={vatLabel} />
            )}
            <MetricCard
              tip={t("invoices_total_amount_tooltip", "Includes VAT and excludes consultant fees.")}
              variant="emerald" icon="check" label={t("paid_amount")} value={renderAmount(vg(displayStats.paid))} sub={vatLabel} />
            <MetricCard
              tip={t("invoices_total_amount_tooltip", "Includes VAT and excludes consultant fees.")}
              variant="amber" icon="alert" label={t("remaining_amount")} value={renderAmount(vg(displayStats.remaining))} sub={vatLabel} />
          </MetricGrid>

          {/* Math flow bar — shows calculation breakdown when advance deduction exists */}
          {displayStats.advanceDeduction > 0 && (
            <div className="invoices-math-flow">
              <span className="invoices-math-flow__item">
                <span className="invoices-math-flow__label">{t("invoices_total_label")}:</span>
                <span className="invoices-math-flow__value">{renderAmount(displayStats.total)}</span>
              </span>
              <span className="invoices-math-flow__op">{t("minus_sign")}</span>
              <span className="invoices-math-flow__item">
                <span className="invoices-math-flow__label">{t("advance_deduction_total")}:</span>
                <span className="invoices-math-flow__value invoices-math-flow__value--warning">{renderAmount(displayStats.advanceDeduction)}</span>
              </span>
              <span className="invoices-math-flow__op">{t("equals_sign")}</span>
              <span className="invoices-math-flow__item">
                <span className="invoices-math-flow__label">{t("net_due_label")}:</span>
                <span className="invoices-math-flow__value">{renderAmount(displayStats.netDue)}</span>
              </span>
              <span className="invoices-math-flow__op">{t("minus_sign")}</span>
              <span className="invoices-math-flow__item">
                <span className="invoices-math-flow__label">{t("paid_label")}:</span>
                <span className="invoices-math-flow__value invoices-math-flow__value--success">{renderAmount(displayStats.paid)}</span>
              </span>
              <span className="invoices-math-flow__op">{t("equals_sign")}</span>
              <span className="invoices-math-flow__item">
                <span className="invoices-math-flow__label">{t("remaining_label")}:</span>
                <span className="invoices-math-flow__value">{renderAmount(displayStats.remaining)}</span>
              </span>
            </div>
          )}

          {/* Invoice status badges */}
          <div className="invoices-status-summary">
            <span className="prj-badge prj-badge--success">
              ✓ {t("fully_paid")}: {displayStats.fullyPaid}
            </span>
            <span className="prj-badge prj-badge--warning">
              ◐ {t("partially_paid")}: {displayStats.partiallyPaid}
            </span>
            <span className="prj-badge prj-badge--danger">
              ○ {t("unpaid")}: {displayStats.unpaid}
            </span>
          </div>

          {/* Invoice table */}
          {canVoidInvoice && (
            <BulkActionsBar
              selectedCount={selectedInvoiceIds.size}
              onClear={clearInvoiceSelection}
              actions={[{
                label: t('bulk_void', 'Void Selected'),
                onClick: () => setBulkVoidOpen(true),
                variant: 'danger',
              }]}
            />
          )}
          <TabPrintWrapper ref={printRef} title={t("invoices", "Invoices")}>
          <div className="prj-table__wrapper">
            <table className="prj-table">
              <thead>
                <tr>
                  {canVoidInvoice && (
                    <th style={{ width: '40px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        ref={invoiceSelectAllRef}
                        checked={isAllInvoicesSelected}
                        onChange={(e) => handleSelectAllInvoices(e.target.checked)}
                      />
                    </th>
                  )}
                  <th style={{ width: '36px' }}></th>
                  <th className="ds-text-center ds-w-60">#</th>
                  <th>{t("invoice_number")}</th>
                  <th>{t("description", "Description")}</th>
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
                {filteredInvoices.map((invoice, i) => {
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
                        style={isVoided ? { opacity: 0.5 } : (selectedInvoiceIds.has(invoice.id) ? { backgroundColor: '#eff6ff' } : undefined)}
                      >
                        {canVoidInvoice && (
                          <td className="ds-text-center" onClick={(e) => e.stopPropagation()}>
                            {!isVoided && (
                              <input
                                type="checkbox"
                                checked={selectedInvoiceIds.has(invoice.id)}
                                onChange={(e) => handleSelectInvoice(invoice.id, e.target.checked)}
                              />
                            )}
                          </td>
                        )}
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
                        <td onClick={() => navigate(`/invoices/${invoice.id}/view`)} style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary, #6b7280)', fontSize: '0.85rem' }} title={invoice.description || ''}>
                          {invoice.description || '—'}
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
                          {renderAmount(totalAmount)}
                        </td>
                        <td className="prj-nowrap ds-text-right prj-td--paid" onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
                          {renderAmount(paidAmount)}
                        </td>
                        <td className={`prj-nowrap ds-text-right ${!isVoided && remainingAmount > 0.01 ? 'prj-td--remaining-warning' : 'prj-td--remaining-ok'}`} onClick={() => navigate(`/invoices/${invoice.id}/view`)}>
                          {renderAmount(remainingAmount)}
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
                          {!isVoided ? (
                            <ActionMenu items={[
                              ...(canEditInvoice ? [{ label: t("edit"), to: `/invoices/${invoice.id}/edit`, type: "link" }] : []),
                              ...(canVoidInvoice ? [{ label: t("void"), type: "button", variant: "danger", onClick: () => { setVoidingInvoiceId(invoice.id); setVoidConfirmOpen(true); } }] : []),
                              ...(isAdmin ? [{ label: t("delete", "Delete"), type: "button", variant: "danger", onClick: () => { setDeletingInvoiceId(invoice.id); setDeleteInvoiceOpen(true); } }] : []),
                            ]} />
                          ) : (
                            isAdmin && (
                              <ActionMenu items={[
                                { label: t("unvoid", "Unvoid"), type: "button", variant: "warning", onClick: () => { setUnvoidingInvoiceId(invoice.id); setUnvoidConfirmOpen(true); } },
                                { label: t("delete", "Delete"), type: "button", variant: "danger", onClick: () => { setDeletingInvoiceId(invoice.id); setDeleteInvoiceOpen(true); } },
                              ]} />
                            )
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
                                      {renderAmount(ded.deduction_amount)}
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
                                          <span className="invoice-linked-docs__payment-card-value">{renderAmount(lp.allocated_amount)}</span>
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

          {/* Print-only summary */}
          <div className="tpw-print-only" style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', border: '1.5px solid #d8c9b3', borderRadius: '12px', overflow: 'hidden', minHeight: '130px' }}>
              {/* Left — dark panel */}
              <div style={{ flex: '0 0 42%', background: '#17202f', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '7pt', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {t("total_amount")}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px' }}>
                    <span style={{ fontSize: '26pt', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {parseFloat(stats.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '12pt', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>AED</span>
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '2px 9px', fontSize: '6.5pt', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t("including_vat")}
                    </span>
                    <span style={{ fontSize: '7.5pt', color: 'rgba(255,255,255,0.4)' }}>
                      {stats.count} {t("invoices_count", "invoices").toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
              {/* Right — light panel */}
              <div style={{ flex: 1, background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '8pt', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {t("invoices_count", "Total Invoices")}
                  </span>
                  <span style={{ fontSize: '24pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>
                    {stats.count}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                  {[
                    ...(stats.advanceDeduction > 0 ? [{ dot: '#f97316', label: t("advance_deduction_total"), value: renderAmount(stats.advanceDeduction), sub: null }] : []),
                    { dot: '#10b981', label: t("paid_amount"), value: renderAmount(stats.paid), sub: `${t("fully_paid")}: ${stats.fullyPaid} · ${t("partially_paid")}: ${stats.partiallyPaid}` },
                    { dot: '#f59e0b', label: t("remaining_amount"), value: renderAmount(stats.remaining), sub: `${t("unpaid")}: ${stats.unpaid}` },
                  ].map(({ dot, label, value, sub }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '6.5pt', fontWeight: 700, color: dot, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                        {label}
                      </div>
                      <div style={{ fontSize: '11pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>{value}</div>
                      {sub && <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '3px' }}>{sub}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </TabPrintWrapper>
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

      {/* Bulk Void Invoices Dialog */}
      <Dialog
        open={bulkVoidOpen}
        title={t("bulk_void_invoices", "Void Selected Invoices")}
        desc={
          <div>
            <p>{t("bulk_void_invoices_confirm", `Void ${selectedInvoiceIds.size} selected invoice(s)?`)}</p>
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
        onConfirm={handleBulkVoidInvoices}
        danger
        busy={bulkVoiding}
      />

      {/* Unvoid Invoice Confirm Dialog */}
      <Dialog
        open={unvoidConfirmOpen}
        title={t("unvoid_invoice", "Restore Invoice")}
        desc={<p>{t("confirm_unvoid_invoice", "This will restore the invoice to active (unpaid) status. Previously voided payment allocations will not be restored automatically.")}</p>}
        confirmLabel={unvoidLoading ? t("restoring", "Restoring...") : t("unvoid", "Unvoid")}
        cancelLabel={t("cancel")}
        onClose={() => { if (!unvoidLoading) { setUnvoidConfirmOpen(false); setUnvoidingInvoiceId(null); } }}
        onConfirm={handleUnvoidInvoice}
        busy={unvoidLoading}
      />

      {/* Delete Invoice Confirm Dialog */}
      <Dialog
        open={deleteInvoiceOpen}
        title={t("delete_invoice", "Delete Invoice")}
        desc={<p>{t("confirm_delete_invoice", "This will permanently delete the invoice. This action cannot be undone.")}</p>}
        confirmLabel={deleteInvoiceLoading ? t("deleting", "Deleting...") : t("delete", "Delete")}
        cancelLabel={t("cancel")}
        onClose={() => { if (!deleteInvoiceLoading) { setDeleteInvoiceOpen(false); setDeletingInvoiceId(null); } }}
        onConfirm={handleDeleteInvoice}
        danger
        busy={deleteInvoiceLoading}
      />

    </div>
  );
});

export default InvoicesTab;
