/**
 * Import Data Dialog Component
 * Handles Excel import with preview functionality
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { boqApi } from "../../../services/boq";
import { handleError } from "../../../utils/errorHandler";
import Dialog from "../../../components/common/Dialog";
import Button from "../../../components/common/Button";
import "./ImportDataDialog.css";

export default function ImportDataDialog({ open, onClose, onSuccess, projectId, projects }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedProjectId) {
      setError(t('boq_select_file_and_project') || 'Please select a file and project');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      
      // Import directly with file - backend will parse and save
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', selectedProjectId);
      
      await boqApi.importDataWithFile(formData, parseInt(selectedProjectId));
      onSuccess();
    } catch (err) {
      // Extract error message as string

      
      let errorMessage = '';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err?.message) {
        errorMessage = err.message;
      } else {
        errorMessage = t('boq_import_error') || 'Error importing data. Please check the file format.';
      }
      
      // If it's a validation error, show the first error
      if (err?.response?.data && typeof err.response.data === 'object') {
        const errorKeys = Object.keys(err.response.data);
        if (errorKeys.length > 0) {
          const firstError = err.response.data[errorKeys[0]];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setError(null);
      setSelectedProjectId(projectId || '');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('boq_import_data') || 'Import Data'}
      size="large"
    >
      <div className="import-data-dialog" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Project Selection */}
        <div className="import-field">
          <label>{t('boq_select_project') || 'Select Project'}:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={importing}
          >
            <option value="">{t('boq_select_project_placeholder') || '-- Select Project --'}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name || project.internal_code || `Project #${project.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* File Selection */}
        <div className="import-field">
          <label>{t('boq_select_file') || 'Select Excel File'}:</label>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importing}
              id="boq-file-input"
              style={{ 
                padding: '8px',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '4px',
                width: '100%',
                cursor: importing ? 'not-allowed' : 'pointer'
              }}
            />
            {file && (
              <div className="file-name import-data-dialog__file-status">
                ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
        </div>

        {/* Import Button */}
        {file && selectedProjectId && (
          <div className="import-actions">
            <Button
              onClick={handleImport}
              loading={importing}
              variant="primary"
            >
              {t('boq_import_confirm') || 'Import Data'}
            </Button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="import-error">
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </div>
        )}
      </div>
    </Dialog>
  );
}
