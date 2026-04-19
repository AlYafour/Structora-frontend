import React from 'react';

export default function VariationsTotalSection({ variations, formData, isRTL, t }) {
  if (!variations || variations.length === 0) {
    return null;
  }

  const calcTechnicalTotal = () => {
    if (!formData.variation_progress || Object.keys(formData.variation_progress).length === 0) {
      return formData.variations_technical_current || '0.00';
    }
    const values = Object.values(formData.variation_progress)
      .map(p => parseFloat(p.technical_current || 0))
      .filter(v => !isNaN(v));
    if (values.length === 0) return '0.00';
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg.toFixed(2);
  };

  const calcActualTotal = () => {
    if (!formData.variation_progress || Object.keys(formData.variation_progress).length === 0) {
      return formData.variations_actual_current || '0.00';
    }
    const values = Object.values(formData.variation_progress)
      .map(p => parseFloat(p.actual_current || 0))
      .filter(v => !isNaN(v));
    if (values.length === 0) return '0.00';
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg.toFixed(2);
  };

  return (
    <div className="progress-section progress-section--muted">
      <h3 className="progress-section__title">
        {t('progress_variations_total')} <span className="progress-section__subtitle">({t('progress_calculated_automatically')})</span>
      </h3>
      <div className="progress-section__grid progress-section__grid--2">
        <div className="progress-field">
          <label className="progress-field__label">
            {t('progress_actual_current')}
          </label>
          <input
            type="text"
            className="prj-input"
            value={calcActualTotal()}
            disabled
          />
        </div>
        <div className="progress-field">
          <label className="progress-field__label">
            {t('progress_buckets_technical_current')}
          </label>
          <input
            type="text"
            className="prj-input"
            value={calcTechnicalTotal()}
            disabled
          />
        </div>
      </div>
    </div>
  );
}
