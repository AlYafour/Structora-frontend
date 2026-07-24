import { useState, useMemo, memo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Link } from "react-router-dom";
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
import { getApprovalStatusLabel } from "../../../utils/ui/status";
import DirhamsIcon from "../../../components/common/DirhamsIcon";
import { useAuth } from "../../../contexts/AuthContext";
import useTableSelection from "../hooks/useTableSelection";
import BulkActionsBar from "../../../components/common/BulkActionsBar";
import "./VariationsTab.css";
import TabPrintWrapper from "../../../components/print/TabPrintWrapper";
import useTenantNavigate from "../../../hooks/useTenantNavigate";
import { useDownloadVariationPDFs } from "../../../hooks/useDownloadVariationPDFs";
import DownloadAllButton from "../../../components/common/DownloadAllButton";
import { getVariationTotalAmount } from "../entries/variations/utils/variationAmount";
import VariationPrintDocument from "../entries/variations/components/VariationPrintDocument";
import { exportVariationPdf } from "../entries/variations/utils/variationPdfExport";
import { isDraftOwnedByUser } from "../entries/variations/utils/variationStatusHelpers";

// Map status → prj-badge CSS class
const getStatusBadgeClass = (status) => {
    const s = status || "draft";
    if (s === "final_approved" || s === "approved") return "prj-badge--success";
    if (s.includes("rejected") || s === "rejected") return "prj-badge--danger";
    if (s.includes("pending") || s === "pending") return "prj-badge--warning";
    if (s.includes("delete")) return "prj-badge--danger";
    return "prj-badge--secondary";
};

