/**
 * Progress Field Names Constants
 *
 * Single source of truth for field names used across progress form components.
 */

export const PROGRESS_FIELDS = {
  TECHNICAL_CURRENT: 'technical_progress_current',
  TECHNICAL_APPROVED: 'technical_progress_approved',
  OWNER_CURRENT: 'owner_technical_current',
  OWNER_ACTUAL_CURRENT: 'owner_actual_current',
  BANK_CURRENT: 'bank_technical_current',
  BANK_ACTUAL_CURRENT: 'bank_actual_current',
  VARIATIONS_CURRENT: 'variations_technical_current',
  VARIATIONS_ACTUAL_CURRENT: 'variations_actual_current',
};

export const BUCKET_CONFIG = {
  owner: {
    fieldName: PROGRESS_FIELDS.OWNER_CURRENT,
    actualFieldName: PROGRESS_FIELDS.OWNER_ACTUAL_CURRENT,
    titleKey: 'progress_buckets_owner',
    cssModifier: '--info',
  },
  bank: {
    fieldName: PROGRESS_FIELDS.BANK_CURRENT,
    actualFieldName: PROGRESS_FIELDS.BANK_ACTUAL_CURRENT,
    titleKey: 'progress_buckets_bank',
    cssModifier: '--success',
  },
};
