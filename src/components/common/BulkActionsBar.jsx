/**
 * BulkActionsBar Component
 *
 * Unified bulk actions bar for multi-select operations.
 * Displays selected count, optional stats, and action buttons.
 *
 * @example
 * <BulkActionsBar
 *   selectedCount={5}
 *   onClear={() => clearSelection()}
 *   stats="Total: AED 1,000 | Paid: AED 500"
 *   actions={[
 *     { label: "Delete", onClick: handleDelete, variant: "danger" },
 *     { label: "Export", onClick: handleExport }
 *   ]}
 * />
 */

import { useTranslation } from 'react-i18next';
import Button from './Button';
import './BulkActionsBar.css';

export default function BulkActionsBar({
  selectedCount,
  onClear,
  actions = [],
  stats,
  className = ''
}) {
  const { t } = useTranslation();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={`ds-bulk-actions-bar ${className}`}>
      <div className="ds-bulk-actions-bar__info">
        <span className="ds-bulk-actions-bar__count">
          {selectedCount}
        </span>
        <div className="ds-bulk-actions-bar__text">
          <span className="ds-bulk-actions-bar__label">
            {t('selected') || 'محدد'}
          </span>
          {stats && (
            <span className="ds-bulk-actions-bar__stats">{stats}</span>
          )}
        </div>
      </div>

      <div className="ds-bulk-actions-bar__actions">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant || 'secondary'}
            onClick={action.onClick}
            disabled={action.disabled}
            size="sm"
          >
            {action.icon && <span className="ds-bulk-actions-bar__icon">{action.icon}</span>}
            {action.label}
          </Button>
        ))}

        {onClear && (
          <Button
            variant="ghost"
            onClick={onClear}
            size="sm"
          >
            {t('clear_selection') || 'إلغاء التحديد'}
          </Button>
        )}
      </div>
    </div>
  );
}
