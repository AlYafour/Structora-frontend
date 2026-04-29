import { useState, useEffect, useMemo, memo } from "react";
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

const ReceiptVouchersTab = memo(function ReceiptVouchersTab({ projectId }) {
 const { t, i18n } = useTranslation();
 const navigate = useTenantNavigate();

 const renderAmount = (value) => {
  const str = formatMoney(value, { lang: i18n.language });
  if (i18n.language === 'en') {
   const numPart = str.replace(/AED\s?/, '').trim();
   return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{numPart} <DirhamsIcon size={10} color="#374151" /></span>;
  }
  return str;
 };
 const { success, error: showError } = useNotifications();

 const [vouchers, setVouchers] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showVoided, setShowVoided] = useState(false);

 // Delete state
 const [deleteTarget, setDeleteTarget] = useState(null); // { id, voucher_number }
 const [isDeleting, setIsDeleting] = useState(false);

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
   const msg = err?.response?.data?.error || err?.message || t("delete_error");
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
    </div>
   </div>

   {sortedVouchers.length > 0 ? (
    <>
     {/* Summary */}
     <div className="prj-tab-section">
      <div className="prj-tab-section__title">{t("rv_tab_summary")}</div>
      <MetricGrid>
       <MetricCard variant="blue" icon="hash" label={t("rv_tab_total_vouchers")} value={stats.count} />
       <MetricCard variant="emerald" icon="dollar" label={t("rv_tab_total_amount")} value={renderAmount(stats.total)} />
       {stats.totalCreditRemaining > 0 && (
        <MetricCard variant="violet" icon="creditCard" label={t("rv_tab_credit_remaining")} value={renderAmount(stats.totalCreditRemaining)} />
       )}
      </MetricGrid>
     </div>

     {/* Table */}
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
           <td>{(i18n.language === 'ar' ? (v.received_from_ar || v.received_from) : (v.received_from_en || v.received_from)) || '-'}</td>
           <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
            {renderAmount(v.amount)}
           </td>
           <td>
            <span style={{ fontSize: '13px', maxWidth: '200px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
             {v.purpose || '-'}
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
      </table>
     </div>
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
