import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/common/Button';

/**
 * Error Boundary for Projects Table
 * Catches rendering errors in table rows to prevent full page crash
 */
class ProjectsTableErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ProjectsTable Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <TableErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Fallback UI when table encounters an error
 */
function TableErrorFallback({ error }) {
  const { t } = useTranslation();

  return (
    <div className="projects-table-error">
      <div className="projects-table-error__icon">⚠️</div>
      <div className="projects-table-error__title">
        {t("table_error_title")}
      </div>
      <div className="projects-table-error__message">
        {t("table_error_message")}
      </div>
      {import.meta.env.DEV && error && (
        <details className="projects-table-error__details">
          <summary>{t("error_details")}</summary>
          <pre>{error.toString()}</pre>
        </details>
      )}
      <Button
        variant="primary"
        className="projects-table-error__button"
        onClick={() => window.location.reload()}
      >
        {t("reload_page")}
      </Button>
    </div>
  );
}

export default ProjectsTableErrorBoundary;
