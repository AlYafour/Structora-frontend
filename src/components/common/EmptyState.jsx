import PropTypes from "prop-types";

/**
 * EmptyState Component
 *
 * Unified empty state component for displaying "no data" screens.
 * Provides consistent messaging and actions across the application.
 *
 * @example
 * <EmptyState
 *   icon={<InboxIcon />}
 *   title="No projects found"
 *   description="Get started by creating your first project"
 *   action={{ label: "Create Project", onClick: handleCreate }}
 * />
 */

import { useTranslation } from 'react-i18next';
import Button from './Button';
import './EmptyState.css';

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = ''
}) {
  const { t } = useTranslation();

  return (
    <div className={`ds-empty-state ${className}`}>
      <div className="ds-empty-state__content">
        {icon && (
          <div className="ds-empty-state__icon">
            {icon}
          </div>
        )}

        {title && (
          <h3 className="ds-empty-state__title">
            {title}
          </h3>
        )}

        {description && (
          <p className="ds-empty-state__description">
            {description}
          </p>
        )}

        {(action || secondaryAction) && (
          <div className="ds-empty-state__actions">
            {action && (
              <Button
                variant="primary"
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            )}

            {secondaryAction && (
              <Button
                variant="secondary"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

EmptyState.propTypes = {
  /** Icon to display (React node or SVG) */
  icon: PropTypes.node,
  /** Empty state title */
  title: PropTypes.string,
  /** Empty state description */
  description: PropTypes.string,
  /** Primary action button configuration */
  action: PropTypes.shape({
    /** Button label */
    label: PropTypes.string.isRequired,
    /** Click handler */
    onClick: PropTypes.func.isRequired,
    /** Whether button is disabled */
    disabled: PropTypes.bool,
  }),
  /** Secondary action button configuration */
  secondaryAction: PropTypes.shape({
    /** Button label */
    label: PropTypes.string.isRequired,
    /** Click handler */
    onClick: PropTypes.func.isRequired,
    /** Whether button is disabled */
    disabled: PropTypes.bool,
  }),
  /** Additional CSS classes */
  className: PropTypes.string,
};

/**
 * Predefined empty states for common scenarios
 */

export function NoDataFound({ onCreate }) {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="12" y="12" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M24 28h16M24 36h16M24 44h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }
      title={t('emptyState.noData.title', 'No data found')}
      description={t('emptyState.noData.description', 'Try adjusting your filters or search criteria')}
      action={onCreate ? { label: t('create'), onClick: onCreate } : undefined}
    />
  );
}

NoDataFound.propTypes = {
  /** Optional create handler */
  onCreate: PropTypes.func,
};

export function NoResults({ onClear }) {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="26" cy="26" r="14" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M36 36l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M20 26h12M26 20v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }
      title={t('emptyState.noResults.title', 'No results found')}
      description={t('emptyState.noResults.description', 'Try different keywords or clear filters')}
      action={onClear ? { label: t('clearFilters'), onClick: onClear } : undefined}
    />
  );
}

NoResults.propTypes = {
  /** Optional clear filters handler */
  onClear: PropTypes.func,
};

export function NoPermission() {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="18" y="24" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M24 24v-6a8 8 0 0116 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="32" cy="34" r="2" fill="currentColor"/>
        </svg>
      }
      title={t('emptyState.noPermission.title', 'Access Denied')}
      description={t('emptyState.noPermission.description', 'You don\'t have permission to view this content')}
    />
  );
}

NoPermission.propTypes = {};
