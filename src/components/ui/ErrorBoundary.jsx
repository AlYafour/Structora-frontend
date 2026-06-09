import React from 'react';
import * as Sentry from '@sentry/react';
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import './ErrorBoundary.css';
import useTenantNavigate from '../../hooks/useTenantNavigate';

const UPDATE_RELOAD_KEY = 'structora_update_reload_attempted';
const UPDATE_RELOAD_GUARD_MS = 30000;

function isDeploymentUpdateError(error) {
  const message = String(error?.message || error || '').toLowerCase();

  return [
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'importing a module script failed',
    'loading chunk',
    'chunkloaderror',
    'unable to preload css',
  ].some((signature) => message.includes(signature));
}

/**
 * Error Boundary Component - Professional Error UI
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isDeploymentUpdate: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, isDeploymentUpdate: isDeploymentUpdateError(error) };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Report to Sentry in production
    Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isDeploymentUpdate: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isDeploymentUpdate) {
        return <UpdateRefreshFallback />;
      }

      return <ErrorFallback 
        error={this.state.error} 
        errorInfo={this.state.errorInfo}
        onReset={this.handleReset}
      />;
    }

    return this.props.children;
  }
}

function UpdateRefreshFallback() {
  const [needsManualReload, setNeedsManualReload] = React.useState(false);

  React.useEffect(() => {
    const lastReloadAttempt = Number(sessionStorage.getItem(UPDATE_RELOAD_KEY) || 0);
    const recentlyReloaded = Date.now() - lastReloadAttempt < UPDATE_RELOAD_GUARD_MS;

    if (recentlyReloaded) {
      setNeedsManualReload(true);
      return undefined;
    }

    sessionStorage.setItem(UPDATE_RELOAD_KEY, String(Date.now()));
    const timeoutId = window.setTimeout(() => {
      window.location.reload();
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="update-refresh" role="status" aria-live="polite">
      <div className="update-refresh__inner">
        <div className="update-refresh__spinner" aria-hidden="true" />
        <h1 className="update-refresh__title">Updating Structora</h1>
        <p className="update-refresh__desc">
          {needsManualReload
            ? 'The update is ready. Please reload the page to continue.'
            : 'A new version is ready. Refreshing automatically...'}
        </p>
        {needsManualReload && (
          <div className="update-refresh__actions">
            <Button variant="primary" onClick={() => window.location.reload()} size="md">
              Reload Page
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Error Fallback Component - Clean, Professional UI
 */
function ErrorFallback({ error, errorInfo, onReset }) {
  const { t, i18n } = useTranslation();
  const navigate = useTenantNavigate();
  const isRTL = i18n.language === 'ar';

  return (
    <div className="error-fallback" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="error-fallback__inner">
        {/* Error Icon */}
        <div className="error-fallback__icon">
          ⚠️
        </div>

        {/* Error Title */}
        <h1 className="error-fallback__title">
          {t('error_something_went_wrong') || 'Something went wrong'}
        </h1>

        {/* Error Description */}
        <p className="error-fallback__desc">
          {t('error_description') ||
            'We apologize for the inconvenience. An unexpected error occurred. Please try again or refresh the page.'}
        </p>

        {/* Action Buttons */}
        <div className="error-fallback__actions">
          <Button
            variant="primary"
            onClick={onReset}
            size="md"
          >
            {t('error_try_again') || 'Try Again'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            size="md"
          >
            {t('error_reload_page') || 'Reload Page'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              try {
                navigate('/projects');
              } catch (e) {
                // Fallback if navigate fails (shouldn't happen now, but just in case)
                window.location.href = '/projects';
              }
            }}
            size="md"
          >
            {t('error_go_to_projects') || 'Go to Projects'}
          </Button>
        </div>

        {/* Error Details (Development Only) */}
        {import.meta.env.DEV && error && (
          <div className="error-fallback__details">
            <div className="error-fallback__details-title">
              {t('error_details') || 'Error Details (Development Only):'}
            </div>
            <pre className="error-fallback__details-pre">
              {error.toString()}
              {errorInfo?.componentStack && `\n\n${errorInfo.componentStack}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
