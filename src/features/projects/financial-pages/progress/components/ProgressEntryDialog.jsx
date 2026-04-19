import React from 'react';
import Dialog from '../../../../../components/common/Dialog';
import DateInput from '../../../../../components/forms/DateInput';
import OverallProgressDisplay from './OverallProgressDisplay';
import BucketProgressInput from './BucketProgressInput';
import VariationsIndividualSection from './VariationsIndividualSection';
import VariationsTotalSection from './VariationsTotalSection';
import ProgressAttachmentUpload from './ProgressAttachmentUpload';

export default function ProgressEntryDialog({
 dialogOpen,
 editingId,
 formData,
 projectData,
 variations,
 latestProgress,
 error,
 isRTL,
 submitting,
 t,
 handleChange,
 handleBlur,
 handleCloseDialog,
 handleSave,
 setFormData,
 setError,
 projectId
}) {
 return (
 <Dialog
 open={dialogOpen}
 title={editingId ? t('edit_progress_entry') : t('add_progress_entry')}
 size="large"
 className="progress-entry-dialog__dialog"
 desc={
 <div className="progress-dialog-body">
 <OverallProgressDisplay
 projectData={projectData}
 isRTL={isRTL}
 t={t}
 />

 <BucketProgressInput
 bucketType="owner"
 formData={formData}
 latestProgress={latestProgress}
 handleChange={handleChange}
 handleBlur={handleBlur}
 error={error}
 isRTL={isRTL}
 t={t}
 />

 <BucketProgressInput
 bucketType="bank"
 formData={formData}
 latestProgress={latestProgress}
 handleChange={handleChange}
 handleBlur={handleBlur}
 error={error}
 isRTL={isRTL}
 t={t}
 />

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

 {/* Common Fields */}
 <div className="progress-section">
 <h3 className="progress-section__title">{t('progress_additional_info')}</h3>
 <div className="progress-section__grid progress-section__grid--2">
 <div className="progress-field">
 <label className="progress-field__label">{t('progress_entry_date_label')}</label>
 <DateInput
 className="prj-input"
 value={formData.entry_date}
 onChange={(value) => setFormData({ ...formData, entry_date: value })}
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
 className="prj-input progress-entry-dialog__notes-textarea"
 name="notes"
 value={formData.notes}
 onChange={handleChange}
 rows={4}
 placeholder={t('progress_notes_placeholder')}
 />
 </div>
 </div>
 </div>
 }
 confirmLabel={submitting ? t('saving') : t('save')}
 cancelLabel={t('cancel')}
 onClose={handleCloseDialog}
 onConfirm={handleSave}
 busy={submitting}
 />
 );
}
