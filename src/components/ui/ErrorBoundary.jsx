import React from 'react';
import * as Sentry from '@sentry/react';
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import './ErrorBoundary.css';
import useTenantNavigate from '../../hooks/useTenantNavigate';

/**
 * Error Boundary Component - Professional Error UI
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
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
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback 
        error={this.state.error} 
        errorInfo={this.state.errorInfo}
        onReset={this.handleReset}
      />;
    }

    return this.props.children;
  }
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
