import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { projectApi } from '../../../services/projects';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import useTableSelection from '../hooks/useTableSelection';
import BulkActionsBar from '../../../components/common/BulkActionsBar';

import { useProgressData } from '../financial-pages/progress/hooks/useProgressData';
import ProgressSummaryCard from '../financial-pages/progress/components/ProgressSummaryCard';
import ProgressHistoryTable from '../financial-pages/progress/components/ProgressHistoryTable';
import useTenantNavigate from '../../../hooks/useTenantNavigate';
import { useLanguage } from '../../../hooks';

const ProgressTab = memo(function ProgressTab({ projectId, onReload }) {
  const navigate = useTenantNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { user, hasPermission, isAdmin } = useAuth();
  const { success: showSuccess, error: showError } = useNotifications();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const { isArabic: isAR } = useLanguage();


  const canViewProgress = isAdmin || hasPermission('progress.view');
  const canAddProgress = isAdmin || hasPermission('progress.create');
  const canDeleteProgress = isAdmin || hasPermission('progress.delete');

  const {
    loading,
    projectData,
    history,
    error,
    setError,
    loadHistory,
    loadProjectData,
  } = useProgressData(projectId, t, {
    includeHistory: canViewProgress,
    includeVariations: canViewProgress,
    includeProject: canViewProgress || canAddProgress,
  });

  const {
    selectedIds: selectedProgressIds,
    handleSelect: handleSelectProgress,
    handleSelectAll: handleSelectAllProgress,
    clearSelection: clearProgressSelection,
    isAllSelected: isAllProgressSelected,
    selectAllRef: progressSelectAllRef,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkDeleting,
    askBulkDelete,
    handleBulkDelete,
  } = useTableSelection({
    items: history,
    deleteApi: (id) => projectApi.deleteProjectProgress(projectId, id),
    onReload: () => { loadHistory(); loadProjectData(); if (onReload) onReload(); },
    showToast: (type, msg) => type === 'success' ? showSuccess(msg) : showError(msg),
    t,
    labels: { itemName: 'progress entry', context: 'ProgressTab' },
  });

  const handleDeleteClick = (id) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await projectApi.deleteProjectProgress(projectId, deleteTargetId);
      showSuccess(t('progress_delete_success'));
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
      loadHistory();
      loadProjectData();
      if (onReload) onReload();
    } catch (_err) {
      showError(t('progress_delete_error'));
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
    }
  };

  const canEditEntry = (entry) => {
    return canAddProgress && (user?.id === entry.created_by || user?.is_staff || isAdmin);
  };

  const canDeleteEntry = () => {
    return canDeleteProgress;
  };

  const handleAdd = () => {
    navigate(`/projects/${projectId}/progress/add`);
  };

  const handleEdit = (entry) => {
    navigate(`/projects/${projectId}/progress/add?edit=${entry.id}`);
  };

  if (loading) {
    return (
      <div className="prj-tab-panel">
        <div className="prj-empty-state">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="prj-tab-panel">
      <div className="prj-tab-header">
        <div className="prj-tab-actions">
          {canAddProgress && (
            <Button onClick={handleAdd} variant="primary" size="md">
              {t('add_progress_entry')}
            </Button>
          )}
        </div>
      </div>

      {!canViewProgress && (
        <div className="prj-empty-state">
          {canAddProgress ? t('progress_view_permission_required') : t('company_no_permission')}
        </div>
      )}

      {canViewProgress && error && (
        <div className="progress-alert progress-alert--error">
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="progress-alert__close" onClick={() => setError(null)} aria-label={t('close')}>
            &times;
          </Button>
        </div>
      )}

      {canViewProgress && (
        <>
          <ProgressSummaryCard
            projectData={projectData}
            isRTL={isRTL}
            t={t}
            isAR={isAR}
          />

          {canDeleteProgress && (
            <BulkActionsBar
              selectedCount={selectedProgressIds.size}
              onClear={clearProgressSelection}
              actions={[{
                label: t('bulk_delete', 'Delete Selected'),
                onClick: askBulkDelete,
                variant: 'danger',
              }]}
            />
          )}
          <ProgressHistoryTable
            history={history}
            projectData={projectData}
            i18n={i18n}
            canEditEntry={canEditEntry}
            canDeleteEntry={canDeleteEntry}
            handleOpenDialog={handleEdit}
            handleDeleteClick={handleDeleteClick}
            navigate={navigate}
            projectId={projectId}
            t={t}
            canDeleteProgress={canDeleteProgress}
            selectedIds={selectedProgressIds}
            handleSelect={handleSelectProgress}
            handleSelectAll={handleSelectAllProgress}
            isAllSelected={isAllProgressSelected}
            selectAllRef={progressSelectAllRef}
          />
        </>
      )}

      <Dialog
        open={bulkDeleteOpen}
        title={t('confirm_delete')}
        desc={`${t('confirm_delete_selected', 'Delete')} ${selectedProgressIds.size} ${t('progress_entries', 'progress entries')}? ${t('delete_cannot_undo', 'This cannot be undone.')}`}
        confirmLabel={bulkDeleting ? t('deleting') : t('delete')}
        cancelLabel={t('cancel')}
        onClose={() => !bulkDeleting && setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        danger
        busy={bulkDeleting}
      />

      <Dialog
        open={deleteConfirmOpen}
        title={t('confirm_delete')}
        desc={t('progress_delete_confirm')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteConfirm}
        danger
      />
    </div>
  );
});

export default ProgressTab;
