import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateProjectQueries } from '../../hooks/useProjectData';
import { useNotifications } from '../../../../contexts/NotificationContext';
import { extractFileNameFromUrl } from '../../../../utils/helpers/file';
import PageLayout from '../../../../components/layout/PageLayout';
import Button from '../../../../components/common/Button';
import FinancialActionBar from '../../../../components/common/FinancialActionBar';
import ProjectEntryInfo from '../../../../components/common/ProjectEntryInfo';
import DateInput from '../../../../components/forms/DateInput';

import { useProgressData } from './hooks/useProgressData';
import { useProgressForm } from './hooks/useProgressForm';
import { useProgressValidation } from './hooks/useProgressValidation';

import OverallProgressDisplay from './components/OverallProgressDisplay';
import BucketProgressInput from './components/BucketProgressInput';
import VariationsIndividualSection from './components/VariationsIndividualSection';
import VariationsTotalSection from './components/VariationsTotalSection';
import ProgressAttachmentUpload from './components/ProgressAttachmentUpload';
import useTenantNavigate from '../../../../hooks/useTenantNavigate';

export default function AddProgressPage() {
  const { projectId } = useParams();
  const navigate = useTenantNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { success: showSuccess } = useNotifications();

  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const initStartedRef = useRef(false);
  const [initializing, setInitializing] = useState(true);

  const {
    loading,
    projectData,
    history = [],
    variations = [],
    error,
    setError,
    loadVariations,
    getLatestProgress,
  } = useProgressData(projectId, t);

  const {
    submitting,
    editingId,
    latestProgress,
    formData,
    setFormData,
    handleChange,
    handleBlur,
    handleOpenDialog,
    handleSave,
  } = useProgressForm(projectId, t, isRTL);

  const { validateAll } = useProgressValidation(t);

  useEffect(() => {
    if (loading) return;
    if (initStartedRef.current) return;

    initStartedRef.current = true;
    setInitializing(false);

    let cancelled = false;

    const initForm = async () => {
      try {
        if (isEditMode) {
          const entry = history.find((e) => String(e.id) === String(editId));

          if (!entry) {
            if (!cancelled) {
              setError(t('progress_entry_not_found'));
            }
            return;
          }

          await handleOpenDialog(
            entry,
            getLatestProgress,
            loadVariations,
            extractFileNameFromUrl
          );
          return;
        }

        await handleOpenDialog(
          null,
          getLatestProgress,
          loadVariations,
          extractFileNameFromUrl
        );
      } catch (err) {
        console.error('Failed to initialize progress form:', err);
        if (!cancelled) {
          setError(err?.message || t('something_went_wrong'));
        }
      }
    };

    initForm();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    isEditMode,
    editId,
    history,
    handleOpenDialog,
    getLatestProgress,
    loadVariations,
    setError,
    t,
  ]);

  const onInputChange = (e) => handleChange(e, error, setError);
  const onInputBlur = (e) => handleBlur(e, setError);

  const handleSaveAndNavigate = async () => {
    await handleSave(
      validateAll,
      variations,
      () => { },
      () => { },
      setError,
      (msg) => {
        showSuccess(msg);
        invalidateProjectQueries(queryClient, projectId);
        navigate(`/projects/${projectId}?tab=progress`);
      },
      extractFileNameFromUrl
    );
  };

  const handleBack = () => {
    navigate(`/projects/${projectId}?tab=progress`);
  };
  const showBankBaseContract = Number(projectData?.progress_amounts?.gross_bank || 0) > 0;
  const approvedVariations = variations.filter((v) => v.status === 'approved');

  return (
    <PageLayout loading={loading && initializing} loadingText={t('loading')}>
      <div className="progress-entry-page">
        <div className="progress-entry-page__inner">
          <FinancialActionBar
            title={isEditMode ? t('edit_progress_entry') : t('add_progress_entry')}
            onBack={handleBack}
            onSave={handleSaveAndNavigate}
            saving={submitting}
          />

          {error && (
            <div className="progress-alert progress-alert--error">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="progress-alert__close"
                onClick={() => setError(null)}
                aria-label={t('close')}
              >
                &times;
              </Button>
            </div>
          )}

          <div className="progress-entry-layout">
            <div className="progress-entry-main">
              <section className="progress-panel">
                <div className="progress-panel__header">
                  {t('progress_entry_buckets')}
                </div>
                <div className="progress-panel__body">
                  <div className="progress-buckets-grid">
                    <div className="progress-buckets-grid__item">
                      <BucketProgressInput
                        bucketType="owner"
                        formData={formData}
                        latestProgress={latestProgress}
                        handleChange={onInputChange}
                        handleBlur={onInputBlur}
                        error={error}
                        isRTL={isRTL}
                        t={t}
                      />
                    </div>

                    {showBankBaseContract && (
                      <div className="progress-buckets-grid__item">
                        <BucketProgressInput
                          bucketType="bank"
                          formData={formData}
                          latestProgress={latestProgress}
                          handleChange={onInputChange}
                          handleBlur={onInputBlur}
                          error={error}
                          isRTL={isRTL}
                          t={t}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {approvedVariations.length > 0 && (
                <section className="progress-panel">
                  <div className="progress-panel__header">
                    {t('progress_variations_individual')}
                  </div>
                  <div className="progress-panel__body progress-panel__body--spaced">
                    <VariationsIndividualSection
                      variations={approvedVariations}
                      formData={formData}
                      latestProgress={latestProgress}
                      setFormData={setFormData}
                      setError={setError}
                      error={error}
                      isRTL={isRTL}
                      t={t}
                    />

                    <VariationsTotalSection
                      variations={approvedVariations}
                      formData={formData}
                      isRTL={isRTL}
                      t={t}
                    />
                  </div>
                </section>
              )}

              <section className="progress-panel">
                <div className="progress-panel__header">
                  {t('progress_additional_info')}
                </div>
                <div className="progress-panel__body progress-panel__body--spaced">
                  <div className="progress-meta-grid">
                    <div className="progress-field">
                      <label className="progress-field__label">
                        {t('progress_entry_date_label')}
                      </label>
                      <DateInput
                        className="prj-input"
                        value={formData.entry_date}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, entry_date: value }))
                        }
                      />
                    </div>

                    <div className="progress-field">
                      <ProgressAttachmentUpload
                        formData={formData}
                        setFormData={setFormData}
                        setError={setError}
                        projectId={projectId}
                        editingId={editingId}
                        isRTL={isRTL}
                        t={t}
                      />
                    </div>
                  </div>

                  <div className="progress-field">
                    <label className="progress-field__label">
                      {t('progress_notes_label')}
                    </label>
                    <textarea
                      className="prj-input ds-w-full progress-notes-input"
                      name="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={5}
                      placeholder={t('progress_notes_placeholder')}
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="progress-entry-sidebar">
              <section className="progress-panel progress-panel--sticky">
                <div className="progress-panel__header">
                  {t('project_details') || 'Project Details'}
                </div>
                <div className="progress-panel__body">
                  <ProjectEntryInfo project={projectData} />
                </div>
              </section>

              <section className="progress-panel progress-panel--sticky">
                <div className="progress-panel__header">
                  {t('progress_buckets_overall')}
                </div>
                <div className="progress-panel__body">
                  <OverallProgressDisplay
                    projectData={projectData}
                    isRTL={isRTL}
                    t={t}
                  />
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}