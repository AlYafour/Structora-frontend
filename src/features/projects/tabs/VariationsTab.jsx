import { useState, useMemo, memo } from "react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../../contexts/NotificationContext";
import { projectApi } from "../../../services/projects";
import { logger } from "../../../utils/logger";
import { handleError } from "../../../utils/errorHandler";
import Button from "../../../components/common/Button";
import ActionMenu from "../../../components/common/ActionMenu";
import Dialog from "../../../components/common/Dialog";
import { formatMoney } from "../../../utils/formatters";
import { MetricCard, MetricGrid } from "../../../components/common/MetricCard";
import { getApprovalStatusConfig, getApprovalStatusLabel } from "../../../utils/ui/status";

// Map status → prj-badge CSS class
const getStatusBadgeClass = (status) => {
 const s = status || 'draft';
 if (s === 'final_approved' || s === 'approved') return 'prj-badge--success';
 if (s.includes('rejected') || s === 'rejected') return 'prj-badge--danger';
 if (s.includes('pending') || s === 'pending') return 'prj-badge--warning';
 if (s.includes('delete')) return 'prj-badge--danger';
 return 'prj-badge--secondary';
};
import { useAuth } from "../../../contexts/AuthContext";
import useTableSelection from "../hooks/useTableSelection";
import BulkActionsBar from "../../../components/common/BulkActionsBar";
import "./VariationsTab.css";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

