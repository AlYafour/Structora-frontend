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
    'pending_general_manager_initial': t("pending_general_manager_initial"),
    'rejected_by_general_manager': t("rejected_by_general_manager"),
    'pending_owner_consultant': t("pending_owner_consultant"),
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
         status === 'rejected_by_general_manager' ||
         status === 'rejected';
};

/**
 * Calculates permission flags for variation actions
 * @param {Object} variation - Variation object
 * @param {Object} user - Current user object
 * @returns {Object} Permission flags
 */
export const calculatePermissions = (variation, user, alterationRequests = []) => {
  const status = variation?.status || variation?.workflow_status || 'draft';
  const isProjectManager = user?.role?.name === 'Manager';
  const isSupervisor = user?.role?.name === 'Supervisor';
  const isCompanySuperAdmin = user?.role?.name === 'company_super_admin';
  const isSuperAdminUser = user?.is_superuser;
  const isGeneralManager = isCompanySuperAdmin || isSuperAdminUser;

  const finallyApproved = isFinallyApproved(variation);
  const rejected = isRejected(variation);
  const isStaff = !isProjectManager && !isSupervisor && !isGeneralManager;
  const hasAcceptedEditRequest = alterationRequests.some((request) =>
    request?.request_type === 'edit' &&
    request?.status === 'accepted' &&
    (!request?.requested_by || !user?.id || String(request.requested_by) === String(user.id))
  );

  // Staff can only edit draft/pending_project_manager; privileged users can edit anything not finally approved
  const canEdit = !finallyApproved &&
    (!isStaff || status === 'draft' || status === 'pending_project_manager' ||
      (status === 'pending_general_manager_initial' && hasAcceptedEditRequest));

  // Can approve/reject only if not rejected (must edit first if rejected)
  const canApproveOrReject = !rejected;

  return {
    canEdit,
    canApproveProjectManager: canApproveOrReject && isProjectManager &&
      (status === 'draft' || status === 'pending_project_manager') &&
      !variation?.project_manager_initial_approved_by &&
      !variation?.rejected_by,
    canRejectProjectManager: canApproveOrReject && isProjectManager &&
      (status === 'draft' || status === 'pending_project_manager') &&
      !variation?.rejected_by,
    canConfirmOwnerApproval: canApproveOrReject && isProjectManager &&
      status === 'pending_owner_consultant' &&
      !variation?.owner_approval_confirmed,
    canConfirmConsultantApproval: canApproveOrReject && isProjectManager &&
      status === 'pending_owner_consultant' &&
      !variation?.consultant_approval_confirmed,
    canApproveGeneralManagerInitial: canApproveOrReject && isSupervisor &&
      status === 'pending_general_manager_initial',
    canRejectGeneralManager: canApproveOrReject && (isSupervisor || isGeneralManager) &&
      status === 'pending_general_manager_initial',
    canApproveGeneralManagerFinal: canApproveOrReject && isGeneralManager &&
      status !== 'approved' &&
      !variation?.general_manager_final_approved_by,
  };
};
