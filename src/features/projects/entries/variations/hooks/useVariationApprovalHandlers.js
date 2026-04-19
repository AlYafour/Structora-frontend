/**
 * useVariationApprovalHandlers Hook
 *
 * Manages approval/rejection handlers for variations
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateProjectQueries } from "../../../hooks/useProjectData";
import { projectApi } from "../../../../../services";

export const useVariationApprovalHandlers = (variation, project, toast, t, onSuccess) => {
  const queryClient = useQueryClient();

  // Invalidate all project-related caches so every tab gets fresh data.
  const invalidateAndRefresh = () => {
    if (project?.id) {
      invalidateProjectQueries(queryClient, project.id);
    }
    queryClient.invalidateQueries({ queryKey: ['variations'] });
    if (onSuccess) onSuccess();
  };
  const [processingApproval, setProcessingApproval] = useState(false);
  const [actionNotes, setActionNotes] = useState("");

  // Dialog states
  const [approveProjectManagerDialogOpen, setApproveProjectManagerDialogOpen] = useState(false);
  const [rejectProjectManagerDialogOpen, setRejectProjectManagerDialogOpen] = useState(false);
  const [approveGeneralManagerInitialDialogOpen, setApproveGeneralManagerInitialDialogOpen] = useState(false);
  const [rejectGeneralManagerDialogOpen, setRejectGeneralManagerDialogOpen] = useState(false);
  const [confirmOwnerApprovalDialogOpen, setConfirmOwnerApprovalDialogOpen] = useState(false);
  const [confirmConsultantApprovalDialogOpen, setConfirmConsultantApprovalDialogOpen] = useState(false);
  const [approveGeneralManagerFinalDialogOpen, setApproveGeneralManagerFinalDialogOpen] = useState(false);

  // Approval handlers
  const handleApproveProjectManagerInitial = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.approveVariationProjectManager(project.id, variation.id);
      toast.success(t("variation_approved") || "Variation approved successfully");
      setApproveProjectManagerDialogOpen(false);
      setActionNotes("");
      invalidateAndRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || t("approve_error"));
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleApproveGeneralManagerInitial = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.approveVariationGeneralManagerInitial(project.id, variation.id);
      toast.success(t("variation_approved") || "Variation approved successfully");
      setApproveGeneralManagerInitialDialogOpen(false);
      setActionNotes("");
      invalidateAndRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || t("approve_error"));
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleConfirmOwnerApproval = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.confirmOwnerApproval(project.id, variation.id);
      toast.success(t("owner_approval_confirmed") || "Owner approval confirmed");
      setConfirmOwnerApprovalDialogOpen(false);
      setActionNotes("");
      invalidateAndRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || t("confirm_error"));
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleConfirmConsultantApproval = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.confirmConsultantApproval(project.id, variation.id);
      toast.success(t("consultant_approval_confirmed") || "Consultant approval confirmed");
      setConfirmConsultantApprovalDialogOpen(false);
      setActionNotes("");
      invalidateAndRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || t("confirm_error"));
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleApproveGeneralManagerFinal = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.approveVariation(project.id, variation.id);
      toast.success(t("variation_final_approved") || "Variation finally approved");
      setApproveGeneralManagerFinalDialogOpen(false);
      setActionNotes("");
      invalidateAndRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || t("approve_error"));
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectProjectManager = async () => {
    if (!variation || !project) return;
    if (!actionNotes?.trim()) {
      toast.error(t("rejection_reason_required") || "Rejection reason is required");
      return;
    }
    setProcessingApproval(true);
    try {
      await projectApi.rejectVariationProjectManager(project.id, variation.id, actionNotes.trim());
      toast.success(t("variation_rejected") || "Variation rejected");
      setRejectProjectManagerDialogOpen(false);
      setActionNotes("");
      invalidateAndRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || t("reject_error"));
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectGeneralManager = async () => {
    if (!variation || !project) return;
    if (!actionNotes?.trim()) {
      toast.error(t("rejection_reason_required") || "Rejection reason is required");
      return;
    }
    setProcessingApproval(true);
    try {
      await projectApi.rejectVariation(project.id, variation.id, actionNotes.trim());
      toast.success(t("variation_rejected") || "Variation rejected");
      setRejectGeneralManagerDialogOpen(false);
      setActionNotes("");
      invalidateAndRefresh();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.detail || t("reject_error"));
    } finally {
      setProcessingApproval(false);
    }
  };

  return {
    processingApproval,
    actionNotes,
    setActionNotes,
    dialogStates: {
      approveProjectManagerDialogOpen,
      setApproveProjectManagerDialogOpen,
      rejectProjectManagerDialogOpen,
      setRejectProjectManagerDialogOpen,
      approveGeneralManagerInitialDialogOpen,
      setApproveGeneralManagerInitialDialogOpen,
      rejectGeneralManagerDialogOpen,
      setRejectGeneralManagerDialogOpen,
      confirmOwnerApprovalDialogOpen,
      setConfirmOwnerApprovalDialogOpen,
      confirmConsultantApprovalDialogOpen,
      setConfirmConsultantApprovalDialogOpen,
      approveGeneralManagerFinalDialogOpen,
      setApproveGeneralManagerFinalDialogOpen,
    },
    handlers: {
      handleApproveProjectManagerInitial,
      handleApproveGeneralManagerInitial,
      handleConfirmOwnerApproval,
      handleConfirmConsultantApproval,
      handleApproveGeneralManagerFinal,
      handleRejectProjectManager,
      handleRejectGeneralManager,
    },
  };
};
