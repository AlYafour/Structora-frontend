/**
 * useProgressValidation Hook
 *
 * Handles validation logic for progress entries
 */

import { parseVariationProgress } from '../utils/progressCalculations';

/**
 * Custom hook for progress validation
 * @param {Function} t - Translation function
 * @returns {Object} Validation functions
 */
export function useProgressValidation(t) {
  /**
   * Validate owner bucket progress
   */
  const validateOwnerBucket = (formData, latestProgress, setError) => {
    if (formData.owner_technical_current) {
      const ownerCurrent = parseFloat(formData.owner_technical_current);
      const latestOwner = latestProgress ? parseFloat(latestProgress.owner_technical_current || 0) : 0;

      if (isNaN(ownerCurrent)) {
        setError(t('progress_validation_invalid_owner'));
        return false;
      }

      if (ownerCurrent < latestOwner) {
        setError(t('progress_validation_owner_below_previous', { current: ownerCurrent, previous: latestOwner }));
        return false;
      }

      if (ownerCurrent > 100) {
        setError(t('progress_validation_owner_exceeds_100'));
        return false;
      }
    }

    return true;
  };

  /**
   * Validate bank bucket progress
   */
  const validateBankBucket = (formData, latestProgress, setError) => {
    if (formData.bank_technical_current) {
      const bankCurrent = parseFloat(formData.bank_technical_current);
      const latestBank = latestProgress ? parseFloat(latestProgress.bank_technical_current || 0) : 0;

      if (isNaN(bankCurrent)) {
        setError(t('progress_validation_invalid_bank'));
        return false;
      }

      if (bankCurrent < latestBank) {
        setError(t('progress_validation_bank_below_previous', { current: bankCurrent, previous: latestBank }));
        return false;
      }

      if (bankCurrent > 100) {
        setError(t('progress_validation_bank_exceeds_100'));
        return false;
      }
    }

    return true;
  };

  /**
   * Validate individual variation progress
   */
  const validateVariationProgress = (formData, latestProgress, setError) => {
    if (formData.variation_progress) {
      const latestVariationProgress = parseVariationProgress(latestProgress?.variation_progress);

      for (const variationId of Object.keys(formData.variation_progress)) {
        const progress = formData.variation_progress[variationId];
        if (progress && progress.technical_current) {
          const current = parseFloat(progress.technical_current);
          const latestValue = latestVariationProgress[variationId]?.technical_current
            ? parseFloat(latestVariationProgress[variationId].technical_current)
            : 0;

          if (isNaN(current)) {
            setError(t('progress_validation_invalid_variation', { id: variationId }));
            return false;
          }

          if (current < latestValue) {
            setError(t('progress_validation_variation_below_previous', { id: variationId, current, previous: latestValue }));
            return false;
          }

          if (current > 100) {
            setError(t('progress_validation_variation_exceeds_100', { id: variationId }));
            return false;
          }
        }
      }
    }

    return true;
  };

  /**
   * Validate all progress fields
   */
  const validateAll = (formData, latestProgress, setError) => {
    if (!validateOwnerBucket(formData, latestProgress, setError)) {
      return false;
    }

    if (!validateBankBucket(formData, latestProgress, setError)) {
      return false;
    }

    if (!validateVariationProgress(formData, latestProgress, setError)) {
      return false;
    }

    return true;
  };

  return {
    validateAll,
    validateOwnerBucket,
    validateBankBucket,
    validateVariationProgress,
  };
}
