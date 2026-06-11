/**
 * Progress Calculations Utility
 *
 * Handles all calculations related to project progress including:
 * - Weighted average calculations for variations
 * - Cumulative progress calculations
 * - Variation progress aggregations
 */
import { getVariationTotalAmount } from '../../../entries/variations/utils/variationAmount';

/**
 * Calculate weighted average from individual variation progress
 * @param {Object} variationProgress - Individual variation progress object
 * @param {Array} variations - Array of variation objects
 * @param {string} fieldKey - Progress field to average (default: 'technical_current')
 * @returns {number} Weighted average percentage
 */
export function calculateWeightedAverage(variationProgress, variations, fieldKey = 'technical_current') {
  if (!variationProgress || !variations || variations.length === 0) {
    return 0;
  }

  const approvedVariations = variations.filter(v => {
    const status = v.workflow_status || v.status;
    return status === 'approved' || status === 'final_approved';
  });
  let totalValue = 0;
  let weightedSum = 0;

  Object.keys(variationProgress).forEach(variationId => {
    const progress = variationProgress[variationId];
    const variation = approvedVariations.find(v => String(v.id) === variationId);

    if (variation && progress[fieldKey]) {
      const value = parseFloat(getVariationTotalAmount(variation));
      const progressValue = parseFloat(progress[fieldKey]);
      totalValue += value;
      weightedSum += progressValue * value;
    }
  });

  if (totalValue > 0) {
    return parseFloat((weightedSum / totalValue).toFixed(2));
  }

  return 0;
}

/**
 * Calculate progress for individual variations
 * The user enters ABSOLUTE values (total progress so far), not incremental.
 * The form is pre-filled with the latest saved value and the user updates it
 * to the new absolute value, so we use the entered value directly.
 * @param {Object} currentProgress - Current variation progress input (absolute values)
 * @param {Object} _latestProgress - Latest stored variation progress (unused, kept for API compat)
 * @returns {Object} Variation progress to save
 */
export function calculateCumulativeProgress(currentProgress, _latestProgress) {
  const variationProgressData = {};

  Object.keys(currentProgress).forEach(variationId => {
    const progress = currentProgress[variationId];
    if (progress && (progress.technical_current || progress.actual_current)) {
      const entry = {};
      if (progress.technical_current) {
        entry.technical_current = Math.min(100, parseFloat(progress.technical_current));
      }
      if (progress.actual_current) {
        entry.actual_current = Math.min(100, parseFloat(progress.actual_current));
      }
      variationProgressData[variationId] = entry;
    }
  });

  return variationProgressData;
}

/**
 * Parse variation progress from entry (handles string or object)
 * @param {string|Object} variationProgress - Variation progress data
 * @returns {Object} Parsed variation progress object
 */
export function parseVariationProgress(variationProgress) {
  if (!variationProgress) return {};

  if (typeof variationProgress === 'string') {
    try {
      return JSON.parse(variationProgress);
    } catch (_e) {
      return {};
    }
  }

  return variationProgress;
}

/**
 * Initialize variation progress from latest entry for new progress entries
 * @param {Array} variations - Array of variation objects
 * @param {Object} latestProgress - Latest progress entry
 * @returns {Object} Initial variation progress object
 */
export function initializeVariationProgress(variations, latestProgress) {
  const latestVariationProgress = parseVariationProgress(latestProgress?.variation_progress);
  const initialVariationProgress = {};

  if (variations && variations.length > 0) {
    variations.forEach(variation => {
      const variationId = String(variation.id);
      const latestProgressForVariation = latestVariationProgress[variationId];

      // Pre-fill with latest progress so user sees where they left off
      if (latestProgressForVariation && (latestProgressForVariation.technical_current || latestProgressForVariation.actual_current)) {
        const entry = {};
        if (latestProgressForVariation.technical_current) {
          entry.technical_current = latestProgressForVariation.technical_current.toString();
        }
        if (latestProgressForVariation.actual_current) {
          entry.actual_current = latestProgressForVariation.actual_current.toString();
        }
        initialVariationProgress[variationId] = entry;
      }
    });
  }

  return initialVariationProgress;
}
