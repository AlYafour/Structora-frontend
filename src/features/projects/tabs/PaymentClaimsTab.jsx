import { useState, useMemo, memo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../contexts/NotificationContext";
import { paymentClaimApi } from "../../../services/paymentClaim";
import { logger } from "../../../utils/logger";
import { handleError } from "../../../utils/errorHandler";
import Button from "../../../components/common/Button";
import Dialog from "../../../components/common/Dialog";
import { formatMoney, formatDate } from "../../../utils/formatters";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import useTableSelection from "../hooks/useTableSelection";
import BulkActionsBar from "../../../components/common/BulkActionsBar";
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import { useAuth } from '../../../contexts/AuthContext';

const PaymentClaimsTab = memo(function PaymentClaimsTab({ projectId, onReload }) {
 const { t, i18n } = useTranslation();
 const { hasPermission, isAdmin } = useAuth();
 const canCreateClaim = isAdmin || hasPermission('financial.create');
 const { success, error: showError } = useNotifications();
 const navigate = useTenantNavigate();
 const showToast = (type, msg) => type === "success" ? success(msg) : showError(msg);

 // State management
 const [paymentClaims, setPaymentClaims] = useState([]);
 const [loading, setLoading] = useState(true);
 const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
 const [deletingClaimId, setDeletingClaimId] = useState(null);
 const [approvingClaimId, setApprovingClaimId] = useState(null);
 const [rejectingClaimId, setRejectingClaimId] = useState(null);
 const [submittingClaimId, setSubmittingClaimId] = useState(null);
 const [approveDialogOpen, setApproveDialogOpen] = useState(false);
 const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
 const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

 // Selection & bulk delete
 const {
 selectedIds: selectedClaims, setSelectedIds: setSelectedClaims,
 isAllSelected, isIndeterminate,
 handleSelect, handleSelectAll, clearSelection,
 bulkDeleteOpen, setBulkDeleteOpen, bulkDeleting,
 askBulkDelete, handleBulkDelete, selectAllRef,
 } = useTableSelection({
 items: paymentClaims,
 deleteApi: (id) => paymentClaimApi.deletePaymentClaim(projectId, id),
 onReload: async () => {
 const data = await paymentClaimApi.getPaymentClaims(projectId);
 setPaymentClaims(Array.isArray(data) ? data : (data?.results || []));
 if (onReload) onReload();
 },
 showToast,
 t,
 labels: { itemName: "payment claims", countKey: "payment_claims", context: "PaymentClaimsTab.handleBulkDelete" },
 });

 // Load payment claims
 useEffect(() => {
 const loadPaymentClaims = async () => {
 if (!projectId) return;
 try {
 setLoading(true);
 const data = await paymentClaimApi.getPaymentClaims(projectId);
 setPaymentClaims(Array.isArray(data) ? data : (data?.results || []));
 } catch (error) {
 handleError(error, 'PaymentClaimsTab.loadPaymentClaims');
 } finally {
 setLoading(false);
 }
 };
 loadPaymentClaims();
 }, [projectId, onReload]);

 // Payment Claims Statistics
 const claimsStats = useMemo(() => {
 if (!paymentClaims || paymentClaims.length === 0) {
 return { 
 total: 0,
 draft: 0,
 submitted: 0,
 approved: 0,
 rejected: 0,
 totalAmount: 0,
 };
 }
 
 const stats = {
 total: paymentClaims.length,
 draft: 0,
 submitted: 0,
 approved: 0,
 rejected: 0,
 totalAmount: 0,
 };

 paymentClaims.forEach(claim => {
 const status = claim.status || 'draft';
 if (Object.prototype.hasOwnProperty.call(stats, status)) {
 stats[status]++;
 }
 
 // Calculate total amount from claim totals
 if (claim.totals) {
 stats.totalAmount += parseFloat(claim.totals.total_amount || 0);
 }
 });
 
 return stats;
 }, [paymentClaims]);

 const handleAddPaymentClaim = () => {
 navigate(`/payment-claims/create?project=${projectId}`);
 };

 const handleEditPaymentClaim = (claim) => {
 navigate(`/payment-claims/${claim.id}/edit?project=${projectId}`);
 };

 const handleViewPaymentClaim = (claim) => {
 navigate(`/payment-claims/${claim.id}/view?project=${projectId}`);
 };

 const handleDeletePaymentClaim = async () => {
 if (!deletingClaimId) return;
 try {
 await paymentClaimApi.deletePaymentClaim(projectId, deletingClaimId);
 const deletedId = deletingClaimId;
 setDeleteConfirmOpen(false);
 setDeletingClaimId(null);
 setSelectedClaims(prev => {
 const newSet = new Set(prev);
 newSet.delete(deletedId);
 return newSet;
 });
 showToast("success", t("payment_claim_deleted"));
 // Reload
 const data = await paymentClaimApi.getPaymentClaims(projectId);
 setPaymentClaims(Array.isArray(data) ? data : (data?.results || []));
 if (onReload) onReload();
 } catch (error) {
 const handledError = handleError(error, 'PaymentClaimsTab.handleDeletePaymentClaim');
 logger.error("Error deleting payment claim", handledError);
 showToast("error", handledError.message || t("delete_error"));
 setDeletingClaimId(null);
 }
 };


 // Export PDF - Navigate to view page for PDF export
 const handleExportPDF = async (claim) => {
 try {
 // Navigate to payment claim view/edit page where PDF export can be implemented
 navigate(`/payment-claims/${claim.id}/edit?project=${projectId}&export=pdf`);
 } catch (error) {
 const handledError = handleError(error, 'PaymentClaimsTab.handleExportPDF');
 logger.error("Error exporting PDF", handledError);
 showToast("error", handledError.message || t("pdf_export_error"));
 }
 };

 // Submit payment claim for approval
 const handleSubmit = async () => {
 if (!submittingClaimId) return;
 try {
 await paymentClaimApi.submitPaymentClaim(projectId, submittingClaimId);
 setSubmitDialogOpen(false);
 setSubmittingClaimId(null);
 showToast("success", t("payment_claim_submitted"));
 // Reload
 const data = await paymentClaimApi.getPaymentClaims(projectId);
 setPaymentClaims(Array.isArray(data) ? data : (data?.results || []));
 if (onReload) onReload();
 } catch (error) {
 const handledError = handleError(error, 'PaymentClaimsTab.handleSubmit');
 logger.error("Error submitting payment claim", handledError);
 showToast("error", handledError.message || t("submit_error"));
 }
 };

 // Approve payment claim
 const handleApprove = async () => {
 if (!approvingClaimId) return;
 try {
 await paymentClaimApi.approvePaymentClaim(projectId, approvingClaimId);
 setApproveDialogOpen(false);
 setApprovingClaimId(null);
 showToast("success", t("payment_claim_approved"));
 // Reload
 const data = await paymentClaimApi.getPaymentClaims(projectId);
 setPaymentClaims(Array.isArray(data) ? data : (data?.results || []));
 if (onReload) onReload();
 } catch (error) {
 const handledError = handleError(error, 'PaymentClaimsTab.handleApprove');
 logger.error("Error approving payment claim", handledError);
 showToast("error", handledError.message || t("approve_error"));
 }
 };

 // Reject payment claim
 const handleReject = async () => {
 if (!rejectingClaimId) return;
 try {
 await paymentClaimApi.rejectPaymentClaim(projectId, rejectingClaimId);
 setRejectDialogOpen(false);
 setRejectingClaimId(null);
 showToast("success", t("payment_claim_rejected"));
 // Reload
 const data = await paymentClaimApi.getPaymentClaims(projectId);
 setPaymentClaims(Array.isArray(data) ? data : (data?.results || []));
 if (onReload) onReload();
 } catch (error) {
 const handledError = handleError(error, 'PaymentClaimsTab.handleReject');
 logger.error("Error rejecting payment claim", handledError);
 showToast("error", handledError.message || t("reject_error"));
 }
 };

 const getStatusBadgeClass = (status) => {
 const statusMap = {
 draft: "prj-badge--secondary",
 submitted: "prj-badge--info",
 approved: "prj-badge--success",
 rejected: "prj-badge--danger",
 };
 return statusMap[status] || "prj-badge--secondary";
 };

 const getStatusLabel = (status) => {
 const statusMap = {
 draft: t("draft"),
 submitted: t("submitted"),
 approved: t("approved"),
 rejected: t("rejected"),
 };
 return statusMap[status] || status;
 };

 if (loading) {
 return (
 <div className="prj-tab-panel">
 <div className="prj-loading">{t("loading")}</div>
 </div>
 );
 }

 return (
 <div className="prj-tab-panel">
 {/* Header with Actions */}
 <div className="prj-tab-header">
 <div className="prj-tab-actions">
 {canCreateClaim && (
 <Button
 variant="primary"
 size="md"
 onClick={handleAddPaymentClaim}
 >
 {t("add_payment_claim")}
 </Button>
 )}
 </div>
 </div>

 <BulkActionsBar
 selectedCount={selectedClaims.size}
 onClear={clearSelection}
 actions={[
 {
 label: bulkDeleting ? t("deleting") : t("delete_selected"),
 onClick: askBulkDelete,
 variant: "danger",
 disabled: bulkDeleting,
 },
 ]}
 />

 {/* Payment Claims Table */}
 {paymentClaims.length === 0 ? (
 <div className="prj-empty-state">
 {t("no_payment_claims")}
 </div>
 ) : (
 <>
 {/* Statistics */}
 <MetricGrid>
 <MetricCard variant="blue" icon="hash" label={t("total")} value={claimsStats.total} />
 <MetricCard variant="emerald" icon="dollar" label={t("total_amount")} value={formatMoney(claimsStats.totalAmount)} />
 </MetricGrid>

 <div className="prj-table__wrapper">
 <table className="prj-table">
 <thead>
 <tr>
 <th className="ds-text-center ds-w-50">
 <input
 type="checkbox"
 checked={isAllSelected}
 ref={selectAllRef}
 onChange={(e) => handleSelectAll(e.target.checked)}
 className="prj-checkbox"
 />
 </th>
 <th className="ds-text-center ds-w-60">#</th>
 <th>{t("claim_number")}</th>
 <th>{t("claim_date")}</th>
 <th>{t("status")}</th>
 <th className="ds-text-right">{t("total_amount")}</th>
 <th className="ds-text-right">{t("items_count")}</th>
 <th className="ds-text-center ds-w-200">{t("actions")}</th>
 </tr>
 </thead>
 <tbody>
 {paymentClaims.map((claim, i) => {
 const isSelected = selectedClaims.has(claim.id);
 const totalAmount = claim.totals?.total_amount || 0;
 const itemsCount = claim.items_count || claim.items?.length || 0;
 
 return (
 <tr key={claim.id} className={isSelected ? "is-selected" : ""} onClick={() => handleViewPaymentClaim(claim)}>
 <td className="ds-text-center" onClick={(e) => e.stopPropagation()}>
 <input
 type="checkbox"
 checked={isSelected}
 onChange={(e) => handleSelect(claim.id, e.target.checked)}
 className="prj-checkbox"
 />
 </td>
 <td className="ds-text-center ds-font-medium prj-table__index">
 {i + 1}
 </td>
 <td className="prj-nowrap">
 <strong>{claim.claim_number || `PC-${claim.id}`}</strong>
 </td>
 <td className="prj-nowrap">
 {formatDate(claim.claim_date, i18n.language)}
 </td>
 <td>
 <span className={`prj-badge ${getStatusBadgeClass(claim.status)}`}>
 {getStatusLabel(claim.status)}
 </span>
 </td>
 <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
 {formatMoney(totalAmount)}
 </td>
 <td className="ds-text-right">
 {itemsCount}
 </td>
 <td className="ds-text-center" onClick={(e) => e.stopPropagation()}>
 <div className="prj-tab-action-buttons">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleEditPaymentClaim(claim)}
 disabled={claim.status === 'approved'}
 >
 {t("edit")}
 </Button>
 {claim.status === 'draft' && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setSubmittingClaimId(claim.id);
 setSubmitDialogOpen(true);
 }}
 >
 {t("submit_for_approval")}
 </Button>
 )}
 {(claim.status === 'draft' || claim.status === 'submitted') && (
 <>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setApprovingClaimId(claim.id);
 setApproveDialogOpen(true);
 }}
 >
 {t("approve")}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setRejectingClaimId(claim.id);
 setRejectDialogOpen(true);
 }}
 >
 {t("reject")}
 </Button>
 </>
 )}
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleExportPDF(claim)}
 >
 {t("export_pdf")}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setDeletingClaimId(claim.id);
 setDeleteConfirmOpen(true);
 }}
 disabled={claim.status === 'approved'}
 >
 {t("delete")}
 </Button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </>
 )}

 {/* Delete Confirmation Dialog */}
 <Dialog
 open={deleteConfirmOpen}
 onClose={() => {
 if (!deletingClaimId) {
 setDeleteConfirmOpen(false);
 setDeletingClaimId(null);
 }
 }}
 onConfirm={handleDeletePaymentClaim}
 title={t("confirm_delete")}
 confirmLabel={deletingClaimId ? t("deleting") : t("delete")}
 cancelLabel={t("cancel")}
 danger
 busy={!!deletingClaimId}
 >
 <p>{t("confirm_delete_payment_claim")}</p>
 </Dialog>

 {/* Bulk Delete Confirmation Dialog */}
 <Dialog
 open={bulkDeleteOpen}
 onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
 onConfirm={handleBulkDelete}
 title={t("confirm_bulk_delete")}
 confirmLabel={bulkDeleting ? t("deleting") : t("delete")}
 cancelLabel={t("cancel")}
 danger
 busy={bulkDeleting}
 >
 <p>
 {t("confirm_bulk_delete_payment_claims", { count: selectedClaims.size })}
 </p>
 </Dialog>

 {/* Submit Dialog */}
 <Dialog
 open={submitDialogOpen}
 onClose={() => {
 setSubmitDialogOpen(false);
 setSubmittingClaimId(null);
 }}
 title={t("submit_for_approval")}
 actions={
 <>
 <Button
 variant="secondary"
 onClick={() => {
 setSubmitDialogOpen(false);
 setSubmittingClaimId(null);
 }}
 >
 {t("cancel")}
 </Button>
 <Button
 variant="primary"
 onClick={handleSubmit}
 >
 {t("submit")}
 </Button>
 </>
 }
 >
 <p>{t("confirm_submit_payment_claim")}</p>
 </Dialog>

 {/* Approve Dialog */}
 <Dialog
 open={approveDialogOpen}
 onClose={() => {
 setApproveDialogOpen(false);
 setApprovingClaimId(null);
 }}
 title={t("approve")}
 actions={
 <>
 <Button
 variant="secondary"
 onClick={() => {
 setApproveDialogOpen(false);
 setApprovingClaimId(null);
 }}
 >
 {t("cancel")}
 </Button>
 <Button
 variant="success"
 onClick={handleApprove}
 >
 {t("approve")}
 </Button>
 </>
 }
 >
 <p>{t("confirm_approve_payment_claim")}</p>
 </Dialog>

 {/* Reject Dialog */}
 <Dialog
 open={rejectDialogOpen}
 onClose={() => {
 setRejectDialogOpen(false);
 setRejectingClaimId(null);
 }}
 title={t("reject")}
 actions={
 <>
 <Button
 variant="secondary"
 onClick={() => {
 setRejectDialogOpen(false);
 setRejectingClaimId(null);
 }}
 >
 {t("cancel")}
 </Button>
 <Button
 variant="danger"
 onClick={handleReject}
 >
 {t("reject")}
 </Button>
 </>
 }
 >
 <p>{t("confirm_reject_payment_claim")}</p>
 </Dialog>

 </div>
 );
});

export default PaymentClaimsTab;
