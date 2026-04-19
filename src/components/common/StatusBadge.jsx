/**
 * StatusBadge Component
 *
 * Unified status badge component for displaying different states across the application.
 * Supports multiple status types with consistent styling.
 *
 * @example
 * <StatusBadge status="approved" />
 * <StatusBadge status="pending" label="Under Review" />
 * <StatusBadge status="active" variant="outlined" />
 */

import { useTranslation } from 'react-i18next';
import './StatusBadge.css';

const STATUS_CONFIG = {
  // General statuses
  active: {
    label: { en: 'Active', ar: 'نشط' },
    className: 'ds-status-active'
  },
  inactive: {
    label: { en: 'Inactive', ar: 'غير نشط' },
    className: 'ds-status-inactive'
  },
  pending: {
    label: { en: 'Pending', ar: 'قيد الانتظار' },
    className: 'ds-status-pending'
  },
  approved: {
    label: { en: 'Approved', ar: 'معتمد' },
    className: 'ds-status-approved'
  },
  rejected: {
    label: { en: 'Rejected', ar: 'مرفوض' },
    className: 'ds-status-rejected'
  },
  draft: {
    label: { en: 'Draft', ar: 'مسودة' },
    className: 'ds-status-draft'
  },

  // Subscription statuses
  trial: {
    label: { en: 'Trial', ar: 'تجريبي' },
    className: 'ds-status-trial'
  },
  expired: {
    label: { en: 'Expired', ar: 'منتهي' },
    className: 'ds-status-expired'
  },

  // Invoice types
  initial: {
    label: { en: 'Initial', ar: 'مبدئية' },
    className: 'ds-status-invoice-initial'
  },
  actual: {
    label: { en: 'Actual', ar: 'فعلية' },
    className: 'ds-status-invoice-actual'
  },

  // Financial statuses
  positive: {
    label: { en: 'Positive', ar: 'إيجابي' },
    className: 'ds-status-financial-positive'
  },
  negative: {
    label: { en: 'Negative', ar: 'سلبي' },
    className: 'ds-status-financial-negative'
  },
  neutral: {
    label: { en: 'Neutral', ar: 'محايد' },
    className: 'ds-status-financial-neutral'
  }
};

export default function StatusBadge({
  status,
  label,
  variant = 'filled', // 'filled' | 'outlined' | 'soft'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = ''
}) {
  const { i18n } = useTranslation();
  const isAR = /^ar\b/i.test(i18n.language || '');

  const config = STATUS_CONFIG[status];

  if (!config) {

    return null;
  }

  const displayLabel = label || (isAR ? config.label.ar : config.label.en);

  const classes = [
    'ds-status-badge',
    config.className,
    `ds-status-badge--${variant}`,
    `ds-status-badge--${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {displayLabel}
    </span>
  );
}

/**
 * Helper component for Yes/No badges (common pattern)
 */
export function YesNoBadge({ value }) {
  const { t } = useTranslation();

  return (
    <StatusBadge
      status={value ? 'approved' : 'rejected'}
      label={value ? t('yes') : t('no')}
      variant="soft"
      size="sm"
    />
  );
}