const VariationsTab = memo(function VariationsTab({ projectId, project, variations, onReload }) {
    const { t, i18n } = useTranslation();
    const { success, error: showError } = useNotifications();
    const { user, hasPermission, isAdmin } = useAuth();
    const canCreateVariation = isAdmin || hasPermission('variations.create');
    const canEditVariation = isAdmin || hasPermission('variations.create'); // same permission gates creation and editing
    const navigate = useTenantNavigate();
    const isAR = i18n.language === "ar";
    const [showVat, setShowVat] = useState(false);
    const [includeHiddenFeesInSummary, setIncludeHiddenFeesInSummary] = useState(false);
    const vatLabel = showVat ? t("including_vat") : t("excluding_vat");
    const v = (val) => showVat ? val * 1.05 : val;


    const getAmountValue = (amount) => {
        const value = parseFloat(amount || 0);
        return isNaN(value) ? 0 : value;
    };

    const formatAmountNumber = (amount) => {
        return new Intl.NumberFormat(isAR ? "ar-AE" : "en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(getAmountValue(amount));
    };

    const renderMoney = (amount) => {
        if (isAR) {
            return formatMoney(getAmountValue(amount));
        }

        return (
            <span className="prj-money-with-icon">
                <span>{formatAmountNumber(amount)}</span>
                <DirhamsIcon size={12} className="prj-money-with-icon__icon" aria-hidden="true" />
            </span>
        );
    };

    const isProjectFinalApproved = project?.approval_status === "final_approved";

    const isProjectManager = user?.role?.name === "Manager";
    const isSupervisor = user?.role?.name === "Supervisor";
    const isCompanySuperAdmin = user?.role?.name === "company_super_admin";
    const isSuperAdmin = user?.is_superuser;
    const isGeneralManager = isCompanySuperAdmin || isSuperAdmin;
    const canApproveVariations = isGeneralManager || isSupervisor || isProjectManager;
    const canRejectAnyStatus = isGeneralManager || isSuperAdmin;
    const canViewHiddenFees = isProjectManager || isSupervisor || isGeneralManager;
    // Staff = not PM, not GM/admin, not superuser
    const isStaff = !isProjectManager && !isSupervisor && !isGeneralManager;

    const getHiddenFeeAmount = (variation) => {
        const gross = getAmountValue(variation?.hidden_consultant_fee_gross_amount);
        if (gross > 0) return gross;

        const net = getAmountValue(variation?.hidden_consultant_fee_net_amount);
        if (net > 0) return net;

        return getAmountValue(variation?.hidden_consultant_fee);
    };

    const hasHiddenFee = (variation) => getHiddenFeeAmount(variation) > 0;
    const getHiddenFeeStatus = (variation) => variation?.hidden_consultant_fee_status || "pending";

    const [variationStatusFilter, setVariationStatusFilter] = useState("");
    const [approvingVariationId, setApprovingVariationId] = useState(null);
    const [cancellingVariationId, setCancellingVariationId] = useState(null);
    const [rejectingVariationId, setRejectingVariationId] = useState(null);

    // Alteration request state
    const [alterationDialogOpen, setAlterationDialogOpen] = useState(false);
    const [alterationVariation, setAlterationVariation] = useState(null);
    const [alterationRequestType, setAlterationRequestType] = useState("edit");
    const [alterationReason, setAlterationReason] = useState("");
    const [submittingAlteration, setSubmittingAlteration] = useState(false);
    const [revokingVariationId, setRevokingVariationId] = useState(null);
    const [unapprovingVariationId, setUnapprovingVariationId] = useState(null);
    const [approveVariationConfirmOpen, setApproveVariationConfirmOpen] = useState(false);
    const [cancelVariationConfirmOpen, setCancelVariationConfirmOpen] = useState(false);
    const [rejectVariationConfirmOpen, setRejectVariationConfirmOpen] = useState(false);
    const [actionVariation, setActionVariation] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [bulkApproveVariationsConfirmOpen, setBulkApproveVariationsConfirmOpen] = useState(false);
    const [bulkFinalApproveVariationsConfirmOpen, setBulkFinalApproveVariationsConfirmOpen] = useState(false);
    const [bulkRejectVariationsConfirmOpen, setBulkRejectVariationsConfirmOpen] = useState(false);
    const [bulkApprovingVariations, setBulkApprovingVariations] = useState(false);
    const [bulkFinalApprovingVariations, setBulkFinalApprovingVariations] = useState(false);
    const [bulkRejectingVariations, setBulkRejectingVariations] = useState(false);
    const [deleteVariationsConfirmOpen, setDeleteVariationsConfirmOpen] = useState(false);
    const [deletingVariations, setDeletingVariations] = useState(false);
    const [hiddenFeeActionVariation, setHiddenFeeActionVariation] = useState(null);
    const [hiddenFeeRejectDialogOpen, setHiddenFeeRejectDialogOpen] = useState(false);
    const [hiddenFeeRejectionReason, setHiddenFeeRejectionReason] = useState("");
    const [processingHiddenFeeAction, setProcessingHiddenFeeAction] = useState(null);
    const [submittingDraftId, setSubmittingDraftId] = useState(null);

    // PM → draft creator request dialog ("Request Submission" / "Request Changes")
    const [draftRequestVariation, setDraftRequestVariation] = useState(null);
    const [draftRequestKind, setDraftRequestKind] = useState("submit"); // 'submit' | 'changes'
    const [draftRequestMessage, setDraftRequestMessage] = useState("");
    const [sendingDraftRequest, setSendingDraftRequest] = useState(false);
    const [discountDialogVariation, setDiscountDialogVariation] = useState(null);
    const [postApprovalDiscount, setPostApprovalDiscount] = useState('');
    const [savingPostApprovalDiscount, setSavingPostApprovalDiscount] = useState(false);
    const gmInitialSnapshotRef = useRef(null);

    const getVariationStatus = (variation) => {
        return variation.workflow_status || variation.status || "draft";
    };

    const checkRequiresEdit = (variation) => {
        const status = getVariationStatus(variation);
        return status === "requires_edit";
    };

    const createGmInitialSnapshot = async (variation) => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return exportVariationPdf({
            ref: gmInitialSnapshotRef,
            variation,
            project,
            companyInfo: null,
            noticeData: null,
            filenameSuffix: '_gm_initial_snapshot',
            download: false,
            logger,
        });
    };

    const approveVariationByRole = async (variation) => {
        if (!variation?.id || !projectId) return;

        const status = getVariationStatus(variation);

        if (isProjectManager) {
            if (status === "pending_owner_consultant") {
                if (!variation.owner_approval_confirmed) {
                    await projectApi.confirmOwnerApproval(projectId, variation.id);
                }
                if (!variation.consultant_approval_confirmed) {
                    await projectApi.confirmConsultantApproval(projectId, variation.id);
                }
                return;
            }
            return projectApi.approveVariationProjectManager(projectId, variation.id);
        }

        if (isSupervisor && status === "pending_supervisor") {
            return projectApi.approveVariationGeneralManagerInitial(projectId, variation.id);
        }

        if (isGeneralManager && status === "pending_gm_initial") {
            const snapshotBlob = await createGmInitialSnapshot(variation);
            return projectApi.approveVariationGMInitial(projectId, variation.id, snapshotBlob);
        }

        if (isGeneralManager) {
            return projectApi.approveVariation(projectId, variation.id);
        }

        throw new Error(t("permission_denied", "Permission denied"));
    };

    const handleSubmitDraft = async (variation) => {
        if (!variation?.id || !projectId) return;
        try {
            setSubmittingDraftId(variation.id);
            await projectApi.submitVariationDraft(projectId, variation.id);
            showToast("success", t("variation_submitted", "Variation submitted for approval"));
            onReload();
        } catch (error) {
            const handledError = handleError(error, "VariationsTab.handleSubmitDraft");
            showToast("error", handledError.message || t("submit_error", "Failed to submit variation"));
        } finally {
            setSubmittingDraftId(null);
        }
    };

    const openDraftRequestDialog = (variation, kind) => {
        setDraftRequestVariation(variation);
        setDraftRequestKind(kind);
        setDraftRequestMessage("");
    };

    const handleSendDraftRequest = async () => {
        if (!draftRequestVariation?.id || !projectId) return;
        setSendingDraftRequest(true);
        try {
            if (draftRequestKind === "submit") {
                await projectApi.requestVariationDraftSubmission(projectId, draftRequestVariation.id, draftRequestMessage.trim());
            } else {
                await projectApi.requestVariationDraftChanges(projectId, draftRequestVariation.id, draftRequestMessage.trim());
            }
            showToast("success", t("draft_request_sent", "Notification sent to the draft creator."));
            setDraftRequestVariation(null);
            setDraftRequestMessage("");
        } catch (error) {
            const handledError = handleError(error, "VariationsTab.handleSendDraftRequest");
            showToast("error", handledError.message || t("error_generic"));
        } finally {
            setSendingDraftRequest(false);
        }
    };

    const filteredVariations = useMemo(() => {
        if (!variations) return [];

        const filtered = variations.filter((v) => {
            if (!variationStatusFilter) return true;

            const status = getVariationStatus(v);

            if (variationStatusFilter === "approved") {
                return status === "approved" || status === "final_approved";
            }

            if (variationStatusFilter === "rejected") {
                return status?.includes("rejected") || status === "rejected";
            }

            if (variationStatusFilter === "pending") {
                return status?.includes("pending") || status === "pending" || status === "draft";
            }

            return true;
        });

        // Sort by variation number ascending
        return filtered.sort((a, b) => {
            const getRefNumber = (v) => {
                const variationNumberMatch = String(
                    v.variation_number || v.modification_number || ""
                ).match(/\d+/);
                if (variationNumberMatch) {
                    return parseInt(variationNumberMatch[0], 10);
                }

                const referenceSequence = Number(v.reference_sequence);
                if (Number.isFinite(referenceSequence) && referenceSequence > 0) {
                    return referenceSequence;
                }

                let ref = v.reference_number || "";

                // Get reference number from description JSON
                if (!ref && v.description) {
                    try {
                        const parsed = JSON.parse(v.description);
                        ref = parsed.reference_no || "";
                    } catch {
                        ref = "";
                    }
                }

                // Canonical references can contain several numbers, so use
                // the VO sequence rather than the first number in the string.
                const match = String(ref).match(/(?:^|[-_\s])VO[-_\s]*(\d+)(?:$|[._-])/i);

                return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
            };

            return getRefNumber(a) - getRefNumber(b);
        });
    }, [variations, variationStatusFilter]);

    const {
        selectedIds: selectedVariationIds,
        setSelectedIds: setSelectedVariationIds,
        handleSelect: handleSelectVariation,
        handleSelectAll,
        clearSelection,
        isAllSelected,
        selectAllRef,
    } = useTableSelection({
        items: filteredVariations,
        deleteApi: () => { },
        onReload,
        showToast: () => { },
        t,
    });

    const variationStats = useMemo(() => {
        const emptyPendingBreakdown = {
            projectManager: 0,
            supervisor: 0,
            gmInitial: 0,
            ownerConsultant: 0,
            finalApproval: 0,
        };
        if (!variations) return { total: 0, approved: 0, rejected: 0, pending: 0, pendingBreakdown: emptyPendingBreakdown, totalAmount: 0 };

        const approved = variations.filter((v) => {
            const status = getVariationStatus(v);
            return status === "approved" || status === "final_approved";
        });

        const rejected = variations.filter((v) => {
            const status = getVariationStatus(v);
            return status?.includes("rejected") || status === "rejected";
        });

        const pending = variations.filter((v) => {
            const status = getVariationStatus(v);
            return status?.includes("pending") || status === "pending" || status === "draft";
        });

        const pendingBreakdown = variations.reduce((counts, variation) => {
            const status = getVariationStatus(variation);
            if (status === "pending_project_manager") counts.projectManager += 1;
            if (status === "pending_supervisor") counts.supervisor += 1;
            if (status === "pending_gm_initial") counts.gmInitial += 1;
            if (status === "pending_owner_consultant") counts.ownerConsultant += 1;
            if (status === "pending_general_manager_final") counts.finalApproval += 1;
            return counts;
        }, { ...emptyPendingBreakdown });

        const totalAmount = approved.reduce((sum, variation) => {
            const totalForVariation = parseFloat(getVariationTotalAmount(variation));
            return sum + (isNaN(totalForVariation) ? 0 : totalForVariation);
        }, 0);

        return {
            total: variations.length,
            approved: approved.length,
            rejected: rejected.length,
            pending: pending.length,
            pendingBreakdown,
            totalAmount,
        };
    }, [variations]);

    const pendingMetricPrimary = useMemo(() => ({
        key: "finalApproval",
        label: t("pending_metric_final_approval"),
        value: variationStats.pendingBreakdown.finalApproval,
    }), [t, variationStats.pendingBreakdown.finalApproval]);

    const pendingMetricItems = useMemo(() => ([
        { key: "projectManager", label: t("pending_metric_project_manager"), value: variationStats.pendingBreakdown.projectManager },
        { key: "supervisor", label: t("pending_metric_supervisor"), value: variationStats.pendingBreakdown.supervisor },
        { key: "gmInitial", label: t("pending_metric_gm_initial"), value: variationStats.pendingBreakdown.gmInitial },
        { key: "ownerConsultant", label: t("pending_metric_owner_consultant"), value: variationStats.pendingBreakdown.ownerConsultant },
    ]), [t, variationStats.pendingBreakdown]);

    const showToast = (type, msg) => (type === "success" ? success(msg) : showError(msg));

    const askApproveVariation = (variation) => {
        setActionVariation(variation);
        setApproveVariationConfirmOpen(true);
    };

    const handleApproveVariation = async () => {
        if (!actionVariation?.id || !projectId) return;

        if (checkRequiresEdit(actionVariation)) {
            showToast("error", t("must_edit_before_approval"));
            return;
        }

        try {
            setApprovingVariationId(actionVariation.id);
            await approveVariationByRole(actionVariation);
            showToast("success", t("variation_approved"));
        } catch (error) {
            const handledError = handleError(error, "VariationsTab.handleApproveVariation");
            let errorMessage = handledError.message || t("approve_error");

            if (errorMessage.includes("must be edited first") || errorMessage.includes("requires_edit")) {
                errorMessage = t("must_edit_before_approval");
            }

            showToast("error", errorMessage);
        } finally {
            setApprovingVariationId(null);
            setApproveVariationConfirmOpen(false);
            setActionVariation(null);
            onReload();
        }
    };

    const handleAddPostApprovalDiscount = async () => {
        if (!discountDialogVariation || !postApprovalDiscount) return;
        setSavingPostApprovalDiscount(true);
        try {
            await projectApi.addVariationPostApprovalDiscount(projectId, discountDialogVariation.id, postApprovalDiscount);
            showToast('success', t('post_approval_discount_added'));
            setDiscountDialogVariation(null);
            setPostApprovalDiscount('');
            await onReload();
        } catch (error) {
            showToast('error', handleError(error, 'VariationsTab.addDiscount').message);
        } finally {
            setSavingPostApprovalDiscount(false);
        }
    };

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
            const handledError = handleError(error, "VariationsTab.handleCancelVariation");
            showToast("error", handledError.message || t("cancel_error"));
        } finally {
            setCancellingVariationId(null);
        }
    };

    const askRejectVariation = (variation) => {
        setActionVariation(variation);
        setRejectionReason("");
        setRejectVariationConfirmOpen(true);
    };

    const handleRejectVariation = async () => {
        if (!actionVariation?.id || !projectId) return;

        if (checkRequiresEdit(actionVariation)) {
            showToast("error", t("must_edit_before_approval"));
            return;
        }

        if (!rejectionReason || !rejectionReason.trim()) {
            showToast("error", t("rejection_reason_required"));
            return;
        }

        const workflowStatus = actionVariation.workflow_status || actionVariation.status || "";
        if (workflowStatus === "approved" || workflowStatus === "final_approved") {
            showToast("error", t("cannot_reject_approved_variation", "لا يمكن رفض أمر تغيير معتمد نهائياً"));
            return;
        }

        if (!canRejectAnyStatus && !isProjectManager && workflowStatus === "pending_project_manager") {
            showToast("error", t("cannot_reject_pending_project_manager"));
            return;
        }

        try {
            setRejectingVariationId(actionVariation.id);
            if (isProjectManager && workflowStatus === "pending_owner_consultant") {
                await projectApi.rejectVariationOwnerConsultant(projectId, actionVariation.id, rejectionReason.trim());
            } else if (isProjectManager) {
                await projectApi.rejectVariationProjectManager(projectId, actionVariation.id, rejectionReason.trim());
            } else {
                await projectApi.rejectVariation(projectId, actionVariation.id, rejectionReason.trim());
            }
            onReload();
            showToast("success", t("variation_rejected"));
            setRejectVariationConfirmOpen(false);
            setActionVariation(null);
            setRejectionReason("");
        } catch (error) {
            const handledError = handleError(error, "VariationsTab.handleRejectVariation");
            let errorMessage = handledError.message || t("reject_error");

            if (errorMessage.includes("cannot be rejected in current status")) {
                errorMessage = t("cannot_reject_current_status");
            }

            showToast("error", errorMessage);
        } finally {
            setRejectingVariationId(null);
        }
    };

    const handleRevokeApproval = async (variation) => {
        if (!variation?.id || !projectId) return;

        try {
            setRevokingVariationId(variation.id);
            await projectApi.revokeVariationApproval(projectId, variation.id);
            success(t("variation_approval_revoked", "تم إلغاء الاعتماد — يمكن إعادة الاعتماد الآن"));
            onReload();
        } catch (e) {
            showError(t("error_generic", "حدث خطأ"));
        } finally {
            setRevokingVariationId(null);
        }
    };

    const handleUnapproveVariation = async (variation) => {
        if (!variation?.id || !projectId) return;

        try {
            setUnapprovingVariationId(variation.id);
            if (isProjectManager) {
                await projectApi.unapproveVariationProjectManager(projectId, variation.id);
            } else if (isSupervisor) {
                await projectApi.unapproveVariationSupervisor(projectId, variation.id);
            }
            success(t("variation_unapproved", "Variation approval removed"));
            onReload();
        } catch (e) {
            const msg = e?.response?.data?.error || e?.message || t("error_generic", "حدث خطأ");
            showError(msg);
        } finally {
            setUnapprovingVariationId(null);
        }
    };

    const handleApproveHiddenFee = async (variation) => {
        if (!variation?.id || !projectId || !isGeneralManager) return;

        try {
            setProcessingHiddenFeeAction(`approve-${variation.id}`);
            await projectApi.approveVariationHiddenFees(projectId, variation.id);
            showToast("success", t("hidden_fee_approved", "Hidden fee approved"));
            await onReload();
        } catch (error) {
            const handledError = handleError(error, "VariationsTab.handleApproveHiddenFee");
            showToast("error", handledError.message || t("approve_error"));
        } finally {
            setProcessingHiddenFeeAction(null);
        }
    };

    const askRejectHiddenFee = (variation) => {
        setHiddenFeeActionVariation(variation);
        setHiddenFeeRejectionReason("");
        setHiddenFeeRejectDialogOpen(true);
    };

    const handleRejectHiddenFee = async () => {
        if (!hiddenFeeActionVariation?.id || !projectId || !isGeneralManager) return;

        if (!hiddenFeeRejectionReason.trim()) {
            showToast("error", t("rejection_reason_required"));
            return;
        }

        try {
            setProcessingHiddenFeeAction(`reject-${hiddenFeeActionVariation.id}`);
            await projectApi.rejectVariationHiddenFees(projectId, hiddenFeeActionVariation.id, hiddenFeeRejectionReason.trim());
            showToast("success", t("hidden_fee_rejected", "Hidden fee rejected"));
            setHiddenFeeRejectDialogOpen(false);
            setHiddenFeeActionVariation(null);
            setHiddenFeeRejectionReason("");
            await onReload();
        } catch (error) {
            const handledError = handleError(error, "VariationsTab.handleRejectHiddenFee");
            showToast("error", handledError.message || t("reject_error"));
        } finally {
            setProcessingHiddenFeeAction(null);
        }
    };

    const openAlterationDialog = (variation, requestType) => {
        setAlterationVariation(variation);
        setAlterationRequestType(requestType);
        setAlterationReason("");
        setAlterationDialogOpen(true);
    };

    const getAlterationDialogTitle = () => {
        if (alterationRequestType === "edit") {
            return t("request_edit", "طلب تعديل أمر التغيير");
        }
        if (alterationRequestType === "delete") {
            return t("request_delete", "طلب حذف أمر التغيير");
        }
        return t("request_unapprove", "Request Unapprove");
    };

    const getAlterationDialogDesc = () => {
        if (alterationRequestType === "edit") {
            return t("request_edit_desc", "سيتم إرسال طلب التعديل إلى مدير المشروع للموافقة عليه.");
        }
        if (alterationRequestType === "delete") {
            return t("request_delete_desc", "سيتم إرسال طلب الحذف إلى مدير المشروع للموافقة عليه.");
        }
        return t("request_unapprove_desc", "This will send an unapprove request to the approver responsible for the current approval step.");
    };

    const handleSubmitAlterationRequest = async () => {
        if (!alterationVariation?.id || !projectId || !alterationReason.trim()) return;
        try {
            setSubmittingAlteration(true);
            await projectApi.createAlterationRequest(projectId, alterationVariation.id, {
                request_type: alterationRequestType,
                reason: alterationReason.trim(),
            });
            const sentToKey = (isProjectManager && alterationRequestType === "unapprove")
                ? "alteration_request_sent_to_supervisor"
                : "alteration_request_sent";
            showToast("success", `${getAlterationDialogTitle()} - ${t(sentToKey)}`);
            onReload();
        } catch (e) {
            const msg = e?.response?.data?.error || e?.message || t("error_generic", "حدث خطأ");
            showToast("error", msg);
        } finally {
            setSubmittingAlteration(false);
            setAlterationDialogOpen(false);
            setAlterationVariation(null);
        }
    };

    const askBulkRejectVariations = () => {
        if (selectedVariationIds.size === 0) return;
        setRejectionReason("");
        setBulkRejectVariationsConfirmOpen(true);
    };

    const handleBulkRejectVariations = async () => {
        if (selectedVariationIds.size === 0) return;

        if (!rejectionReason || !rejectionReason.trim()) {
            showToast("error", t("rejection_reason_required"));
            return;
        }

        const variationsToReject = filteredVariations.filter((v) => selectedVariationIds.has(v.id));
        const alreadyApproved = variationsToReject.filter((v) => {
            const st = v.workflow_status || v.status || "";
            return st === "approved" || st === "final_approved";
        });

        if (alreadyApproved.length > 0) {
            showToast("error", t("cannot_reject_approved_variation", "لا يمكن رفض أمر تغيير معتمد نهائياً"));
            return;
        }

        if (!canRejectAnyStatus) {
            const cannotReject = variationsToReject.filter((v) => {
                const workflowStatus = v.workflow_status || v.status || "";
                return workflowStatus === "pending_project_manager";
            });

            if (cannotReject.length > 0) {
                showToast("error", t("some_variations_cannot_be_rejected"));
                return;
            }
        }

        setBulkRejectingVariations(true);
        const ids = Array.from(selectedVariationIds);
        let ok = 0;
        let fail = 0;
        const errors = [];

        for (const id of ids) {
            try {
                if (isProjectManager) {
                    await projectApi.rejectVariationProjectManager(projectId, id, rejectionReason.trim());
                } else {
                    await projectApi.rejectVariation(projectId, id, rejectionReason.trim());
                }
                ok += 1;
            } catch (e) {
                fail += 1;
                const handledError = handleError(e, "VariationsTab.handleBulkRejectVariations");

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

    const askBulkApproveVariations = () => {
        if (selectedVariationIds.size === 0) return;
        setBulkApproveVariationsConfirmOpen(true);
    };

    const askBulkFinalApproveVariations = () => {
        if (selectedVariationIds.size === 0) return;
        setBulkFinalApproveVariationsConfirmOpen(true);
    };

    const handleBulkApproveVariations = async () => {
        if (selectedVariationIds.size === 0) return;

        const selectedVariations = filteredVariations.filter((v) =>
            selectedVariationIds.has(v.id)
        );

        setBulkApprovingVariations(true);

        let ok = 0;
        let fail = 0;
        let gmInitialPendingCount = 0;

        try {
            for (const variation of selectedVariations) {
                try {
                    const status = getVariationStatus(variation);

                    if (status === "draft") {
                        fail += 1;
                        continue;
                    }

                    if (checkRequiresEdit(variation)) {
                        fail += 1;
                        continue;
                    }

                    if (isProjectManager) {
                        if (status === "pending_gm_initial" || status === "pending_supervisor") {
                            gmInitialPendingCount += 1;
                            fail += 1;
                            continue;
                        }

                        if (
                            status === "pending_project_manager" &&
                            !variation.project_manager_initial_approved_by
                        ) {
                            await projectApi.approveVariationProjectManager(
                                projectId,
                                variation.id
                            );
                            ok += 1;
                            continue;
                        }

                        if (status === "pending_owner_consultant") {
                            let didApprove = false;

                            if (!variation.owner_approval_confirmed) {
                                await projectApi.confirmOwnerApproval(
                                    projectId,
                                    variation.id
                                );
                                didApprove = true;
                            }

                            if (!variation.consultant_approval_confirmed) {
                                await projectApi.confirmConsultantApproval(
                                    projectId,
                                    variation.id
                                );
                                didApprove = true;
                            }

                            if (didApprove) {
                                ok += 1;
                            } else {
                                fail += 1;
                            }

                            continue;
                        }

                        fail += 1;
                        continue;
                    }

                    if (isSupervisor) {
                        if (status === "pending_supervisor") {
                            await projectApi.approveVariationGeneralManagerInitial(
                                projectId,
                                variation.id
                            );
                            ok += 1;
                            continue;
                        }

                        if (status === "pending_general_manager_final") {
                            await projectApi.approveVariation(projectId, variation.id);
                            ok += 1;
                            continue;
                        }

                        fail += 1;
                        continue;
                    }

                    if (isGeneralManager) {
                        if (status === "pending_gm_initial") {
                            // The canonical snapshot is generated from the rendered detail page.
                            fail += 1;
                            continue;
                        }

                        if (status === "pending_general_manager_final") {
                            await projectApi.approveVariation(projectId, variation.id);
                            ok += 1;
                            continue;
                        }

                        fail += 1;
                        continue;
                    }

                    fail += 1;
                } catch (e) {
                    logger.error(`Error approving variation ${variation.id}`, e);
                    fail += 1;
                }
            }

            await onReload();
            clearSelection();
            setBulkApproveVariationsConfirmOpen(false);

            if (gmInitialPendingCount > 0 && ok === 0) {
                showToast(
                    "error",
                    t(
                        "waiting_for_general_manager_initial_approval_bulk",
                        "Supervisor approval is pending. Project Manager cannot approve these variation(s) at this stage."
                    )
                );
            } else if (fail === 0) {
                showToast(
                    "success",
                    t("bulk_approve_success", "Bulk approved {{count}} variation(s)").replace(
                        "{{count}}",
                        ok
                    )
                );
            } else if (ok === 0) {
                showToast("error", t("bulk_approve_error", "Bulk approve failed"));
            } else {
                showToast(
                    "error",
                    t(
                        "bulk_approve_partial",
                        "Bulk approve partially completed. Approved {{ok}}, failed {{fail}}."
                    )
                        .replace("{{ok}}", ok)
                        .replace("{{fail}}", fail)
                );
            }
        } finally {
            setBulkApprovingVariations(false);
        }
    };

    const handleBulkFinalApproveVariations = async () => {
        if (selectedVariationIds.size === 0 || !isGeneralManager) return;

        const selectedVariations = filteredVariations.filter((v) =>
            selectedVariationIds.has(v.id)
        );

        setBulkFinalApprovingVariations(true);

        let ok = 0;
        let fail = 0;

        try {
            for (const variation of selectedVariations) {
                const status = getVariationStatus(variation);

                if (status === "approved" || status === "final_approved" || status === "draft") {
                    continue;
                }

                try {
                    await projectApi.approveVariation(projectId, variation.id);
                    ok += 1;
                } catch (e) {
                    logger.error(`Error final approving variation ${variation.id}`, e);
                    fail += 1;
                }
            }

            await onReload();
            clearSelection();
            setBulkFinalApproveVariationsConfirmOpen(false);

            if (fail === 0) {
                showToast(
                    "success",
                    t("bulk_final_approve_success", "Final approved {{count}} variation(s)").replace(
                        "{{count}}",
                        ok
                    )
                );
            } else if (ok === 0) {
                showToast("error", t("bulk_final_approve_error", "Bulk final approve failed"));
            } else {
                showToast(
                    "error",
                    t(
                        "bulk_final_approve_partial",
                        "Bulk final approve partially completed. Approved {{ok}}, failed {{fail}}."
                    )
                        .replace("{{ok}}", ok)
                        .replace("{{fail}}", fail)
                );
            }
        } finally {
            setBulkFinalApprovingVariations(false);
        }
    };

    const handleDeleteVariations = async () => {
        if (selectedVariationIds.size === 0) return;

        setDeletingVariations(true);

        try {
            const ids = Array.from(selectedVariationIds).filter(id => {
                if (!isStaff) return true;
                const v = filteredVariations.find(v => v.id === id);
                return v && canStaffDeleteVariation(v);
            });
            let successCount = 0;
            let failCount = 0;
            let lastFailureMessage = null;

            for (const id of ids) {
                try {
                    await projectApi.deleteVariation(projectId, id);
                    successCount++;
                } catch (e) {
                    logger.error(`Error deleting variation ${id}`, e);
                    failCount++;
                    lastFailureMessage = e?.response?.data?.detail || e?.response?.data?.message;
                }
            }

            if (successCount > 0) {
                clearSelection();
                onReload();
                showToast("success", t("variations_deleted"));
            }

            if (failCount > 0) {
                if (failCount === 1 && lastFailureMessage) {
                    showToast("error", lastFailureMessage);
                } else {
                    showToast("error", t("some_variations_delete_failed"));
                }
            }

            setDeleteVariationsConfirmOpen(false);
        } catch (e) {
            logger.error("Error deleting variations", e);
            showToast("error", e?.response?.data?.detail || e?.response?.data?.message || t("delete_error"));
        } finally {
            setDeletingVariations(false);
        }
    };

    const { downloadZip, zipLoading, downloadSingle, singleLoading } = useDownloadVariationPDFs(projectId);
    const handleDownloadAllVariations = () =>
        downloadZip({
            items: filteredVariations,
            zipName: `Variations.zip`,
        });

    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${project?.name || "Project"} - Variations`,
        pageStyle: `
            @page { size: A4 portrait; margin: 8mm; }
            html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
        `,
    });

    const isDraftVariation = (variation) => getVariationStatus(variation) === "draft";

    // A draft with no recorded creator (creator account deleted) has no one
    // to restrict to — fall back to open access rather than locking it forever.
    const canActOnDraft = (variation) => !variation?.created_by || isDraftOwnedByUser(variation, user);

    const canStaffDeleteVariation = (variation) => {
        const s = getVariationStatus(variation);
        if (s === "draft") return canActOnDraft(variation);
        return s === "pending_project_manager";
    };

    // Staff may only edit directly before it leaves their hands, or once it's returned for edit.
    // Any other pending status (supervisor/GM/owner-consultant review) must go through the request-edit flow.
    // A draft belongs to whoever created it — no other role may edit it directly.
    const canStaffEditVariation = (variation) => {
        const s = getVariationStatus(variation);
        if (s === "draft") return canActOnDraft(variation);
        return (
            s === "pending_project_manager" ||
            s === "rejected_by_project_manager" ||
            s === "rejected_by_supervisor" ||
            s === "rejected_by_gm_initial" ||
            s === "rejected_by_owner_consultant" ||
            s === "returned_for_edit"
        );
    };

    const staffCanDeleteSelected = !isStaff || [...selectedVariationIds].every(id => {
        const v = filteredVariations.find(v => v.id === id);
        return v && canStaffDeleteVariation(v);
    });

    const canApproveThisVariation = (variation) => {
        if (!canApproveVariations) return false;

        const status = getVariationStatus(variation);

        if (
            status === "rejected_by_project_manager" ||
            status === "rejected_by_supervisor" ||
            status === "rejected_by_gm_initial" ||
            status === "rejected" ||
            status === "approved" ||
            status === "final_approved"
        ) {
            return false;
        }

        if (isProjectManager) {
            if (
                status === "pending_project_manager" &&
                !variation.project_manager_initial_approved_by
            ) {
                return true;
            }

            if (
                status === "pending_owner_consultant" &&
                (!variation.owner_approval_confirmed || !variation.consultant_approval_confirmed)
            ) {
                return true;
            }

            return false;
        }

        if (isSupervisor) {
            return status === "pending_supervisor";
        }

        if (isGeneralManager) {
            return (
                status === "pending_gm_initial" ||
                status === "pending_general_manager_final"
            );
        }

        return false;
    };

    const canCancelThisVariation = (variation) => {
        if (!canApproveVariations) return false;

        const status = getVariationStatus(variation);
        return status !== "approved" && status !== "final_approved" && !status?.includes("rejected");
    };

    const canRejectThisVariation = (variation) => {
        const status = getVariationStatus(variation);
        return isProjectManager && status === "pending_owner_consultant";
    };

    const canDirectUnapproveThisVariation = (variation) => {
        const status = getVariationStatus(variation);
        if (status === "approved" || status === "final_approved") return false;

        if (isProjectManager) {
            return status === "pending_gm_initial" && !!variation.project_manager_initial_approved_by;
        }

        if (isSupervisor) {
            return (
                (status === "pending_owner_consultant" || status === "pending_general_manager_final") &&
                !!variation.general_manager_initial_approved_by
            );
        }

        return false;
    };

    const canRequestUnapproveThisVariation = (variation) => {
        const status = getVariationStatus(variation);
        if (status === "approved" || status === "final_approved") return false;

        if (isStaff) {
            return status === "pending_supervisor" || status === "pending_gm_initial";
        }

        if (isProjectManager) {
            return status === "pending_supervisor" || status === "pending_owner_consultant" || status === "pending_general_manager_final";
        }

        return false;
    };

    return (
        <div className="prj-tab-panel">
            <div className="prj-tab-header">
                <div className="prj-tab-actions">
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

                    <DownloadAllButton
                        onClick={handleDownloadAllVariations}
                        loading={zipLoading}
                        count={filteredVariations.length}
                    />

                    {variations && variations.length > 0 && (
                        <div className="variations-tab__summary-download">
                            <button
                                onClick={handlePrint}
                                className={`variations-tab__summary-download-button${canViewHiddenFees ? " variations-tab__summary-download-button--has-check" : ""}`}
                            >
                                <span className="variations-tab__summary-download-label">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M12 17V3M6 11l6 6 6-6" />
                                        <path d="M4 21h16" />
                                    </svg>
                                    {t("download_tab_summary", "Download Tab Summary")}
                                </span>
                                {canViewHiddenFees && (
                                    <label
                                        className="variations-tab__summary-hidden-fee-check"
                                        title={t("hidden_fee_short", "Hidden fee")}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={includeHiddenFeesInSummary}
                                            onChange={(event) => setIncludeHiddenFeesInSummary(event.target.checked)}
                                        />
                                        <span>{t("hidden_fee_short", "Hidden fee")}</span>
                                    </label>
                                )}
                            </button>
                        </div>
                    )}

                    {canCreateVariation && (
                        isProjectFinalApproved ? (
                            <Button as={Link} to={`/projects/${projectId}/variations/notice`} variant="primary" size="md">
                                {t("add_variation")}
                            </Button>
                        ) : (
                            <span
                                title={t("variation_requires_final_approval")}
                                style={{ display: "inline-block", cursor: "not-allowed" }}
                            >
                                <Button variant="primary" size="md" disabled style={{ pointerEvents: "none" }}>
                                    {t("add_variation")}
                                </Button>
                            </span>
                        )
                    )}
                </div>
            </div>

            <BulkActionsBar
                selectedCount={selectedVariationIds.size}
                onClear={clearSelection}
                actions={[
                    ...(canApproveVariations
                        ? [
                            {
                                label: bulkApprovingVariations ? t("approving") : t("approve_selected"),
                                onClick: askBulkApproveVariations,
                                variant: "primary",
                                disabled: bulkApprovingVariations || bulkFinalApprovingVariations || bulkRejectingVariations || deletingVariations,
                            },
                            ...(isGeneralManager
                                ? [
                                    {
                                        label: bulkFinalApprovingVariations ? t("approving") : t("final_approve_selected", "Final approve selected"),
                                        onClick: askBulkFinalApproveVariations,
                                        variant: "success",
                                        disabled: bulkApprovingVariations || bulkFinalApprovingVariations || bulkRejectingVariations || deletingVariations,
                                    },
                                ]
                                : []),
                            {
                                label: bulkRejectingVariations ? t("rejecting") : t("reject_selected"),
                                onClick: askBulkRejectVariations,
                                variant: "danger",
                                disabled: bulkApprovingVariations || bulkFinalApprovingVariations || bulkRejectingVariations || deletingVariations,
                            },
                        ]
                        : []),
                    ...(!isStaff || staffCanDeleteSelected
                        ? [
                            {
                                label: t("delete"),
                                onClick: () => setDeleteVariationsConfirmOpen(true),
                                variant: "danger",
                                disabled: deletingVariations || bulkApprovingVariations || bulkFinalApprovingVariations || bulkRejectingVariations || !staffCanDeleteSelected,
                            },
                        ]
                        : []),
                ]}
            />

            {variations && variations.length > 0 ? (
                <>
                    <MetricGrid columns={4}>
                        <MetricCard
                            variant="blue"
                            icon="dollar"
                            label={t("total")}
                            sub={`${vatLabel} • ${t('including_consultant_fees')}`}
                            value={renderMoney(v(variationStats.totalAmount))}
                        />

                        <MetricCard variant="emerald" icon="check" label={t("total_approved")} value={variationStats.approved} />
                        <MetricCard
                            variant="amber"
                            icon="clock"
                            label={t("pending_approvals")}
                            value={
                                <div className="variations-tab__pending-metric">
                                    <div className="variations-tab__pending-mini-card variations-tab__pending-mini-card--primary">
                                        <span className="variations-tab__pending-mini-label">{pendingMetricPrimary.label}</span>
                                        <span className="variations-tab__pending-mini-value">{pendingMetricPrimary.value}</span>
                                    </div>
                                    {pendingMetricItems.map((item) => (
                                        <div className="variations-tab__pending-mini-card" key={item.key}>
                                            <span className="variations-tab__pending-mini-label">{item.label}</span>
                                            <span className="variations-tab__pending-mini-value">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            }
                        />
                        <MetricCard variant="danger" icon="x" label={t("cancelled")} value={variationStats.rejected} />
                    </MetricGrid>

                    <div className="prj-tab-filter ds-mb-4 variations-tab__no-print">
                        <select className="prj-input" value={variationStatusFilter} onChange={(e) => setVariationStatusFilter(e.target.value)}>
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

                    <TabPrintWrapper ref={printRef} title={t("variations", "Variations")} subtitle={project?.name}>
                    <div className={includeHiddenFeesInSummary ? "" : "variations-summary--hide-hidden-fees"}>
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
                                     <th>{t("reference_no")}</th>
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
                                    const statusLabel = getApprovalStatusLabel(status, isAR ? "ar" : "en");
                                    const canApproveThis = canApproveThisVariation(variation);
                                    const canRejectThis = canRejectThisVariation(variation);
                                    const canDirectUnapproveThis = canDirectUnapproveThisVariation(variation);
                                    const canRequestUnapproveThis = canRequestUnapproveThisVariation(variation);
                                    const draftEditableByCurrentUser = canActOnDraft(variation);

                                    let variationDescription = "";
                                    let referenceNo = null;

                                    if (variation.description) {
                                        try {
                                            const parsed = JSON.parse(variation.description);
                                            variationDescription = parsed.variation_description || "";
                                            referenceNo = parsed.reference_no || null;
                                        } catch (e) {
                                            variationDescription = variation.description;
                                        }
                                    }

                                     const rawNumber = variation.variation_number || variation.modification_number || referenceNo || variation.id;
                                     const displayNumber = `VAR${String(rawNumber).replace(/^VAR/i, "")}`;
                                     const displayReference = variation.reference_number || referenceNo || "-";
                                    const showHiddenFeeInRow = canViewHiddenFees && hasHiddenFee(variation);
                                    const hiddenFeeStatus = getHiddenFeeStatus(variation);
                                    const canDecideHiddenFeeInRow = isGeneralManager && showHiddenFeeInRow;

                                    return (
                                        <tr
                                            key={variation.id}
                                            className={[
                                                isSelected ? "is-selected" : "",
                                                showHiddenFeeInRow ? "variations-tab__row--hidden-fee" : "",
                                            ].filter(Boolean).join(" ")}
                                            onClick={() => navigate(`/variations/${variation.id}/view?project=${projectId}`)}
                                        >
                                            <td className="ds-text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => handleSelectVariation(variation.id, e.target.checked)}
                                                    className="prj-checkbox"
                                                />
                                            </td>

                                            <td className="ds-text-center ds-font-medium prj-table__index">{i + 1}</td>

                                             <td>
                                                 <span className="prj-code">{displayNumber}</span>
                                             </td>

                                             <td>
                                                 <span className="prj-code" title={displayReference}>{displayReference}</span>
                                             </td>

                                             <td className="variations-tab__description-cell">
                                                <span className="variations-tab__description-text" title={variationDescription}>
                                                    {variationDescription || "-"}
                                                </span>
                                            </td>

                                            <td>
                                                <span className={`prj-badge ${getStatusBadgeClass(status)}`} title={statusLabel}>
                                                    {statusLabel}
                                                </span>
                                            </td>

                                            <td className="prj-nowrap prj-info-value--money ds-text-right ds-font-semibold">
                                                <div className="variations-tab__amount-wrap">
                                                    <div className="variations-tab__amount-topline">
                                                        {showHiddenFeeInRow && (
                                                            <div className="variations-tab__hidden-fee">
                                                                <span className="variations-tab__hidden-fee-text">
                                                                    {t("hidden_fee_short", "Hidden fee")}
                                                                </span>
                                                                <span className="variations-tab__hidden-fee-line">
                                                                    {canDecideHiddenFeeInRow && (
                                                                        <span className="variations-tab__hidden-fee-actions" onClick={(e) => e.stopPropagation()}>
                                                                            {hiddenFeeStatus !== "approved" && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="variations-tab__hidden-fee-btn variations-tab__hidden-fee-btn--approve"
                                                                                    onClick={() => handleApproveHiddenFee(variation)}
                                                                                    disabled={processingHiddenFeeAction === `approve-${variation.id}`}
                                                                                    title={t("approve_hidden_fee", "Approve hidden fee")}
                                                                                >
                                                                                    {t("approve", "Approve")}
                                                                                </button>
                                                                            )}
                                                                            {hiddenFeeStatus !== "rejected" && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="variations-tab__hidden-fee-btn variations-tab__hidden-fee-btn--reject"
                                                                                    onClick={() => askRejectHiddenFee(variation)}
                                                                                    disabled={processingHiddenFeeAction === `reject-${variation.id}`}
                                                                                    title={t("reject_hidden_fee", "Reject hidden fee")}
                                                                                >
                                                                                    {t("reject", "Reject")}
                                                                                </button>
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                    <span className="variations-tab__hidden-fee-amount">
                                                                        {renderMoney(getHiddenFeeAmount(variation))}
                                                                    </span>
                                                                </span>
                                                                <span className={`variations-tab__hidden-fee-status variations-tab__hidden-fee-status--${hiddenFeeStatus}`}>
                                                                    {t(`hidden_fee_status_${hiddenFeeStatus}`, hiddenFeeStatus)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="variations-tab__main-amount">
                                                            {renderMoney(getVariationTotalAmount(variation))}
                                                        </div>
                                                    </div>
                                                    <span className="prj-info-value__sub ds-block ds-text-xs ds-text-muted">
                                                        {t('excluding_vat')} • {t('including_consultant_fees')}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                                                <ActionMenu
                                                    items={status === "draft"
                                                        ? [
                                                            // Draft rows: only the creator may edit/submit (or anyone, if it has no recorded creator) — no approval/rejection actions
                                                            ...(canEditVariation && draftEditableByCurrentUser
                                                                ? [{ label: t("edit"), to: `/variations/${variation.id}/notice`, type: "link" }]
                                                                : []),
                                                            ...(draftEditableByCurrentUser
                                                                ? [{
                                                                    label: submittingDraftId === variation.id
                                                                        ? t("submitting", "Submitting...")
                                                                        : t("submit_draft", "Submit"),
                                                                    type: "button",
                                                                    variant: "primary",
                                                                    onClick: () => handleSubmitDraft(variation),
                                                                    disabled: submittingDraftId === variation.id,
                                                                }]
                                                                : []),
                                                            ...(isProjectManager && variation?.created_by && !isDraftOwnedByUser(variation, user)
                                                                ? [
                                                                    {
                                                                        label: t("request_submission", "Request Submission"),
                                                                        type: "button",
                                                                        variant: "warning",
                                                                        onClick: () => openDraftRequestDialog(variation, "submit"),
                                                                    },
                                                                    {
                                                                        label: t("request_changes", "Request Changes"),
                                                                        type: "button",
                                                                        variant: "warning",
                                                                        onClick: () => openDraftRequestDialog(variation, "changes"),
                                                                    },
                                                                ]
                                                                : []),
                                                        ]
                                                        : [
                                                            // Normal (non-draft) rows
                                                            ...(isStaff && (status === "pending_supervisor" || status === "pending_gm_initial")
                                                                ? [
                                                                    ...(!variation.pending_alteration_request
                                                                        ? [
                                                                            {
                                                                                label: t("request_edit", "طلب تعديل"),
                                                                                type: "button",
                                                                                variant: "warning",
                                                                                onClick: () => openAlterationDialog(variation, "edit"),
                                                                            },
                                                                            {
                                                                                label: t("request_delete", "طلب حذف"),
                                                                                type: "button",
                                                                                variant: "danger",
                                                                                onClick: () => openAlterationDialog(variation, "delete"),
                                                                            },
                                                                            {
                                                                                label: t("request_unapprove", "Request Unapprove"),
                                                                                type: "button",
                                                                                variant: "warning",
                                                                                onClick: () => openAlterationDialog(variation, "unapprove"),
                                                                            },
                                                                        ]
                                                                        : [
                                                                            {
                                                                                label: t("request_pending", "طلب قيد الانتظار"),
                                                                                type: "button",
                                                                                variant: "ghost",
                                                                                disabled: true,
                                                                            },
                                                                        ]
                                                                    ),
                                                                ]
                                                                : [
                                                                    ...(canEditVariation &&
                                                                        !(isProjectManager && ["pending_gm_initial", "pending_supervisor", "pending_owner_consultant", "pending_general_manager_final"].includes(status)) &&
                                                                        (!isStaff || canStaffEditVariation(variation))
                                                                        ? [{ label: t("edit"), to: `/variations/${variation.id}/notice`, type: "link" }]
                                                                        : []),
                                                                    ...(isProjectManager && status === "pending_supervisor" && !variation.pending_alteration_request
                                                                        ? [{
                                                                            label: t("request_unapprove", "Request Unapprove"),
                                                                            type: "button",
                                                                            variant: "warning",
                                                                            onClick: () => openAlterationDialog(variation, "unapprove"),
                                                                        }]
                                                                        : []),
                                                                ]
                                                            ),
                                                            ...(canApproveThis
                                                                ? [
                                                                    {
                                                                        label: t("approve"),
                                                                        type: "button",
                                                                        variant: "success",
                                                                        onClick: () => askApproveVariation(variation),
                                                                        disabled: !!approvingVariationId,
                                                                    },
                                                                ]
                                                                : []),
                                                            ...(canRejectThis
                                                                ? [
                                                                    {
                                                                        label: t("reject"),
                                                                        type: "button",
                                                                        variant: "danger",
                                                                        onClick: () => askRejectVariation(variation),
                                                                        disabled: !!rejectingVariationId,
                                                                    },
                                                                ]
                                                                : []),
                                                            ...(canDirectUnapproveThis
                                                                ? [
                                                                    {
                                                                        label: t("unapprove", "Unapprove"),
                                                                        type: "button",
                                                                        variant: "warning",
                                                                        onClick: () => handleUnapproveVariation(variation),
                                                                        disabled: unapprovingVariationId === variation.id,
                                                                    },
                                                                ]
                                                                : []),
                                                            ...(!isStaff && canRequestUnapproveThis
                                                                ? [
                                                                    {
                                                                        label: t("request_unapprove", "Request Unapprove"),
                                                                        type: "button",
                                                                        variant: "warning",
                                                                        onClick: () => openAlterationDialog(variation, "unapprove"),
                                                                    },
                                                                ]
                                                                : []),
                                                            ...(isGeneralManager && (status === "approved" || status === "final_approved")
                                                                ? [
                                                                    {
                                                                        label: t("add_post_approval_discount"),
                                                                        type: "button",
                                                                        variant: "primary",
                                                                        onClick: () => { setDiscountDialogVariation(variation); setPostApprovalDiscount(String(variation.post_approval_discount || '')); },
                                                                    },
                                                                    {
                                                                        label: t("revoke_approval", "إلغاء الاعتماد"),
                                                                        type: "button",
                                                                        variant: "warning",
                                                                        onClick: () => handleRevokeApproval(variation),
                                                                        disabled: revokingVariationId === variation.id,
                                                                    },
                                                                ]
                                                                : []),
                                                            {
                                                                label: singleLoading === variation.id
                                                                    ? t("downloading", "Downloading...")
                                                                    : t("download_variation_doc_clean", "Download Variation Doc (No Signatures)"),
                                                                type: "button",
                                                                onClick: () => downloadSingle(variation, { hideSignatures: true }),
                                                                disabled: singleLoading === variation.id,
                                                            },
                                                            {
                                                                label: singleLoading === variation.id
                                                                    ? t("downloading", "Downloading...")
                                                                    : t("download_variation_doc_signed", "Download Variation Doc (With Signatures)"),
                                                                type: "button",
                                                                onClick: () => downloadSingle(variation, { hideSignatures: false }),
                                                                disabled: singleLoading === variation.id,
                                                            },
                                                        ]
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Print-only summary — hidden in browser, visible when printing */}
                    <div className="tpw-print-only" style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', border: '1.5px solid #d8c9b3', borderRadius: '12px', overflow: 'hidden', minHeight: '130px' }}>
                            {/* Left — dark panel */}
                            <div style={{ flex: '0 0 42%', background: '#17202f', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '7pt', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {t("approved_amount", "Approved Amount")}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px' }}>
                                        <span style={{ fontSize: '26pt', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
                                            {parseFloat(v(variationStats.totalAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span style={{ fontSize: '12pt', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>AED</span>
                                    </div>
                                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '20px', padding: '2px 9px', fontSize: '6.5pt', fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {vatLabel}
                                        </span>
                                        <span style={{ fontSize: '7.5pt', color: 'rgba(255,255,255,0.4)' }}>
                                            {variationStats.approved} {t("variations", "variations")} · {t("approved").toLowerCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* Right — light panel */}
                            <div style={{ flex: 1, background: '#fff', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '8pt', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                        {t("total")} {t("variations", "Variations")}
                                    </span>
                                    <span style={{ fontSize: '24pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>
                                        {variationStats.total}
                                    </span>
                                </div>
                                <div style={{ height: '10px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden', margin: '12px 0 14px' }}>
                                    <div style={{ display: 'flex', height: '100%' }}>
                                        <div style={{ width: `${variationStats.total > 0 ? (variationStats.approved / variationStats.total) * 100 : 0}%`, background: '#10b981' }} />
                                        <div style={{ width: `${variationStats.total > 0 ? (variationStats.pending / variationStats.total) * 100 : 0}%`, background: '#f59e0b' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '28px' }}>
                                    {[
                                        { dot: '#10b981', label: t("approved"), value: variationStats.approved },
                                        { dot: '#f59e0b', label: t("pending"), value: variationStats.pending },
                                        { dot: '#9ca3af', label: t("cancelled"), value: variationStats.rejected },
                                    ].map(({ dot, label, value }) => (
                                        <div key={label}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '6.5pt', fontWeight: 700, color: dot, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                                                {label}
                                            </div>
                                            <div style={{ fontSize: '18pt', fontWeight: 900, color: '#17202f', lineHeight: 1 }}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                    </TabPrintWrapper>
                </>
            ) : (
                <div className="prj-empty-state">{t("no_variations")}</div>
            )}

            {actionVariation && getVariationStatus(actionVariation) === "pending_gm_initial" && (
                <div className="variations-tab__snapshot-document">
                    <VariationPrintDocument
                        ref={gmInitialSnapshotRef}
                        variation={actionVariation}
                        project={project}
                        companyInfo={null}
                        noticeData={null}
                        consultantStampUrl={null}
                        gmSignatureUrl={null}
                        hideSignatures={false}
                    />
                </div>
            )}

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
                open={!!discountDialogVariation}
                title={t('add_post_approval_discount')}
                desc={<div><p className="ds-mb-3">{t('post_approval_discount_dialog_desc')}</p><label className="var-dialog-label">{t('discount_amount')}</label><input className="prj-input ds-w-full ds-mt-2" type="number" min="0.01" step="0.01" value={postApprovalDiscount} onChange={(e) => setPostApprovalDiscount(e.target.value)} placeholder={t('post_approval_discount_placeholder')} /></div>}
                confirmLabel={t('add_discount_confirm')}
                cancelLabel={t('cancel')}
                onClose={() => { if (!savingPostApprovalDiscount) { setDiscountDialogVariation(null); setPostApprovalDiscount(''); } }}
                onConfirm={handleAddPostApprovalDiscount}
                busy={savingPostApprovalDiscount}
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

            <Dialog
                open={rejectVariationConfirmOpen}
                title={t("reject_variation")}
                desc={
                    <div>
                        <p className="ds-mb-3">{t("reject_project_manager_confirmation")}</p>
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

            <Dialog
                open={hiddenFeeRejectDialogOpen}
                title={t("reject_hidden_fee", "Reject hidden fee")}
                desc={
                    <div>
                        <p className="ds-mb-3">
                            {t("reject_hidden_fee_confirmation", "Are you sure you want to reject the hidden consultant fee? Please enter the rejection reason below.")}
                        </p>
                        <textarea
                            className="prj-input ds-w-full ds-mt-2"
                            rows={4}
                            value={hiddenFeeRejectionReason}
                            onChange={(e) => setHiddenFeeRejectionReason(e.target.value)}
                            placeholder={t("rejection_reason_placeholder")}
                            required
                        />
                    </div>
                }
                confirmLabel={processingHiddenFeeAction ? t("rejecting") : t("reject")}
                cancelLabel={t("cancel")}
                onClose={() => {
                    if (!processingHiddenFeeAction) {
                        setHiddenFeeRejectDialogOpen(false);
                        setHiddenFeeActionVariation(null);
                        setHiddenFeeRejectionReason("");
                    }
                }}
                onConfirm={handleRejectHiddenFee}
                danger
                busy={!!processingHiddenFeeAction}
            />

            <Dialog
                open={bulkRejectVariationsConfirmOpen}
                title={t("bulk_reject")}
                desc={
                    <div>
                        <p className="ds-mb-3">
                            {t("bulk_reject_confirmation")} <strong>{selectedVariationIds.size}</strong> {t("variations_count")}؟
                        </p>
                        <p className="ds-mb-2 ds-text-sm ds-text-muted">{t("rejection_reason_required")}</p>
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
                open={bulkFinalApproveVariationsConfirmOpen}
                title={t("bulk_final_approve", "Bulk Final Approve")}
                desc={
                    <>
                        {t("bulk_final_approve_confirmation", "Are you sure you want to final approve the selected variations regardless of their current status?")} <strong>{selectedVariationIds.size}</strong> {t("variations_count")}
                    </>
                }
                confirmLabel={bulkFinalApprovingVariations ? t("approving") : t("final_approve_selected", "Final approve selected")}
                cancelLabel={t("cancel")}
                onClose={() => !bulkFinalApprovingVariations && setBulkFinalApproveVariationsConfirmOpen(false)}
                onConfirm={handleBulkFinalApproveVariations}
                busy={bulkFinalApprovingVariations}
            />

            <Dialog
                open={deleteVariationsConfirmOpen}
                title={t("delete_variations")}
                desc={
                    <div>
                        <p>{t("confirm_delete_variations", { count: selectedVariationIds.size })}</p>
                        <p className="ds-mt-2 ds-text-sm ds-text-muted">{t("delete_warning")}</p>
                    </div>
                }
                confirmLabel={t("delete")}
                cancelLabel={t("cancel")}
                onClose={() => !deletingVariations && setDeleteVariationsConfirmOpen(false)}
                onConfirm={handleDeleteVariations}
                busy={deletingVariations}
                danger
            />

            {/* Alteration Request Dialog (staff → PM) */}
            <Dialog
                open={alterationDialogOpen}
                title={getAlterationDialogTitle()}
                desc={
                    <div>
                        <p className="ds-mb-3">
                            {getAlterationDialogDesc()}
                        </p>
                        <textarea
                            className="prj-input ds-w-full ds-mt-2"
                            rows={4}
                            value={alterationReason}
                            onChange={(e) => setAlterationReason(e.target.value)}
                            placeholder={t("alteration_reason_placeholder", "اذكر سبب طلبك...")}
                            required
                        />
                    </div>
                }
                confirmLabel={submittingAlteration ? t("sending", "جارٍ الإرسال...") : t("send_request", "إرسال الطلب")}
                cancelLabel={t("cancel")}
                onClose={() => {
                    if (!submittingAlteration) {
                        setAlterationDialogOpen(false);
                        setAlterationReason("");
                        setAlterationVariation(null);
                    }
                }}
                onConfirm={handleSubmitAlterationRequest}
                busy={submittingAlteration}
                danger={alterationRequestType === "delete"}
            />

            {/* Draft Request Dialog (PM → draft creator) */}
            <Dialog
                open={!!draftRequestVariation}
                title={draftRequestKind === "submit" ? t("request_submission", "Request Submission") : t("request_changes", "Request Changes")}
                desc={
                    <div>
                        <p className="ds-mb-3">
                            {draftRequestKind === "submit"
                                ? t("request_submission_desc", "This will notify the draft's creator to submit it for approval.")
                                : t("request_changes_desc", "This will notify the draft's creator to make changes to it.")}
                        </p>
                        <textarea
                            className="prj-input ds-w-full ds-mt-2"
                            rows={4}
                            value={draftRequestMessage}
                            onChange={(e) => setDraftRequestMessage(e.target.value)}
                            placeholder={t("message", "Message")}
                        />
                    </div>
                }
                confirmLabel={sendingDraftRequest ? t("sending", "Sending...") : t("send", "Send")}
                cancelLabel={t("cancel")}
                onClose={() => {
                    if (!sendingDraftRequest) {
                        setDraftRequestVariation(null);
                        setDraftRequestMessage("");
                    }
                }}
                onConfirm={handleSendDraftRequest}
                busy={sendingDraftRequest}
            />
        </div>
    );
});

export default VariationsTab;