const VariationsTab = memo(function VariationsTab({ projectId, variations, onReload }) {
 const { t, i18n } = useTranslation();
 const { success, error: showError } = useNotifications();
 const { user } = useAuth();
 const navigate = useTenantNavigate();
 const isAR = i18n.language === "ar";

 // Determine user type
 const isProjectManager = user?.role?.name === 'Manager';
 const isCompanySuperAdmin = user?.role?.name === 'company_super_admin';
 const isSuperAdmin = user?.is_superuser;
 const isGeneralManager = isCompanySuperAdmin || isSuperAdmin;
 const canApproveVariations = isGeneralManager || isProjectManager;
 // Super user can reject in any status
 const canRejectAnyStatus = isGeneralManager || isSuperAdmin;

 // State management
 const [variationStatusFilter, setVariationStatusFilter] = useState("");
 const [approvingVariationId, setApprovingVariationId] = useState(null);
 const [cancellingVariationId, setCancellingVariationId] = useState(null);
 const [rejectingVariationId, setRejectingVariationId] = useState(null);
 const [revokingVariationId, setRevokingVariationId] = useState(null);
 const [approveVariationConfirmOpen, setApproveVariationConfirmOpen] = useState(false);
 const [cancelVariationConfirmOpen, setCancelVariationConfirmOpen] = useState(false);
 const [rejectVariationConfirmOpen, setRejectVariationConfirmOpen] = useState(false);
 const [actionVariation, setActionVariation] = useState(null);
 const [rejectionReason, setRejectionReason] = useState("");
 const [bulkApproveVariationsConfirmOpen, setBulkApproveVariationsConfirmOpen] = useState(false);
 const [bulkRejectVariationsConfirmOpen, setBulkRejectVariationsConfirmOpen] = useState(false);
 const [bulkApprovingVariations, setBulkApprovingVariations] = useState(false);
 const [bulkRejectingVariations, setBulkRejectingVariations] = useState(false);
 const [deleteVariationsConfirmOpen, setDeleteVariationsConfirmOpen] = useState(false);
 const [deletingVariations, setDeletingVariations] = useState(false);

 // Get variation status
 const getVariationStatus = (variation) => {
 // Priority: workflow_status then status
 return variation.workflow_status || variation.status || 'draft';
 };

 // Check if the variation order requires editing before approval/rejection
 const checkRequiresEdit = (variation) => {
 const status = getVariationStatus(variation);
 return status === 'requires_edit';
 };

 // Filter variations by status
 const filteredVariations = useMemo(() => {
 if (!variations) return [];
 return variations.filter(v => {
 if (!variationStatusFilter) return true;
 const status = getVariationStatus(v);
 if (variationStatusFilter === 'approved') {
 return status === 'approved' || status === 'final_approved';
 } else if (variationStatusFilter === 'rejected') {
 return status?.includes('rejected') || status === 'rejected';
 } else if (variationStatusFilter === 'pending') {
 return status?.includes('pending') || status === 'pending' || status === 'draft';
 }
 return true;
 });
 }, [variations, variationStatusFilter]);

 // Selection (using shared hook - selection only, bulk ops handled locally)
 const {
 selectedIds: selectedVariationIds, setSelectedIds: setSelectedVariationIds,
 handleSelect: handleSelectVariation, handleSelectAll, clearSelection,
 isAllSelected, selectAllRef,
 } = useTableSelection({
 items: filteredVariations,
 deleteApi: () => {},
 onReload,
 showToast: () => {},
 t,
 });

 // Variation statistics
 const variationStats = useMemo(() => {
 if (!variations) return { total: 0, approved: 0, rejected: 0, pending: 0, totalAmount: 0 };
 
 const approved = variations.filter(v => {
 const status = getVariationStatus(v);
 return status === 'approved' || status === 'final_approved';
 });
 const rejected = variations.filter(v => {
 const status = getVariationStatus(v);
 return status?.includes('rejected') || status === 'rejected';
 });
 const pending = variations.filter(v => {
 const status = getVariationStatus(v);
 return status?.includes('pending') || status === 'pending' || status === 'draft';
 });
 
 // Total approved variations amount (excluding VAT)
 // Uses the computed `total_amount` field from the variation order model
 const totalAmount = approved.reduce((sum, v) => {
 const totalForVariation = parseFloat(v.total_amount || v.final_amount || 0);
 return sum + (isNaN(totalForVariation) ? 0 : totalForVariation);
 }, 0);
 
 return {
 total: variations.length,
 approved: approved.length,
 rejected: rejected.length,
 pending: pending.length,
 totalAmount
 };
 }, [variations]);

 const showToast = (type, msg) => type === "success" ? success(msg) : showError(msg);

 // Handle individual approval
 const askApproveVariation = (variation) => {
 setActionVariation(variation);
 setApproveVariationConfirmOpen(true);
 };

 const handleApproveVariation = async () => {
 if (!actionVariation?.id || !projectId) return;
 
 // Professional Workflow: verify that approval requires editing first
 if (checkRequiresEdit(actionVariation)) {
 showToast("error", t("must_edit_before_approval"));
 return;
 }

 try {
 setApprovingVariationId(actionVariation.id);
 await projectApi.approveVariation(projectId, actionVariation.id);
 onReload();
 showToast("success", t("variation_approved"));
 setApproveVariationConfirmOpen(false);
 setActionVariation(null);
 } catch (error) {
 const handledError = handleError(error, 'VariationsTab.handleApproveVariation');
 let errorMessage = handledError.message || t("approve_error");
 // Improve error message if editing is required
 if (errorMessage.includes("must be edited first") || errorMessage.includes("requires_edit")) {
 errorMessage = t("must_edit_before_approval");
 }
 showToast("error", errorMessage);
 } finally {
 setApprovingVariationId(null);
 }
 };

 // Handle individual cancellation
 const askCancelVariation = (variation) => {
 setActionVariation(variation);
 setCancelVariationConfirmOpen(true);
 };

 const handleCancelVariation = async () => {
 if (!actionVariation?.id || !projectId) return;
 
 try {
 setCancellingVariationId(actionVariation.id);
 await projectApi.rejectVariation(projectId, actionVariation.id, t("cancelled_by_manager"));
 onReload();
 showToast("success", t("variation_cancelled"));
 setCancelVariationConfirmOpen(false);
 setActionVariation(null);
 } catch (error) {
 const handledError = handleError(error, 'VariationsTab.handleCancelVariation');
 showToast("error", handledError.message || t("cancel_error"));
 } finally {
 setCancellingVariationId(null);
 }
 };

 // Handle individual rejection
 const askRejectVariation = (variation) => {
 setActionVariation(variation);
 setRejectionReason("");
 setRejectVariationConfirmOpen(true);
 };

 const handleRejectVariation = async () => {
 if (!actionVariation?.id || !projectId) return;
 
 // Professional Workflow: verify that rejection requires editing first
 if (checkRequiresEdit(actionVariation)) {
 showToast("error", t("must_edit_before_approval"));
 return;
 }

 // Validate rejection reason is provided
 if (!rejectionReason || !rejectionReason.trim()) {
 showToast("error", t("rejection_reason_required"));
 return;
 }

 // Block rejection of finally-approved variations for everyone
 const workflowStatus = actionVariation.workflow_status || actionVariation.status || '';
 if (workflowStatus === 'approved' || workflowStatus === 'final_approved') {
 showToast("error", t("cannot_reject_approved_variation", "لا يمكن رفض أمر تغيير معتمد نهائياً"));
 return;
 }

 // Verify rejection is possible before submission (except for super user)
 if (!canRejectAnyStatus) {
 if (workflowStatus === 'pending_project_manager') {
 showToast("error", t("cannot_reject_pending_project_manager"));
 return;
 }
 }
 
 try {
 setRejectingVariationId(actionVariation.id);
 await projectApi.rejectVariation(projectId, actionVariation.id, rejectionReason.trim());
 onReload();
 showToast("success", t("variation_rejected"));
 setRejectVariationConfirmOpen(false);
 setActionVariation(null);
 setRejectionReason("");
 } catch (error) {
 const handledError = handleError(error, 'VariationsTab.handleRejectVariation');
 // Improve error message for clarity
 let errorMessage = handledError.message || t("reject_error");
 if (errorMessage.includes("cannot be rejected in current status")) {
 errorMessage = t("cannot_reject_current_status");
 }
 showToast("error", errorMessage);
 } finally {
 setRejectingVariationId(null);
 }
 };

 // Handle revoke approval
 const handleRevokeApproval = async (variation) => {
 if (!variation?.id || !projectId) return;
 try {
 setRevokingVariationId(variation.id);
 await projectApi.revokeVariationApproval(projectId, variation.id);
 success(t('variation_approval_revoked', 'تم إلغاء الاعتماد — يمكن إعادة الاعتماد الآن'));
 onReload();
 } catch (e) {
 showError(t('error_generic', 'حدث خطأ'));
 } finally {
 setRevokingVariationId(null);
 }
 };

 // Handle bulk rejection
 const askBulkRejectVariations = () => {
 if (selectedVariationIds.size === 0) return;
 setRejectionReason("");
 setBulkRejectVariationsConfirmOpen(true);
 };

 const handleBulkRejectVariations = async () => {
 if (selectedVariationIds.size === 0) return;
 
 // Validate rejection reason is provided
 if (!rejectionReason || !rejectionReason.trim()) {
 showToast("error", t("rejection_reason_required"));
 return;
 }

 // Block rejection of finally-approved variations for everyone
 const variationsToReject = filteredVariations.filter(v => selectedVariationIds.has(v.id));
 const alreadyApproved = variationsToReject.filter(v => {
 const st = v.workflow_status || v.status || '';
 return st === 'approved' || st === 'final_approved';
 });
 if (alreadyApproved.length > 0) {
 showToast("error", t("cannot_reject_approved_variation", "لا يمكن رفض أمر تغيير معتمد نهائياً"));
 return;
 }

 // Verify all selected orders can be rejected (except for super user)
 if (!canRejectAnyStatus) {
 const cannotReject = variationsToReject.filter(v => {
 const workflowStatus = v.workflow_status || v.status || '';
 return workflowStatus === 'pending_project_manager';
 });
 if (cannotReject.length > 0) {
 showToast("error", t("some_variations_cannot_be_rejected"));
 return;
 }
 }
 
 setBulkRejectingVariations(true);
 const ids = Array.from(selectedVariationIds);
 let ok = 0, fail = 0;
 const errors = [];
 
 for (const id of ids) {
 try {
 await projectApi.rejectVariation(projectId, id, rejectionReason.trim());
 ok += 1;
 } catch (e) {
 fail += 1;
 const handledError = handleError(e, 'VariationsTab.handleBulkRejectVariations');
 if (handledError.message.includes("cannot be rejected in current status")) {
 errors.push(t("cannot_reject_current_status"));
 }
 }
 }
 
 onReload();
 clearSelection();
 setBulkRejectingVariations(false);
 setBulkRejectVariationsConfirmOpen(false);
 setRejectionReason("");
 
 if (fail === 0) {
 showToast("success", t("bulk_reject_success")?.replace("{{count}}", ok));
 } else if (ok === 0) {
 const errorMsg = errors.length > 0 ? errors[0] : t("bulk_reject_error");
 showToast("error", errorMsg);
 } else {
 showToast("error", t("bulk_reject_partial")?.replace("{{ok}}", ok).replace("{{fail}}", fail));
 }
 };

 // Handle bulk approval
 const askBulkApproveVariations = () => {
 if (selectedVariationIds.size === 0) return;
 setBulkApproveVariationsConfirmOpen(true);
 };

 const handleBulkApproveVariations = async () => {
 if (selectedVariationIds.size === 0) return;
 setBulkApprovingVariations(true);
 const ids = Array.from(selectedVariationIds);
 let ok = 0, fail = 0;
 
 for (const id of ids) {
 try {
 await projectApi.approveVariation(projectId, id);
 ok += 1;
 } catch (e) {
 fail += 1;
 }
 }
 
 onReload();
 clearSelection();
 setBulkApprovingVariations(false);
 setBulkApproveVariationsConfirmOpen(false);
 
 if (fail === 0) {
 showToast("success", t("bulk_approve_success")?.replace("{{count}}", ok));
 } else if (ok === 0) {
 showToast("error", t("bulk_approve_error"));
 } else {
 showToast("error", t("bulk_approve_partial")?.replace("{{ok}}", ok).replace("{{fail}}", fail));
 }
 };

 // Handle delete variations
 const handleDeleteVariations = async () => {
 if (selectedVariationIds.size === 0) return;
 
 setDeletingVariations(true);
 try {
 const ids = Array.from(selectedVariationIds);
 let successCount = 0;
 let failCount = 0;

 for (const id of ids) {
 try {
 await projectApi.deleteVariation(projectId, id);
 successCount++;
 } catch (e) {
 logger.error(`Error deleting variation ${id}`, e);
 failCount++;
 }
 }

 if (successCount > 0) {
 clearSelection();
 onReload();
 showToast("success", t("variations_deleted"));
 }
 
 if (failCount > 0) {
 showToast("error", t("some_variations_delete_failed"));
 }

 setDeleteVariationsConfirmOpen(false);
 } catch (e) {
 logger.error("Error deleting variations", e);
 showToast("error", e?.response?.data?.detail || e?.response?.data?.message || t("delete_error"));
 } finally {
 setDeletingVariations(false);
 }
 };

 // Check if approval/cancellation is possible
 const canApproveThisVariation = (variation) => {
 if (!canApproveVariations) return false;
 const status = getVariationStatus(variation);
 // Professional Workflow: prevent approval if rejected (must edit first)
 if (status === 'rejected_by_project_manager' || status === 'rejected_by_general_manager' || status === 'rejected') {
 return false;
 }
 return status !== 'approved' && status !== 'final_approved' && !variation?.general_manager_final_approved_by;
 };

 const canCancelThisVariation = (variation) => {
 if (!canApproveVariations) return false;
 const status = getVariationStatus(variation);
 return status !== 'approved' && status !== 'final_approved' && !status?.includes('rejected');
 };

 const canRejectThisVariation = (variation) => {
 if (!canApproveVariations) return false;
 
 const status = getVariationStatus(variation);
 
 // Professional Workflow: prevent rejection if already rejected (must edit first)
 // Even super user must edit first before re-rejecting
 if (status === 'rejected_by_project_manager' || status === 'rejected_by_general_manager' || status === 'rejected') {
 return false;
 }
 
 // Super user (company super admin) can reject in any status (except finally approved)
 if (canRejectAnyStatus) {
 return status !== 'final_approved' && status !== 'approved';
 }
 
 // Regular users
 const workflowStatus = variation.workflow_status || variation.status || '';
 
 // Cannot reject in the following states:
 // - Finally approved
 // - Already rejected
 if (status === 'approved' || status === 'final_approved' || status === 'rejected') {
 return false;
 }
 
 // Check workflow_status - some states do not allow rejection
 // Per backend rules, pending_project_manager cannot be rejected directly
 // Must approve first or wait for another state
 if (workflowStatus === 'pending_project_manager') {
 // Can only reject if the user is the Project Manager
 // But the backend rejects this, so we hide the button in this case
 return false; // Backend does not allow rejection in this state
 }
 
 // Can reject in other states (draft, pending, etc.)
 return true;
 };

 return (
 <div className="prj-tab-panel">
 <div className="prj-tab-header">
 <div className="prj-tab-actions">
 <Button
 as={Link}
 to={`/projects/${projectId}/variations/notice`}
 variant="primary"
 size="md"
 >
 {t("add_variation")}
 </Button>
 </div>
 </div>

 <BulkActionsBar
 selectedCount={selectedVariationIds.size}
 onClear={clearSelection}
 actions={[
 ...(canApproveVariations ? [
 {
 label: bulkApprovingVariations ? t("approving") : t("approve_selected"),
 onClick: askBulkApproveVariations,
 variant: "primary",
 disabled: bulkApprovingVariations || bulkRejectingVariations || deletingVariations,
 },
 {
 label: bulkRejectingVariations ? t("rejecting") : t("reject_selected"),
 onClick: askBulkRejectVariations,
 variant: "danger",
 disabled: bulkApprovingVariations || bulkRejectingVariations || deletingVariations,
 },
 ] : []),
 {
 label: t("delete"),
 onClick: () => setDeleteVariationsConfirmOpen(true),
 variant: "danger",
 disabled: deletingVariations || bulkApprovingVariations || bulkRejectingVariations,
 },
 ]}
 />
 {variations && variations.length > 0 ? (
 <>
 {/* Statistics Cards */}
 <MetricGrid columns={4}>
 <MetricCard variant="blue" icon="dollar" label={t("total")} value={formatMoney(variationStats.totalAmount)} />
 <MetricCard variant="emerald" icon="check" label={t("approved")} value={variationStats.approved} />
 <MetricCard variant="amber" icon="clock" label={t("pending")} value={variationStats.pending} />
 <MetricCard variant="danger" icon="x" label={t("cancelled")} value={variationStats.rejected} />
 </MetricGrid>

 {/* Status Filter */}
 <div className="prj-tab-filter ds-mb-4">
 <select
 className="prj-input"
 value={variationStatusFilter}
 onChange={(e) => setVariationStatusFilter(e.target.value)}
 >
 <option value="">{t("all_statuses")}</option>
 <option value="approved">{t("approved")}</option>
 <option value="pending">{t("pending")}</option>
 <option value="rejected">{t("cancelled")}</option>
 </select>
 {variationStatusFilter && (
 <Button variant="ghost" size="sm" onClick={() => setVariationStatusFilter("")}>
 {t("clear_filter")}
 </Button>
 )}
 </div>
 <div className="prj-table__wrapper">
 <table className="prj-table">
 <thead>
 <tr>
 <th className="ds-text-center ds-w-50">
 <input
 type="checkbox"
 aria-label={t("select_all")}
 checked={isAllSelected}
 ref={selectAllRef}
 onChange={(e) => handleSelectAll(e.target.checked)}
 className="prj-checkbox"
 />
 </th>
 <th className="ds-text-center ds-w-60">#</th>
 <th>{t("variation_number")}</th>
 <th className="ds-min-w-200">{t("variation_description")}</th>
 <th>{t("status")}</th>
 <th className="ds-text-right">{t("amount")}</th>
 <th className="ds-w-60 ds-text-center">{t("action")}</th>
 </tr>
 </thead>
 <tbody>
 {filteredVariations.map((variation, i) => {
 const isSelected = selectedVariationIds.has(variation.id);
 const status = getVariationStatus(variation);
 const statusConfig = getApprovalStatusConfig(status);
 const statusLabel = getApprovalStatusLabel(status, isAR ? 'ar' : 'en');
 const canApproveThis = canApproveThisVariation(variation);
 const canCancelThis = canCancelThisVariation(variation);
 const canRejectThis = canRejectThisVariation(variation);
 
 // Extract variation description and reference_no from JSON if available
 let variationDescription = "";
 let referenceNo = null;
 if (variation.description) {
 try {
 const parsed = JSON.parse(variation.description);
 variationDescription = parsed.variation_description || "";
 referenceNo = parsed.reference_no || null;
 } catch (e) {
 // If not JSON, use description as-is
 variationDescription = variation.description;
 }
 }
 
 // Use reference_no if available, otherwise fallback to variation_number
 const displayNumber = referenceNo || variation.variation_number || variation.modification_number || `VAR-${variation.id}`;
 
 return (
 <tr key={variation.id} className={isSelected ? "is-selected" : ""} onClick={() => navigate(`/variations/${variation.id}/view?project=${projectId}`)}>
 <td className="ds-text-center" onClick={(e) => e.stopPropagation()}>
 <input
 type="checkbox"
 checked={isSelected}
 onChange={(e) => handleSelectVariation(variation.id, e.target.checked)}
 className="prj-checkbox"
 />
 </td>
 <td className="ds-text-center ds-font-medium prj-table__index">
 {i + 1}
 </td>
 <td>
 <span className="prj-code">
 {displayNumber}
 </span>
 </td>
 <td className="variations-tab__description-cell">
 <span className="ds-table__cell-text" title={variationDescription}>
 {variationDescription || "-"}
 </span>
 </td>
 <td>
 <span className={`prj-badge ${getStatusBadgeClass(status)}`} title={statusLabel}>
 {statusConfig.badge || statusLabel}
 </span>
 </td>
 <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
 {formatMoney(parseFloat(variation.total_amount || variation.final_amount || 0))}
 </td>
 <td className="col-actions" onClick={(e) => e.stopPropagation()}>
 <ActionMenu items={[
 { label: t("edit"), to: `/variations/${variation.id}/notice`, type: "link" },
 ...(canApproveThis ? [{ label: t("approve"), type: "button", variant: "success", onClick: () => askApproveVariation(variation), disabled: !!approvingVariationId }] : []),
 ...(canRejectThis ? [{ label: t("reject"), type: "button", variant: "danger", onClick: () => askRejectVariation(variation), disabled: !!rejectingVariationId }] : []),
 ...(isGeneralManager && (status === 'approved' || status === 'final_approved') ? [{ label: t("revoke_approval", "إلغاء الاعتماد"), type: "button", variant: "warning", onClick: () => handleRevokeApproval(variation), disabled: revokingVariationId === variation.id }] : []),
 { label: t("download_pdf"), to: `/variations/${variation.id}/view?project=${projectId}`, type: "link", target: "_blank" },
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
 <div className="prj-empty-state">
 {t("no_variations")}
 </div>
 )}

 {/* Dialogs */}
 <Dialog
 open={approveVariationConfirmOpen}
 title={t("approve_variation")}
 desc={t("approve_variation_confirmation")}
 confirmLabel={approvingVariationId ? t("approving") : t("approve")}
 cancelLabel={t("cancel")}
 onClose={() => !approvingVariationId && setApproveVariationConfirmOpen(false)}
 onConfirm={handleApproveVariation}
 busy={!!approvingVariationId}
 />

 <Dialog
 open={cancelVariationConfirmOpen}
 title={t("cancel_variation")}
 desc={t("cancel_variation_confirmation")}
 confirmLabel={cancellingVariationId ? t("cancelling") : t("cancel")}
 cancelLabel={t("cancel")}
 onClose={() => !cancellingVariationId && setCancelVariationConfirmOpen(false)}
 onConfirm={handleCancelVariation}
 danger
 busy={!!cancellingVariationId}
 />

 {/* Individual Rejection Dialog */}
 <Dialog
 open={rejectVariationConfirmOpen}
 title={t("reject_variation")}
 desc={
 <div>
 <p className="ds-mb-3">
 {t("reject_project_manager_confirmation")}
 </p>
 <textarea
 className="prj-input ds-w-full ds-mt-2"
 rows={4}
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder={t("rejection_reason_placeholder")}
 required
 />
 </div>
 }
 confirmLabel={rejectingVariationId ? t("rejecting") : t("reject")}
 cancelLabel={t("cancel")}
 onClose={() => {
 if (!rejectingVariationId) {
 setRejectVariationConfirmOpen(false);
 setRejectionReason("");
 setActionVariation(null);
 }
 }}
 onConfirm={handleRejectVariation}
 danger
 busy={!!rejectingVariationId}
 />

 {/* Bulk Rejection Dialog */}
 <Dialog
 open={bulkRejectVariationsConfirmOpen}
 title={t("bulk_reject")}
 desc={
 <div>
 <p className="ds-mb-3">
 {t("bulk_reject_confirmation")} <strong>{selectedVariationIds.size}</strong> {t("variations_count")}؟
 </p>
 <p className="ds-mb-2 ds-text-sm ds-text-muted">
 {t("rejection_reason_required")}
 </p>
 <textarea
 className="prj-input ds-w-full ds-mt-2"
 rows={4}
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder={t("rejection_reason_placeholder")}
 required
 />
 </div>
 }
 confirmLabel={bulkRejectingVariations ? t("rejecting") : t("reject_selected")}
 cancelLabel={t("cancel")}
 onClose={() => {
 if (!bulkRejectingVariations) {
 setBulkRejectVariationsConfirmOpen(false);
 setRejectionReason("");
 }
 }}
 onConfirm={handleBulkRejectVariations}
 danger
 busy={bulkRejectingVariations}
 />

 <Dialog
 open={bulkApproveVariationsConfirmOpen}
 title={t("bulk_approve")}
 desc={
 <>
 {t("bulk_approve_confirmation")} <strong>{selectedVariationIds.size}</strong> {t("variations_count")}؟
 </>
 }
 confirmLabel={bulkApprovingVariations ? t("approving") : t("approve_selected")}
 cancelLabel={t("cancel")}
 onClose={() => !bulkApprovingVariations && setBulkApproveVariationsConfirmOpen(false)}
 onConfirm={handleBulkApproveVariations}
 busy={bulkApprovingVariations}
 />

 <Dialog
 open={deleteVariationsConfirmOpen}
 title={t("delete_variations")}
 desc={
 <div>
 <p>
 {t("confirm_delete_variations", { count: selectedVariationIds.size })}
 </p>
 <p className="ds-mt-2 ds-text-sm ds-text-muted">
 {t("delete_warning")}
 </p>
 </div>
 }
 confirmLabel={t("delete")}
 cancelLabel={t("cancel")}
 onClose={() => !deletingVariations && setDeleteVariationsConfirmOpen(false)}
 onConfirm={handleDeleteVariations}
 busy={deletingVariations}
 danger
 />
 </div>
 );
});

export default VariationsTab;
