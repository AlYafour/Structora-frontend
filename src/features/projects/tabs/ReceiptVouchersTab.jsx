import { useState, useEffect, useMemo, memo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useTranslation } from "react-i18next";
import { api } from "../../../services/api";
import { receiptVoucherApi } from "../../../services/receiptVouchers/receiptVoucherApi";
import { logger } from "../../../utils/logger";
import { formatMoney, formatDate } from "../../../utils/formatters";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import ActionMenu from "../../../components/common/ActionMenu";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import DirhamsIcon from "../../../components/common/DirhamsIcon";
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import { useNotifications } from "../../../contexts/NotificationContext";
import TabPrintWrapper from "../../../components/print/TabPrintWrapper";
import "./PaymentsTab.css";

const ReceiptVouchersTab = memo(function ReceiptVouchersTab({ projectId }) {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();

  const translatePurpose = (purpose) => {
    if (!purpose) return '-';
    const match = purpose.match(/^دفعة رقم (\d+)$/);
    if (match) return t('rv_purpose_payment_no', { number: match[1] });
    return purpose;
  };

  const renderAmount = (value) => {
    const str = formatMoney(value, { lang: i18n.language });
    if (i18n.language === 'en') {
      const numPart = str.replace(/AED\s?/, '').trim();
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{numPart} <DirhamsIcon size={10} color="#374151" /></span>;
    }
    return str;
  };
  const { success, error: showError } = useNotifications();

  const [showVat, setShowVat] = useState(false);
  const vatLabel = showVat ? t("including_vat") : t("excluding_vat");
  const vg = (val) => showVat ? val : val / 1.05;

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVoided, setShowVoided] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, voucher_number }
  const [isDeleting, setIsDeleting] = useState(false);

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: t("receipt_vouchers", "Receipt Vouchers"),
    pageStyle: `@page { size: A4 landscape; margin: 8mm; } html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }`,
  });

  const loadVouchers = (includeVoided = false) => {
    if (projectId) {
      setLoading(true);
      const url = includeVoided
        ? `projects/${projectId}/receipt-vouchers/?include_voided=true`
        : `projects/${projectId}/receipt-vouchers/`;
      api.get(url)
        .then(res => {
          const data = res.data;
          setVouchers(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          logger.error("Error loading receipt vouchers", err);
          setVouchers([]);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadVouchers(showVoided);
  }, [projectId, showVoided]);

  // Active vouchers only (for statistics)
  const activeVouchers = useMemo(() =>
    vouchers.filter(v => v.status !== 'voided'),
    [vouchers]
  );

  // Displayed vouchers
  const displayedVouchers = useMemo(() =>
    showVoided ? vouchers : activeVouchers,
    [vouchers, activeVouchers, showVoided]
  );

  // Sort by date descending
  const sortedVouchers = useMemo(() =>
    [...displayedVouchers].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [displayedVouchers]
  );

  // Stats (active only)
  const stats = useMemo(() => {
    const total = activeVouchers.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
    const withCredit = activeVouchers.filter(v => parseFloat(v.credit_remaining) > 0);
    const totalCreditRemaining = withCredit.reduce((sum, v) => sum + (parseFloat(v.credit_remaining) || 0), 0);
    return { count: activeVouchers.length, total, totalCreditRemaining };
  }, [activeVouchers]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await receiptVoucherApi.delete(projectId, deleteTarget.id);
      success(t("rv_deleted_success") || "تم حذف سند القبض");
      setDeleteTarget(null);
      loadVouchers(showVoided);
    } catch (err) {
      const msg = err?.message || t("delete_error");
      showError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="prj-tab-panel">
        <div className="prj-empty-state">{t("loading")}</div>
      </div>
    );
  }

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          <Button
            variant="ghost"
            onClick={() => setShowVoided(!showVoided)}
          >
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
          {sortedVouchers.length > 0 && (
            <button onClick={handlePrint} className="payments-tab__btn-outline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 17V3M6 11l6 6 6-6" />
                <path d="M4 21h16" />
              </svg>
              {t("download_pdf", "Download PDF")}
            </button>
          )}
        </div>
      </div>

      {sortedVouchers.length > 0 ? (
        <>
          {/* Summary */}
          <div className="prj-tab-section">
            <div className="prj-tab-section__title">{t("rv_tab_summary")}</div>
            <MetricGrid>
              <MetricCard variant="blue" icon="hash" label={t("rv_tab_total_vouchers")} value={stats.count} />
              <MetricCard
                tip={t(
                  "invoices_total_amount_tooltip",
                  "Includes VAT and excludes consultant fees."
                )}
                variant="emerald" icon="dollar" label={t("rv_tab_total_amount")} value={renderAmount(vg(stats.total))} sub={vatLabel} />
              {stats.totalCreditRemaining > 0 && (
                <MetricCard variant="violet" icon="creditCard" label={t("rv_tab_credit_remaining")} value={renderAmount(stats.totalCreditRemaining)} />
              )}
            </MetricGrid>
          </div>

          {/* Table */}
          <TabPrintWrapper ref={printRef} title={t("receipt_vouchers", "Receipt Vouchers")}>
          <div className="prj-table__wrapper">
            <table className="prj-table">
              <thead>
                <tr>
                  <th className="ds-text-center ds-w-60">#</th>
                  <th>{t("rv_tab_voucher_number")}</th>
                  <th>{t("rv_tab_date")}</th>
                  <th>{t("rv_tab_received_from")}</th>
                  <th className="ds-text-right">{t("rv_tab_amount")}</th>
                  <th>{t("rv_tab_purpose")}</th>
                  <th>{t("rv_tab_invoice")}</th>
                  <th>{t("rv_tab_credit")}</th>
                  <th className="ds-text-center">{t("status")}</th>
                  <th className="ds-w-60 ds-text-center">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedVouchers.map((v, i) => {
                  const creditRemaining = parseFloat(v.credit_remaining) || 0;
                  const creditDeducted = parseFloat(v.credit_deducted) || 0;
                  const isVoided = v.status === 'voided';
                  return (
                    <tr
                      key={v.id}
                      className={isVoided ? "prj-table__row--voided" : "ds-cursor-pointer"}
                      style={isVoided ? { opacity: 0.5 } : undefined}
                      onClick={() => navigate(`/receipt-vouchers/${v.id}/view?project=${projectId}`)}
                    >
                      <td className="ds-text-center ds-font-medium prj-table__index">{i + 1}</td>
                      <td>
                        <span className="prj-link" style={{ fontWeight: 600 }}>
                          {v.voucher_number}
                        </span>
                      </td>
                      <td className="prj-nowrap">{formatDate(v.date, i18n.language)}</td>
                      <td>{(i18n.language === 'en' ? (v.received_from_en || v.received_from) : v.received_from) || '-'}</td>
                      <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
                        {renderAmount(v.amount)}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', maxWidth: '200px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {translatePurpose(v.purpose)}
                        </span>
                      </td>
                      <td>{v.invoice_number || '-'}</td>
                      <td>
                        {creditRemaining > 0 && (
                          <span className="prj-badge prj-badge--purple">
                            {t("rv_tab_remaining")}: {renderAmount(creditRemaining)}
                          </span>
                        )}
                        {creditDeducted > 0 && v.credit_source_voucher_number && (
                          <span className="prj-badge prj-badge--warning" style={{ fontSize: '11px' }}>
                            {t("rv_tab_deducted_from")} {v.credit_source_voucher_number}
                          </span>
                        )}
                        {creditRemaining === 0 && creditDeducted === 0 && '-'}
                      </td>
                      <td className="ds-text-center">
                        {isVoided ? (
                          <span className="prj-badge prj-badge--muted">{t("voided")}</span>
                        ) : (
                          <span className="prj-badge prj-badge--success">{t("active")}</span>
                        )}
                      </td>
                      <td className="col-actions" onClick={e => e.stopPropagation()}>
                        <ActionMenu items={[
                          {
                            label: t("view"),
                            type: "button",
                            onClick: () => navigate(`/receipt-vouchers/${v.id}/view?project=${projectId}`),
                          },
                          {
                            label: t("delete"),
                            type: "button",
                            variant: "danger",
                            onClick: () => setDeleteTarget({ id: v.id, voucher_number: v.voucher_number }),
                          },
                        ]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                  <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.88rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {t("total")}
                  </td>
                  <td className="prj-nowrap ds-text-right" style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.92rem' }}>
                    {renderAmount(vg(stats.total))}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* Print-only summary */}
          <div className="tpw-print-only" style={{ marginTop: '16px' }}>
            <div style={{ border: '1.5px solid #d8c9b3', borderRadius: '10px', padding: '16px 20px', background: '#fff' }}>
              <div style={{ fontWeight: 800, fontSize: '11pt', color: '#17202f', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t("summary", "Summary")}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ padding: '10px 14px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: '7.5pt', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("rv_tab_total_vouchers")}</div>
                  <div style={{ fontSize: '14pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{stats.count}</div>
                </div>
                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '7.5pt', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("rv_tab_total_amount")}</div>
                  <div style={{ fontSize: '12pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{renderAmount(vg(stats.total))}</div>
                  <div style={{ fontSize: '7pt', color: '#64748b', marginTop: '2px' }}>{vatLabel}</div>
                </div>
                {stats.totalCreditRemaining > 0 && (
                  <div style={{ padding: '10px 14px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                    <div style={{ fontSize: '7.5pt', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t("rv_tab_credit_remaining")}</div>
                    <div style={{ fontSize: '12pt', fontWeight: 800, color: '#17202f', marginTop: '4px' }}>{renderAmount(stats.totalCreditRemaining)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </TabPrintWrapper>
        </>
      ) : (
        <div className="prj-empty-state">{t("rv_tab_no_vouchers")}</div>
      )}

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteTarget}
        title={t("confirm_delete")}
        desc={
          <>
            {t("confirm_delete_voucher") || "هل أنت متأكد من حذف سند القبض"}{" "}
            <strong className="ds-mx-1">{deleteTarget?.voucher_number}</strong>؟
            <br />
            {t("delete_cannot_undo")}
          </>
        }
        confirmLabel={isDeleting ? t("deleting") : t("delete")}
        cancelLabel={t("cancel")}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        danger
        busy={isDeleting}
      />
    </div>
  );
});

export default ReceiptVouchersTab;
