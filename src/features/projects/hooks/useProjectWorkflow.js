/**
 * useProjectWorkflow - Extracts workflow dialog states and action handlers from ProjectView.
 * Manages: submit, approve, reject, final approve, delete, and error dialogs.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { projectApi } from "../../../services/projects";
import { logger } from "../../../utils/logger";
import { handleError } from "../../../utils/errorHandler";
import useTenantNavigate from '../../../hooks/useTenantNavigate';

export default function useProjectWorkflow(projectId, reload) {
  const { t } = useTranslation();
  const nav = useTenantNavigate();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [finalApproveDialogOpen, setFinalApproveDialogOpen] = useState(false);
  const [revokeFinalApprovalDialogOpen, setRevokeFinalApprovalDialogOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  const onDelete = async () => {
    if (!projectId) return;
    try {
      setDeleting(true);
      await projectApi.delete(projectId);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.removeQueries({ queryKey: ["project", projectId] });
      setConfirmOpen(false);
      nav("/projects");
    } catch (error) {
      const handledError = handleError(error, "ProjectView.onDelete");
      logger.error("Delete failed", handledError);
      setErrorMsg(handledError.message || t("delete_error"));
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const runAction = async (apiFn, dialogSetter, context) => {
    if (!projectId) return;
    try {
      setProcessingAction(true);
      await apiFn();
      dialogSetter(false);
      setActionNotes("");
      reload();
    } catch (error) {
      const handledError = handleError(error, context);
      logger.error(`${context} failed`, handledError);
      setErrorMsg(handledError.message || t("error"));
      dialogSetter(false);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSubmit = () =>
    runAction(() => projectApi.submit(projectId), setSubmitDialogOpen, "ProjectView.handleSubmit");

  const handleApprove = () =>
    runAction(() => projectApi.approve(projectId, actionNotes || ""), setApproveDialogOpen, "ProjectView.handleApprove");

  const handleReject = () => {
    if (!actionNotes.trim()) {
      setErrorMsg(t("rejection_notes_required") || "Rejection notes are required");
      return;
    }
    return runAction(() => projectApi.reject(projectId, actionNotes), setRejectDialogOpen, "ProjectView.handleReject");
  };

  const handleFinalApprove = () =>
    runAction(() => projectApi.finalApprove(projectId, actionNotes || ""), setFinalApproveDialogOpen, "ProjectView.handleFinalApprove");

  const handleRevokeFinalApproval = () =>
    runAction(() => projectApi.revokeFinalApproval(projectId, actionNotes || ""), setRevokeFinalApprovalDialogOpen, "ProjectView.handleRevokeFinalApproval");

  return {
    confirmOpen, setConfirmOpen, deleting,
    errorMsg, setErrorMsg,
    submitDialogOpen, setSubmitDialogOpen,
    approveDialogOpen, setApproveDialogOpen,
    rejectDialogOpen, setRejectDialogOpen,
    finalApproveDialogOpen, setFinalApproveDialogOpen,
    revokeFinalApprovalDialogOpen, setRevokeFinalApprovalDialogOpen,
    actionNotes, setActionNotes,
    processingAction,
    onDelete, handleSubmit, handleApprove, handleReject, handleFinalApprove, handleRevokeFinalApproval,
  };
}
