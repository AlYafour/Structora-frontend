import React from 'react';
import { sanitizePercentageInput } from '../utils/progressFormHelpers';
import { parseVariationProgress } from '../utils/progressCalculations';

export default function VariationsIndividualSection({ variations, formData, latestProgress, setFormData, setError, error, isRTL, t }) {
  if (!variations || variations.length === 0) {
    return null;
  }

  return (
    <div className="progress-section">
      <h3 className="progress-section__title progress-section__title--warning">
        {t('progress_variations_individual')}
      </h3>
      <div className="progress-variations-list">
        {variations.map((variation) => {
          const variationId = String(variation.id);
          const variationProgress = formData.variation_progress[variationId] || {};
          const technicalCurrent = variationProgress.technical_current || '';
          const actualCurrent = variationProgress.actual_current || '';

          const variationNumber = variation.variation_number || variation.modification_number || `VAR-${variation.id}`;
          let variationDescription = variation.description || '';

          try {
            const parsed = JSON.parse(variationDescription);
            variationDescription = parsed.variation_description || parsed.description || variationDescription;
          } catch (_e) {
            // Not JSON, use as-is
          }

          const latestProgressForVariation = parseVariationProgress(latestProgress?.variation_progress);
          const latestValue = latestProgressForVariation[variationId]?.technical_current;
          const latestActualValue = latestProgressForVariation[variationId]?.actual_current;

          return (
            <div key={variation.id} className="progress-variation-card">
              <div className="progress-variation-card__header">
                <div className="progress-variation-card__number">{variationNumber}</div>
                {variationDescription && (
                  <div className="progress-variation-card__desc">
                    {variationDescription.length > 80 ? variationDescription.substring(0, 80) + '...' : variationDescription}
                  </div>
                )}
              </div>
              <div className="progress-section__grid progress-section__grid--2">
                {/* ── Actual Current (Field Observation) ── */}
                <div className="progress-field">
                  <label className="progress-field__label">{t('progress_actual_current')}</label>
                  <div className="progress-field__input-wrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`prj-input ${error && actualCurrent ? 'prj-input--error' : ''}`}
                      value={actualCurrent}
                      onChange={(e) => {
                        let value = sanitizePercentageInput(e.target.value);
                        if (value !== '' && value !== '.') {
                          const numValue = parseFloat(value);
                          if (isNaN(numValue)) return;
                          if (numValue > 100) value = '100';
                        }
                        if (error) setError(null);
                        setFormData(prev => ({
                          ...prev,
                          variation_progress: {
                            ...prev.variation_progress,
                            [variationId]: {
                              ...prev.variation_progress[variationId],
                              actual_current: value
                            }
                          }
                        }));
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.replace('%', '').trim();
                        if (value !== '') {
                          const numValue = parseFloat(value);
                          if (isNaN(numValue)) {
                            setError(t('progress_validation_invalid_number'));
                            return;
                          }
                          if (numValue > 100) {
                            setError(t('progress_validation_exceeds_100'));
                            return;
                          }
                        }
                        if (error) setError(null);
                      }}
                      max="100"
                      step="0.01"
                      placeholder={t('progress_current_placeholder')}
                    />
                    <span className="progress-field__suffix">%</span>
                    {latestActualValue && (
                      <div className="progress-field__hint">
                        {t('progress_previous_value', { value: latestActualValue })}
                      </div>
                    )}
                  </div>
                </div>
                {/* ── Technical Current (Approved) ── */}
                <div className="progress-field">
                  <label className="progress-field__label">{t('progress_buckets_technical_current')}</label>
                  <div className="progress-field__input-wrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`prj-input ${error && technicalCurrent ? 'prj-input--error' : ''}`}
                      value={technicalCurrent}
                      onChange={(e) => {
                        let value = sanitizePercentageInput(e.target.value);
                        if (value !== '' && value !== '.') {
                          const numValue = parseFloat(value);
                          if (isNaN(numValue)) return;
                          if (numValue > 100) value = '100';
                        }
                        if (error) setError(null);
                        setFormData(prev => ({
                          ...prev,
                          variation_progress: {
                            ...prev.variation_progress,
                            [variationId]: {
                              ...prev.variation_progress[variationId],
                              technical_current: value
                            }
                          }
                        }));
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.replace('%', '').trim();
                        if (value !== '') {
                          const numValue = parseFloat(value);
                          if (isNaN(numValue)) {
                            setError(t('progress_validation_invalid_number'));
                            return;
                          }
                          const prevVal = latestValue ? parseFloat(latestValue) : 0;
                          if (numValue < prevVal) {
                            setError(t('progress_validation_below_previous', { current: numValue, previous: prevVal }));
                            return;
                          }
                          if (numValue > 100) {
                            setError(t('progress_validation_exceeds_100'));
                            return;
                          }
                        }
                        if (error) setError(null);
                      }}
                      min={latestValue || 0}
                      max="100"
                      step="0.01"
                      placeholder={latestValue
                        ? t('progress_enter_percentage_min', { value: latestValue })
                        : t('progress_enter_percentage')}
                    />
                    <span className="progress-field__suffix">%</span>
                    {latestValue && (
                      <div className="progress-field__hint">
                        {t('progress_previous_value', { value: latestValue })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
