import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '../../../components/common/Dialog';
import { projectApi } from '../../../services/projects';
import { handleError } from '../../../utils/errorHandler';
import { logger } from '../../../utils/logger';

/**
 * ApprovalDialog Component
 * Unified dialog for approve, reject, and final approve actions
 * @param {Object} props
 * @param {'approve'|'reject'|'finalApprove'} props.type - Dialog type
 * @param {number|null} props.projectId - Project ID to act on
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSuccess - Success callback (reload projects)
 * @param {Function} props.showToast - Toast notification function
 */
const ApprovalDialog = ({
  type,
  projectId,
  open,
  onClose,
  onSuccess,
  showToast,
}) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const config = {
    approve: {
      title: t("approve_stage"),
      description: t("approve_stage_confirmation"),
      placeholder: t("approval_notes_optional"),
      confirmLabel: t("approve"),
      successMessage: t("project_approved_successfully"),
      required: false,
      danger: false,
      apiCall: (id, notes) => projectApi.approve(id, notes || ""),
    },
    reject: {
      title: t("reject"),
      description: t("reject_confirmation"),
      placeholder: t("rejection_notes_required"),
      confirmLabel: t("reject"),
      successMessage: t("project_rejected_successfully"),
      required: true,
      danger: true,
      apiCall: (id, notes) => projectApi.reject(id, notes),
    },
    finalApprove: {
      title: t("final_approve"),
      description: t("final_approve_confirmation"),
      warning: t("final_approve_warning"),
      placeholder: t("approval_notes_optional"),
      confirmLabel: t("final_approve"),
      successMessage: t("project_final_approved_successfully"),
      required: false,
      danger: false,
      apiCall: (id, notes) => projectApi.finalApprove(id, notes || ""),
    },
  };

  const currentConfig = config[type];

  // Don't render if no valid type (dialog not yet opened)
  if (!currentConfig) return null;

  const handleClose = () => {
    if (!processing) {
      setNotes("");
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (!projectId) return;

    // Validate required notes
    if (currentConfig.required && !notes.trim()) {
      showToast("error", currentConfig.placeholder);
      return;
    }

    try {
      setProcessing(true);
      await currentConfig.apiCall(projectId, notes);
      setNotes("");
      onClose();
      showToast("success", currentConfig.successMessage);
      onSuccess(); // Reload projects
    } catch (error) {
      const handledError = handleError(error, `ProjectsPage.${type}`);
      logger.error(`${type} failed`, handledError);
      showToast("error", handledError.message || t("error"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      title={currentConfig.title}
      desc={
        <div>
          <p>{currentConfig.description}</p>
          {currentConfig.warning && (
            <p className="dialog-warning">{currentConfig.warning}</p>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={currentConfig.placeholder}
            required={currentConfig.required}
            className="dialog-textarea"
          />
        </div>
      }
      confirmLabel={currentConfig.confirmLabel}
      cancelLabel={t("cancel")}
      onClose={handleClose}
      onConfirm={handleConfirm}
      danger={currentConfig.danger}
      busy={processing}
    />
  );
};

export default ApprovalDialog;
