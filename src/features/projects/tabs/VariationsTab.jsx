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
    const isCompanySuperAdmin = user?.role?.name === "company_super_admin";
    const isSuperAdmin = user?.is_superuser;
    const isGeneralManager = isCompanySuperAdmin || isSuperAdmin;
    const canApproveVariations = isGeneralManager || isProjectManager;
    const canRejectAnyStatus = isGeneralManager || isSuperAdmin;
    // Staff = not PM, not GM/admin, not superuser
    const isStaff = !isProjectManager && !isGeneralManager;

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

    const getVariationStatus = (variation) => {
        return variation.workflow_status || variation.status || "draft";
    };

    const checkRequiresEdit = (variation) => {
        const status = getVariationStatus(variation);
        return status === "requires_edit";
    };

    const approveVariationByRole = async (variation) => {
        if (!variation?.id || !projectId) return;

        const status = getVariationStatus(variation);

        if (isProjectManager) {
            return projectApi.approveVariationProjectManager(projectId, variation.id);
        }

        if (isGeneralManager) {
            if (status === "pending_general_manager_initial") {
                return projectApi.approveVariationGeneralManagerInitial(projectId, variation.id);
            }

            return projectApi.approveVariation(projectId, variation.id);
        }

        throw new Error(t("permission_denied", "Permission denied"));
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
                let ref = "";

                // Get reference number from description JSON
                if (v.description) {
                    try {
                        const parsed = JSON.parse(v.description);
                        ref = parsed.reference_no || "";
                    } catch (e) {
                        ref = "";
                    }
                }

                // Fallbacks
                ref =
                    ref ||
                    v.variation_number ||
                    v.modification_number ||
                    "";

                // Extract numeric part from VAR0001
                const match = String(ref).match(/\d+/);

                return match ? parseInt(match[0], 10) : 0;
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
        if (!variations) return { total: 0, approved: 0, rejected: 0, pending: 0, totalAmount: 0 };

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

        const totalAmount = approved.reduce((sum, v) => {
            const totalForVariation = parseFloat(v.total_amount || v.final_amount || 0);
            return sum + (isNaN(totalForVariation) ? 0 : totalForVariation);
        }, 0);

        return {
            total: variations.length,
            approved: approved.length,
            rejected: rejected.length,
            pending: pending.length,
            totalAmount,
        };
    }, [variations]);

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

        if (!canRejectAnyStatus && workflowStatus === "pending_project_manager") {
            showToast("error", t("cannot_reject_pending_project_manager"));
            return;
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

    const openAlterationDialog = (variation, requestType) => {
        setAlterationVariation(variation);
        setAlterationRequestType(requestType);
        setAlterationReason("");
        setAlterationDialogOpen(true);
    };

    const handleSubmitAlterationRequest = async () => {
        if (!alterationVariation?.id || !projectId || !alterationReason.trim()) return;
        try {
            setSubmittingAlteration(true);
            await projectApi.createAlterationRequest(projectId, alterationVariation.id, {
                request_type: alterationRequestType,
                reason: alterationReason.trim(),
            });
            showToast("success", t("alteration_request_sent", "تم إرسال الطلب إلى مدير المشروع"));
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
                await projectApi.rejectVariation(projectId, id, rejectionReason.trim());
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

                    if (checkRequiresEdit(variation)) {
                        fail += 1;
                        continue;
                    }

                    if (isProjectManager) {
                        if (status === "pending_general_manager_initial") {
                            gmInitialPendingCount += 1;
                            fail += 1;
                            continue;
                        }

                        if (
                            (status === "draft" || status === "pending_project_manager") &&
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

                    if (isGeneralManager) {
                        if (status === "pending_general_manager_initial") {
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
                        "General Manager initial approval is pending. Project Manager cannot approve these variation(s) at this stage."
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

                if (status === "approved" || status === "final_approved") {
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

    const { downloadZip, zipLoading } = useDownloadVariationPDFs(projectId);
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

    const canStaffDeleteVariation = (variation) => {
        const s = getVariationStatus(variation);
        return s === "draft" || s === "pending_project_manager";
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
            status === "rejected_by_general_manager" ||
            status === "rejected" ||
            status === "approved" ||
            status === "final_approved"
        ) {
            return false;
        }

        if (isProjectManager) {
            if (
                (status === "draft" || status === "pending_project_manager") &&
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

        if (isGeneralManager) {
            return (
                status === "pending_general_manager_initial" ||
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
        if (!canApproveVariations) return false;

        const status = getVariationStatus(variation);

        if (status === "rejected_by_project_manager" || status === "rejected_by_general_manager" || status === "rejected") {
            return false;
        }

        if (canRejectAnyStatus) {
            return status !== "final_approved" && status !== "approved";
        }

        const workflowStatus = variation.workflow_status || variation.status || "";

        if (status === "approved" || status === "final_approved" || status === "rejected") {
            return false;
        }

        if (workflowStatus === "pending_project_manager") {
            return false;
        }

        return true;
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
                        <button
                            onClick={handlePrint}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1.5px solid #d1d5db',
                                background: 'transparent',
                                color: '#6b7280',
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
                                <path d="M12 17V3M6 11l6 6 6-6" />
                                <path d="M4 21h16" />
                            </svg>
                            {t("download_pdf", "Download PDF")}
                        </button>
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

                        <MetricCard variant="emerald" icon="check" label={t("approved")} value={variationStats.approved} />
                        <MetricCard variant="amber" icon="clock" label={t("pending")} value={variationStats.pending} />
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
                                    const statusLabel = getApprovalStatusLabel(status, isAR ? "ar" : "en");
                                    const canApproveThis = canApproveThisVariation(variation);
                                    const canRejectThis = canRejectThisVariation(variation);

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

                                    const displayNumber = referenceNo || variation.variation_number || variation.modification_number || `VAR-${variation.id}`;

                                    return (
                                        <tr
                                            key={variation.id}
                                            className={isSelected ? "is-selected" : ""}
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
                                                {renderMoney(variation.total_amount || variation.final_amount || 0)}
                                                <span className="prj-info-value__sub ds-block ds-text-xs ds-text-muted">
                                                    {t('excluding_vat')} • {t('including_consultant_fees')}
                                                </span>
                                            </td>

                                            <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                                                <ActionMenu
                                                    items={[
                                                        // Staff: show request-edit/delete when PM has initially approved; hide direct edit/delete
                                                        ...(isStaff && status === "pending_general_manager_initial"
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
                                                                ...(canEditVariation && !(isStaff && status === "pending_general_manager_initial")
                                                                    ? [{ label: t("edit"), to: `/variations/${variation.id}/notice`, type: "link" }]
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
                                                        ...(isGeneralManager && (status === "approved" || status === "final_approved")
                                                            ? [
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
                                                            label: t("download_pdf"),
                                                            to: `/variations/${variation.id}/view?project=${projectId}`,
                                                            type: "link",
                                                            target: "_blank",
                                                        },
                                                    ]}
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
                    </TabPrintWrapper>
                </>
            ) : (
                <div className="prj-empty-state">{t("no_variations")}</div>
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
                title={
                    alterationRequestType === "edit"
                        ? t("request_edit", "طلب تعديل أمر التغيير")
                        : t("request_delete", "طلب حذف أمر التغيير")
                }
                desc={
                    <div>
                        <p className="ds-mb-3">
                            {alterationRequestType === "edit"
                                ? t("request_edit_desc", "سيتم إرسال طلب التعديل إلى مدير المشروع للموافقة عليه.")
                                : t("request_delete_desc", "سيتم إرسال طلب الحذف إلى مدير المشروع للموافقة عليه.")}
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
        </div>
    );
});

export default VariationsTab;
