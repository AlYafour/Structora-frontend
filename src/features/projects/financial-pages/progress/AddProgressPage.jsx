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
  const initRef = useRef(false);
  const [initializing, setInitializing] = useState(true);

  const {
    loading,
    projectData,
    history,
    variations,
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

  // Initialize form once history has finished loading
  // loading goes: false → true (loadHistory starts) → false (loadHistory done)
  // We use a ref to track if we've seen loading=true, so we know when the first fetch completes
  const seenLoadingRef = useRef(false);
  useEffect(() => {
    if (loading) {
      seenLoadingRef.current = true;
      return;
    }
    // Only proceed once we've seen a loading cycle (data has been fetched)
    if (!seenLoadingRef.current) return;
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      if (isEditMode) {
        const entry = history.find(e => String(e.id) === String(editId));
        if (entry) {
          await handleOpenDialog(entry, getLatestProgress, loadVariations, extractFileNameFromUrl);
        }
      } else {
        await handleOpenDialog(null, getLatestProgress, loadVariations, extractFileNameFromUrl);
      }
      setInitializing(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, history]);

  const onInputChange = (e) => handleChange(e, error, setError);
  const onInputBlur = (e) => handleBlur(e, setError);

  const handleSaveAndNavigate = async () => {
    await handleSave(
      validateAll,
      variations,
      () => {},
      () => {},
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

  return (
    <PageLayout loading={initializing} loadingText={t('loading')}>
      <div className="entry-form">
        <FinancialActionBar
          title={isEditMode ? t('edit_progress_entry') : t('add_progress_entry')}
          onBack={handleBack}
          onSave={handleSaveAndNavigate}
          saving={submitting}
        >
          <ProjectEntryInfo project={projectData} />
        </FinancialActionBar>

        {error && (
          <div className="progress-alert progress-alert--error">
            <span>{error}</span>
            <Button variant="ghost" size="sm" className="progress-alert__close" onClick={() => setError(null)} aria-label={t('close')}>
              &times;
            </Button>
          </div>
        )}

        {/* Card 1: Overall Progress (read-only) */}
        <div className="card">
          <div className="card__header">{t('progress_buckets_overall')}</div>
          <div className="card__body">
            <OverallProgressDisplay projectData={projectData} isRTL={isRTL} t={t} />
          </div>
        </div>

        {/* Card 2: Owner & Bank Progress */}
        <div className="card">
          <div className="card__header">{t('progress_entry_buckets')}</div>
          <div className="card__body">
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
        </div>

        {/* Card 3: Variations (if any) */}
        {variations.length > 0 && (
          <div className="card">
            <div className="card__header">{t('progress_variations_individual')}</div>
            <div className="card__body">
              <VariationsIndividualSection
                variations={variations}
                formData={formData}
                latestProgress={latestProgress}
                setFormData={setFormData}
                setError={setError}
                error={error}
                isRTL={isRTL}
                t={t}
              />
              <VariationsTotalSection
                variations={variations}
                formData={formData}
                isRTL={isRTL}
                t={t}
              />
            </div>
          </div>
        )}

        {/* Card 4: Additional Info */}
        <div className="card">
          <div className="card__header">{t('progress_additional_info')}</div>
          <div className="card__body">
            <div className="progress-section__grid progress-section__grid--2">
              <div className="progress-field">
                <label className="progress-field__label">{t('progress_entry_date_label')}</label>
                <DateInput
                  className="prj-input"
                  value={formData.entry_date}
                  onChange={(value) => setFormData(prev => ({ ...prev, entry_date: value }))}
                />
              </div>
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
            <div className="progress-field ds-mt-4">
              <label className="progress-field__label">{t('progress_notes_label')}</label>
              <textarea
                className="prj-input ds-w-full"
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                placeholder={t('progress_notes_placeholder')}
              />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
