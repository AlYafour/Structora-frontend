import React from 'react';
import { formatPercent } from '../../../../../utils/formatters';

export default function OverallProgressDisplay({ projectData, isRTL, t }) {
  const formatVal = (val) => formatPercent(val, { showSymbol: false, fallback: '-' });

  return (
    <div className="progress-section">
      <h3 className="progress-section__title">
        {t('progress_buckets_overall')} <span className="progress-section__subtitle">({t('progress_calculated_readonly')})</span>
      </h3>
      <div className="progress-section__grid progress-section__grid--5">
        <div className="progress-field">
          <label className="progress-field__label">{t('progress_actual_current')}</label>
          <input
            type="text"
            className="prj-input"
            value={formatVal(projectData?.overall_actual_current)}
            disabled
          />
        </div>
        <div className="progress-field">
          <label className="progress-field__label">{t('progress_buckets_technical_current')}</label>
          <input
            type="text"
            className="prj-input"
            value={formatVal(projectData?.overall_technical_current)}
            disabled
          />
        </div>
        <div className="progress-field">
          <label className="progress-field__label">{t('progress_buckets_technical_approved')}</label>
          <input
            type="text"
            className="prj-input"
            value={formatVal(projectData?.overall_technical_approved)}
            disabled
          />
        </div>
        <div className="progress-field">
          <label className="progress-field__label">{t('progress_buckets_financial')}</label>
          <input
            type="text"
            className="prj-input"
            value={formatVal(projectData?.overall_financial)}
            disabled
          />
        </div>
        <div className="progress-field">
          <label className="progress-field__label">{t('progress_buckets_invoice_approved')}</label>
          <input
            type="text"
            className="prj-input"
            value={formatVal(projectData?.overall_invoice_approved)}
            disabled
          />
        </div>
      </div>
    </div>
  );
}
