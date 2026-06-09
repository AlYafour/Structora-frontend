import React from 'react';
import { BUCKET_CONFIG } from '../utils/progressFieldNames';

/**
 * Unified bucket progress input for Owner and Bank sections.
 * Shows two inputs: Actual Current (field observation) and Approved Technical (formal).
 *
 * @param {{ bucketType: 'owner'|'bank' }} props
 */
export default function BucketProgressInput({ bucketType, formData, latestProgress, handleChange, handleBlur, error, isRTL, t }) {
  const config = BUCKET_CONFIG[bucketType];
  const fieldName = config.fieldName;
  const actualFieldName = config.actualFieldName;
  const latestValue = latestProgress?.[fieldName];

  return (
    <div className="progress-section">
      <h3 className={`progress-section__title progress-section__title${config.cssModifier}`}>
        {t(config.titleKey)}
      </h3>
      <div className="progress-section__grid progress-section__grid--2">
        <div className="progress-field">
          <label className="progress-field__label">{t('progress_actual_current')}</label>
          <div className="progress-field__input-wrap">
            <input
              type="text"
              inputMode="decimal"
              className={`prj-input ${error && formData[actualFieldName] ? 'prj-input--error' : ''}`}
              name={actualFieldName}
              value={formData[actualFieldName]}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t('progress_current_placeholder')}
            />
            <span className="progress-field__suffix">%</span>
          </div>
        </div>
        <div className="progress-field">
          <label className="progress-field__label">{t('progress_buckets_technical_current')}</label>
          <div className="progress-field__input-wrap">
            <input
              type="text"
              inputMode="decimal"
              className={`prj-input ${error && formData[fieldName] ? 'prj-input--error' : ''}`}
              name={fieldName}
              value={formData[fieldName]}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={latestValue
                ? t('progress_enter_percentage_min', { value: latestValue })
                : t('progress_current_placeholder')}
            />
            <span className="progress-field__suffix">%</span>
            <div className={`progress-field__hint ${!latestValue ? 'progress-field__hint--placeholder' : ''}`}>
              {latestValue ? t('progress_previous_value', { value: latestValue }) : '\u00a0'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
