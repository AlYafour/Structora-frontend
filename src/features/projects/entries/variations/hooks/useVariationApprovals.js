import { useState } from "react";
import { projectApi } from "../../../../../services";

/**
 * Custom hook to manage variation approval actions
 */
export function useVariationApprovals(variation, project, onSuccess, onError) {
  const [processingApproval, setProcessingApproval] = useState(false);

  const handleApproveProjectManagerInitial = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.approveVariationProjectManager(project.id, variation.id);
      if (onSuccess) onSuccess("variation_approved");
    } catch (e) {
      if (onError) onError(e?.response?.data?.error || e?.response?.data?.detail);
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleApproveGeneralManagerInitial = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.approveVariationGeneralManagerInitial(project.id, variation.id);
      if (onSuccess) onSuccess("variation_approved");
    } catch (e) {
      if (onError) onError(e?.response?.data?.error || e?.response?.data?.detail);
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleConfirmOwnerApproval = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.confirmOwnerApproval(project.id, variation.id);
      if (onSuccess) onSuccess("owner_approval_confirmed");
    } catch (e) {
      if (onError) onError(e?.response?.data?.error || e?.response?.data?.detail);
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleConfirmConsultantApproval = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.confirmConsultantApproval(project.id, variation.id);
      if (onSuccess) onSuccess("consultant_approval_confirmed");
    } catch (e) {
      if (onError) onError(e?.response?.data?.error || e?.response?.data?.detail);
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleApproveGeneralManagerFinal = async () => {
    if (!variation || !project) return;
    setProcessingApproval(true);
    try {
      await projectApi.approveVariation(project.id, variation.id);
      if (onSuccess) onSuccess("variation_final_approved");
    } catch (e) {
      if (onError) onError(e?.response?.data?.error || e?.response?.data?.detail);
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectProjectManager = async (notes) => {
    if (!variation || !project) return;
    if (!notes?.trim()) {
      if (onError) onError("rejection_reason_required");
      return;
    }
    setProcessingApproval(true);
    try {
      await projectApi.rejectVariationProjectManager(project.id, variation.id, notes.trim());
      if (onSuccess) onSuccess("variation_rejected");
    } catch (e) {
      if (onError) onError(e?.response?.data?.error || e?.response?.data?.detail);
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectGeneralManager = async (notes) => {
    if (!variation || !project) return;
    if (!notes?.trim()) {
      if (onError) onError("rejection_reason_required");
      return;
    }
    setProcessingApproval(true);
    try {
      await projectApi.rejectVariation(project.id, variation.id, notes.trim());
      if (onSuccess) onSuccess("variation_rejected");
    } catch (e) {
      if (onError) onError(e?.response?.data?.error || e?.response?.data?.detail);
    } finally {
      setProcessingApproval(false);
    }
  };

  return {
    processingApproval,
    handleApproveProjectManagerInitial,
    handleApproveGeneralManagerInitial,
    handleConfirmOwnerApproval,
    handleConfirmConsultantApproval,
    handleApproveGeneralManagerFinal,
    handleRejectProjectManager,
    handleRejectGeneralManager,
  };
}
