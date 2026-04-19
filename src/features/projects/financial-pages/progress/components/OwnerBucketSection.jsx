import React from 'react';

export default function OwnerBucketSection({ formData, latestProgress, handleChange, handleBlur, error, isRTL, t }) {
  return (
    <div className="progress-section">
      <h3 className="progress-section__title progress-section__title--info">
        {t('progress_buckets_owner')}
      </h3>
      <div className="progress-section__grid progress-section__grid--1">
        <div className="progress-field">
          <label className="progress-field__label">{t('progress_buckets_technical_current')}</label>
          <div className="progress-field__input-wrap">
            <input
              type="text"
              inputMode="decimal"
              className={`prj-input ${error && formData.owner_technical_current ? 'prj-input--error' : ''}`}
              name="owner_technical_current"
              value={formData.owner_technical_current}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={latestProgress?.owner_technical_current
                ? t('progress_enter_percentage_min', { value: latestProgress.owner_technical_current })
                : t('progress_current_placeholder')}
            />
            <span className="progress-field__suffix">%</span>
            {latestProgress?.owner_technical_current && (
              <div className="progress-field__hint">
                {t('progress_previous_value', { value: latestProgress.owner_technical_current })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
