/**
 * useProgressFormState Hook
 *
 * Manages form state, input handling, and dialog open/close for progress entries.
 * Extracted from useProgressForm to separate state management from save logic.
 */

import { useState } from 'react';
import { projectApi } from '../../../../../services/projects';
import { sanitizePercentageInput, validatePercentageValue } from '../utils/progressFormHelpers';
import { initializeVariationProgress, parseVariationProgress } from '../utils/progressCalculations';
import { parseArrayField } from '../../../../../utils/helpers/parsing';

const INITIAL_FORM_DATA = {
  technical_progress_current: '',
  technical_progress_approved: '',
  owner_technical_current: '',
  owner_actual_current: '',
  bank_technical_current: '',
  bank_actual_current: '',
  variations_technical_current: '',
  variations_actual_current: '',
  variation_progress: {},
  entry_date: new Date().toISOString().split('T')[0],
  notes: '',
  attachment_files: [],
  attachment_file_urls: [],
  attachment_file_names: [],
};

/**
 * @param {string} projectId
 * @param {Function} t - Translation function
 */
export function useProgressFormState(projectId, t) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [latestProgress, setLatestProgress] = useState(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });

  /**
   * Handle input change
   */
  const handleChange = (e, error, setError) => {
    const { name, value } = e.target;

    let cleanValue = sanitizePercentageInput(value);

    if (name === 'owner_technical_current' || name === 'bank_technical_current' ||
        name === 'owner_actual_current' || name === 'bank_actual_current') {
      const validatedValue = validatePercentageValue(cleanValue);
      if (validatedValue === null) return;
      cleanValue = validatedValue;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: cleanValue,
    }));

    if (error) {
      setError(null);
    }

    if (name === 'technical_progress_approved' && !formData.technical_progress_current) {
      setFormData((prev) => ({
        ...prev,
        technical_progress_current: cleanValue,
      }));
    }
  };

  /**
   * Handle blur validation
   */
  const handleBlur = (e, setError) => {
    const { name, value } = e.target;
    const cleanValue = value.replace('%', '').trim();

    if (name === 'owner_technical_current' || name === 'bank_technical_current') {
      if (cleanValue !== '') {
        const numValue = parseFloat(cleanValue);

        if (isNaN(numValue)) {
          setError(t('progress_validation_invalid_number'));
          setFormData(prev => ({
            ...prev,
            [name]: latestProgress
              ? (name === 'owner_technical_current'
                  ? (latestProgress.owner_technical_current || '').toString()
                  : (latestProgress.bank_technical_current || '').toString())
              : ''
          }));
          return;
        }

        const latestValue = latestProgress
          ? (name === 'owner_technical_current'
              ? parseFloat(latestProgress.owner_technical_current || 0)
              : parseFloat(latestProgress.bank_technical_current || 0))
          : 0;

        if (numValue < latestValue) {
          setError(t('progress_validation_below_previous', { current: numValue, previous: latestValue }));
          setFormData(prev => ({
            ...prev,
            [name]: latestValue.toString()
          }));
          return;
        }

        if (numValue > 100) {
          setError(t('progress_validation_exceeds_100'));
          const maxAllowed = Math.max(latestValue, 100);
          setFormData(prev => ({
            ...prev,
            [name]: maxAllowed.toString()
          }));
          return;
        }
      }
    }

    if (name === 'owner_actual_current' || name === 'bank_actual_current') {
      if (cleanValue !== '') {
        const numValue = parseFloat(cleanValue);

        if (isNaN(numValue)) {
          setError(t('progress_validation_invalid_number'));
          setFormData(prev => ({ ...prev, [name]: '' }));
          return;
        }

        if (numValue > 100) {
          setError(t('progress_validation_exceeds_100'));
          setFormData(prev => ({ ...prev, [name]: '100' }));
          return;
        }
      }
    }
  };

  /**
   * Open dialog for new or edit entry
   */
  const handleOpenDialog = async (entry, getLatestProgress, loadVariations, extractFileNameFromUrl) => {
    await loadVariations();

    let latest = null;
    if (!entry) {
      latest = await getLatestProgress();
      setLatestProgress(latest);
    } else {
      setLatestProgress(null);
    }

    if (entry) {
      setFormData({
        technical_progress_current: entry.technical_progress_current?.toString() || '',
        technical_progress_approved: entry.technical_progress_approved?.toString() || '',
        owner_technical_current: entry.owner_technical_current?.toString() || '',
        owner_actual_current: entry.owner_actual_current?.toString() || '',
        bank_technical_current: entry.bank_technical_current?.toString() || '',
        bank_actual_current: entry.bank_actual_current?.toString() || '',
        variations_technical_current: entry.variations_technical_current?.toString() || '',
        variations_actual_current: entry.variations_actual_current?.toString() || '',
        variation_progress: parseVariationProgress(entry.variation_progress),
        entry_date: entry.entry_date || new Date().toISOString().split('T')[0],
        notes: entry.notes || '',
        attachment_files: [],
        attachment_file_urls: parseArrayField(entry.attachment_file_urls, entry.attachment_file_url),
        attachment_file_names: parseArrayField(entry.attachment_file_names, entry.attachment_file_name)
          .length > 0
            ? parseArrayField(entry.attachment_file_names, entry.attachment_file_name)
            : (entry.attachment_file_url ? [extractFileNameFromUrl(entry.attachment_file_url)] : []),
      });
      setEditingId(entry.id);
    } else {
      const variations = await projectApi.getVariations(projectId);
      const initialVariationProgress = initializeVariationProgress(variations, latest);

      setFormData({
        ...INITIAL_FORM_DATA,
        owner_technical_current: latest?.owner_technical_current?.toString() || '',
        owner_actual_current: latest?.owner_actual_current?.toString() || '',
        bank_technical_current: latest?.bank_technical_current?.toString() || '',
        bank_actual_current: latest?.bank_actual_current?.toString() || '',
        variation_progress: initialVariationProgress,
        entry_date: new Date().toISOString().split('T')[0],
      });
      setEditingId(null);
    }
    setDialogOpen(true);
  };

  /**
   * Close dialog
   */
  const handleCloseDialog = (submitting) => {
    if (!submitting) {
      setDialogOpen(false);
      setEditingId(null);
    }
  };

  return {
    dialogOpen,
    editingId,
    latestProgress,
    formData,
    setFormData,
    setLatestProgress,
    handleChange,
    handleBlur,
    handleOpenDialog,
    handleCloseDialog,
  };
}
