/**
 * Variation Status Helpers
 *
 * Utilities for handling variation status and permissions
 */

import { FaCheckCircle, FaTimesCircle, FaInfoCircle } from "react-icons/fa";

/**
 * Gets the display label for a variation status
 * @param {string} status - Variation status
 * @param {Function} t - Translation function
 * @returns {string} Translated status label
 */
export const getStatusLabel = (status, t) => {
  const statusLabels = {
    'draft': t("draft"),
    'pending_project_manager': t("pending_project_manager"),
    'rejected_by_project_manager': t("rejected_by_project_manager"),
    'pending_gm_initial': t("pending_gm_initial"),
    'rejected_by_gm_initial': t("rejected_by_gm_initial"),
    'pending_supervisor': t("pending_supervisor"),
    'rejected_by_supervisor': t("rejected_by_supervisor"),
    'pending_owner_consultant': t("pending_owner_consultant"),
    'pending_official_document': t("pending_official_document"),
    'returned_for_edit': t("returned_for_edit"),
    'rejected_by_owner_consultant': t("rejected_by_owner_consultant"),
    'pending_general_manager_final': t("pending_general_manager_final"),
    'approved': t("approved"),
    'rejected': t("rejected"),
  };
  return statusLabels[status] || status;
};

/**
 * Gets the status configuration (color, background, icon)
 * @param {string} status - Variation status
 * @returns {Object} Status configuration with bg, color, and icon
 */
export const getStatusConfig = (status) => {
  if (status === 'approved') {
    return {
      bg: 'var(--success-50)',
      color: 'var(--success-600)',
      icon: FaCheckCircle
    };
  }
  if (status?.includes('rejected')) {
    return {
      bg: 'var(--error-50)',
      color: 'var(--error-600)',
      icon: FaTimesCircle
    };
  }
  return {
    bg: 'var(--warning-50)',
    color: 'var(--warning-600)',
    icon: FaInfoCircle
  };
};

/**
 * Checks if a variation is finally approved
 * @param {Object} variation - Variation object
 * @returns {boolean} True if finally approved
 */
export const isFinallyApproved = (variation) => {
  const status = variation?.status || variation?.workflow_status || 'draft';
  return !!variation?.general_manager_final_approved_by || status === 'approved';
};

/**
 * Checks if a variation is rejected
 * @param {Object} variation - Variation object
 * @returns {boolean} True if rejected
 */
export const isRejected = (variation) => {
  const status = variation?.status || variation?.workflow_status || 'draft';
  return status === 'rejected_by_project_manager' ||
         status === 'rejected_by_supervisor' ||
         status === 'rejected_by_gm_initial' ||
         status === 'rejected_by_owner_consultant' ||
         status === 'rejected';
};

/**
 * Calculates permission flags for variation actions
 * @param {Object} variation - Variation object
 * @param {Object} user - Current user object
 * @returns {Object} Permission flags
 */
export const calculatePermissions = (variation, user, alterationRequests = [], options = {}) => {
  const status = variation?.status || variation?.workflow_status || 'draft';
  const isProjectManager = user?.role?.name === 'Manager';
  const isSupervisor = user?.role?.name === 'Supervisor';
  const isCompanySuperAdmin = user?.role?.name === 'company_super_admin';
  const isSuperAdminUser = user?.is_superuser;
  const isGeneralManager = isCompanySuperAdmin || isSuperAdminUser;
  const canManageReturnedVariation = isProjectManager || isSupervisor || isGeneralManager;

  const finallyApproved = isFinallyApproved(variation);
  const rejected = isRejected(variation);
  const isStaff = !isProjectManager && !isSupervisor && !isGeneralManager;
  const hasAcceptedEditRequest = alterationRequests.some((request) =>
    request?.request_type === 'edit' &&
    request?.status === 'accepted' &&
    (!request?.requested_by || !user?.id || String(request.requested_by) === String(user.id))
  );
  const hasVariationEditPermission = options.hasVariationEditPermission === true;
  const approvalStageStatuses = [
    'pending_project_manager',
    'pending_gm_initial',
    'pending_supervisor',
    'pending_owner_consultant',
    'pending_official_document',
    'pending_general_manager_final',
  ];
  const isApprovalStage = approvalStageStatuses.includes(status);

  // PM is locked out once they have approved — they must unapprove or request-unapprove first.
  const pmEditBlocked = isProjectManager && (
    status === 'pending_gm_initial' ||
    status === 'pending_supervisor' ||
    status === 'pending_owner_consultant' ||
    status === 'pending_general_manager_final'
  );

  // Editing variation content requires the create/edit permission, or an accepted edit request.
  const canEdit = !finallyApproved &&
    !pmEditBlocked &&
    (
      hasVariationEditPermission ||
      (status === 'returned_for_edit' && canManageReturnedVariation) ||
      ((status === 'pending_supervisor' || status === 'pending_gm_initial') && hasAcceptedEditRequest)
    ) &&
    (!isStaff ||
      status === 'draft' ||
      status === 'pending_project_manager' ||
      status === 'rejected_by_project_manager' ||
      status === 'rejected_by_supervisor' ||
      status === 'rejected_by_gm_initial' ||
      status === 'returned_for_edit' ||
      status === 'rejected_by_owner_consultant' ||
      ((status === 'pending_supervisor' || status === 'pending_gm_initial') && hasAcceptedEditRequest));

  // Can approve/reject only if not rejected (must edit first if rejected)
  const canApproveOrReject = !rejected;

  return {
    canEdit: isGeneralManager && isApprovalStage && !finallyApproved
      ? true
      : status === 'rejected_by_owner_consultant' && isStaff
      ? true
      : status === 'returned_for_edit'
      ? canEdit
      : canEdit && !approvalStageStatuses.includes(status),
    canUploadSignedCopy: isStaff && (status === 'pending_official_document' || (status === 'approved' && variation?.updated_document_pending)),
    canRunSignedCopyAudit: isGeneralManager && status === 'pending_general_manager_final',
    canApproveProjectManager: canApproveOrReject && isProjectManager &&
      status === 'pending_project_manager' &&
      !variation?.project_manager_initial_approved_by &&
      !variation?.rejected_by,
    canRejectProjectManager: false,
    canConfirmOwnerApproval: canApproveOrReject && isProjectManager &&
      status === 'pending_owner_consultant' &&
      !variation?.owner_approval_confirmed,
    canConfirmConsultantApproval: canApproveOrReject && isProjectManager &&
      status === 'pending_owner_consultant' &&
      !variation?.consultant_approval_confirmed,
    canRejectOwnerConsultant: canApproveOrReject && isProjectManager &&
      status === 'pending_owner_consultant',
    canApproveGeneralManagerInitial: canApproveOrReject && isSupervisor &&
      status === 'pending_supervisor',
    canRejectGeneralManager: false,
    canApproveGMInitial: canApproveOrReject && isGeneralManager &&
      status === 'pending_gm_initial',
    canRejectGMInitial: false,
    canApproveGeneralManagerFinal: canApproveOrReject && isGeneralManager &&
      status === 'pending_general_manager_final' &&
      !variation?.general_manager_final_approved_by,
    canReturnForEdit: (
      (isProjectManager && (status === 'pending_project_manager' || status === 'pending_owner_consultant')) ||
      (isGeneralManager && (status === 'pending_gm_initial' || status === 'pending_general_manager_final')) ||
      (isSupervisor && status === 'pending_supervisor')
    ),
    canEditReturnedVariation: status === 'returned_for_edit' && canEdit,
  };
};
