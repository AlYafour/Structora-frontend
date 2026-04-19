/**
 * useProgressForm Hook
 *
 * Composes useProgressFormState (state/input handling) with save/submit logic.
 * The public API remains unchanged for AddProgressPage.jsx consumers.
 */

import { useState } from 'react';
import { projectApi } from '../../../../../services/projects';
import { logger } from '../../../../../utils/logger';
import { handleError } from '../../../../../utils/errorHandler';
import { calculateCumulativeProgress, calculateWeightedAverage } from '../utils/progressCalculations';
import { useProgressFormState } from './useProgressFormState';

/**
 * @param {string} projectId
 * @param {Function} t - Translation function
 * @param {boolean} isRTL
 * @returns {Object} Form state and handlers (same shape as before)
 */
export function useProgressForm(projectId, t, isRTL) {
  const [submitting, setSubmitting] = useState(false);

  const {
    dialogOpen,
    editingId,
    latestProgress,
    formData,
    setFormData,
    setLatestProgress,
    handleChange,
    handleBlur,
    handleOpenDialog,
    handleCloseDialog: closeDialog,
  } = useProgressFormState(projectId, t);

  const handleCloseDialog = () => closeDialog(submitting);

  /**
   * Save progress entry
   */
  const handleSave = async (validate, variations, loadHistory, loadProjectData, setError, setSuccess, extractFileNameFromUrl) => {
    setError(null);
    setSuccess(null);

    if (!validate(formData, latestProgress, setError)) return;

    try {
      setSubmitting(true);

      // Check if we need to use FormData (if files are present)
      const hasNewFiles = formData.attachment_files && formData.attachment_files.length > 0;
      const hasFilesToDelete = formData.attachment_file_urls && formData.attachment_file_urls.length === 0 && editingId &&
                               (!formData.attachment_files || formData.attachment_files.length === 0);

      if (hasNewFiles || hasFilesToDelete || (formData.attachment_file_urls && formData.attachment_file_urls.length > 0)) {
        // Use FormData for file upload
        const formDataToSend = new FormData();

        // Add fields
        if (formData.technical_progress_current) {
          formDataToSend.append('technical_progress_current', parseFloat(formData.technical_progress_current));
        }
        if (formData.technical_progress_approved) {
          formDataToSend.append('technical_progress_approved', parseFloat(formData.technical_progress_approved));
        }
        if (formData.owner_technical_current) {
          formDataToSend.append('owner_technical_current', parseFloat(formData.owner_technical_current));
        }
        if (formData.bank_technical_current) {
          formDataToSend.append('bank_technical_current', parseFloat(formData.bank_technical_current));
        }
        if (formData.variations_technical_current) {
          formDataToSend.append('variations_technical_current', parseFloat(formData.variations_technical_current));
        }

        // Actual current fields (field observation)
        if (formData.owner_actual_current) {
          formDataToSend.append('owner_actual_current', parseFloat(formData.owner_actual_current));
        }
        if (formData.bank_actual_current) {
          formDataToSend.append('bank_actual_current', parseFloat(formData.bank_actual_current));
        }

        // Individual Variation Progress
        if (formData.variation_progress && Object.keys(formData.variation_progress).length > 0) {
          const variationProgressData = calculateCumulativeProgress(formData.variation_progress, latestProgress);

          if (Object.keys(variationProgressData).length > 0) {
            formDataToSend.append('variation_progress', JSON.stringify(variationProgressData));

            // Calculate and append variations_technical_current
            const variationsTechnicalCurrent = calculateWeightedAverage(variationProgressData, variations);
            if (variationsTechnicalCurrent > 0) {
              formDataToSend.append('variations_technical_current', variationsTechnicalCurrent.toFixed(2));
            }

            // Calculate and append variations_actual_current
            const variationsActualCurrent = calculateWeightedAverage(variationProgressData, variations, 'actual_current');
            if (variationsActualCurrent > 0) {
              formDataToSend.append('variations_actual_current', variationsActualCurrent.toFixed(2));
            }
          }
        }

        formDataToSend.append('entry_date', formData.entry_date);
        formDataToSend.append('notes', formData.notes || '');

        // Append multiple files
        if (formData.attachment_files && formData.attachment_files.length > 0) {
          formData.attachment_files.forEach((file) => {
            formDataToSend.append(`attachment_files`, file);
          });
        }

        // Append existing file URLs to keep them
        if (formData.attachment_file_urls && formData.attachment_file_urls.length > 0) {
          formDataToSend.append('attachment_file_urls', JSON.stringify(formData.attachment_file_urls));
          formDataToSend.append('attachment_file_names', JSON.stringify(formData.attachment_file_names));
        }

        if (hasFilesToDelete) {
          formDataToSend.append('attachment_files_delete', 'true');
        }

        let response;
        if (editingId) {
          response = await projectApi.updateProjectProgress(projectId, editingId, formDataToSend);
        } else {
          response = await projectApi.createProjectProgress(projectId, formDataToSend);
        }

        // Update file URLs if returned
        if (response?.attachment_file_urls) {
          setFormData(prev => ({
            ...prev,
            attachment_file_urls: Array.isArray(response.attachment_file_urls)
              ? response.attachment_file_urls
              : [response.attachment_file_urls],
            attachment_file_names: Array.isArray(response.attachment_file_names)
              ? response.attachment_file_names
              : (response.attachment_file_names ? [response.attachment_file_names] : []),
            attachment_files: [],
          }));
        } else if (response?.attachment_file_url) {
          // Backward compatibility: single file
          setFormData(prev => ({
            ...prev,
            attachment_file_urls: [response.attachment_file_url],
            attachment_file_names: [response.attachment_file_name || extractFileNameFromUrl(response.attachment_file_url)],
            attachment_files: [],
          }));
        }
      } else {
        // Use regular JSON for non-file updates
        const variationProgressData = calculateCumulativeProgress(formData.variation_progress, latestProgress);
        const variationsTechnicalCurrent = calculateWeightedAverage(variationProgressData, variations);
        const variationsActualCurrent = calculateWeightedAverage(variationProgressData, variations, 'actual_current');

        const data = {
          technical_progress_current: formData.technical_progress_current ? parseFloat(formData.technical_progress_current) : null,
          technical_progress_approved: formData.technical_progress_approved ? parseFloat(formData.technical_progress_approved) : null,
          owner_technical_current: formData.owner_technical_current ? parseFloat(formData.owner_technical_current) : null,
          owner_actual_current: formData.owner_actual_current ? parseFloat(formData.owner_actual_current) : null,
          bank_technical_current: formData.bank_technical_current ? parseFloat(formData.bank_technical_current) : null,
          bank_actual_current: formData.bank_actual_current ? parseFloat(formData.bank_actual_current) : null,
          variations_technical_current: variationsTechnicalCurrent || null,
          variations_actual_current: variationsActualCurrent || null,
          variation_progress: variationProgressData,
          entry_date: formData.entry_date,
          notes: formData.notes || '',
        };

        if (editingId) {
          await projectApi.updateProjectProgress(projectId, editingId, data);
        } else {
          await projectApi.createProjectProgress(projectId, data);
        }
      }

      setSuccess(editingId ? t('progress_update_success') : t('progress_create_success'));
      handleCloseDialog();
      loadHistory();
      loadProjectData();
    } catch (err) {
      const handledError = handleError(err, 'AddProgressPage.handleSave');
      setError(handledError.message || t('progress_save_error'));
      logger.error('Error saving progress', handledError);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    dialogOpen,
    submitting,
    editingId,
    latestProgress,
    formData,
    setFormData,
    handleChange,
    handleBlur,
    handleOpenDialog,
    handleCloseDialog,
    handleSave,
    setLatestProgress,
  };
}
