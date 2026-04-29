import React from 'react';
import { formatPercent } from '../../../../../utils/formatters';

const METRICS = [
  { key: 'overall_actual_current',     labelKey: 'progress_actual_current' },
  { key: 'overall_technical_current',  labelKey: 'progress_buckets_technical_current' },
  { key: 'overall_technical_approved', labelKey: 'progress_buckets_technical_approved' },
  { key: 'overall_financial',          labelKey: 'progress_buckets_financial' },
  { key: 'overall_invoice_approved',   labelKey: 'progress_buckets_invoice_approved' },
];

export default function OverallProgressDisplay({ projectData, t }) {
  const toPercent = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
  };

  const display = (val) => {
    const formatted = formatPercent(val, { showSymbol: false, fallback: null });
    return formatted !== null ? `${formatted}%` : '—';
  };

  return (
    <div className="progress-bars-grid">
      {METRICS.map(({ key, labelKey }) => {
        const pct = toPercent(projectData?.[key]);
        return (
          <div key={key} className="progress-bar-item">
            <div className="progress-bar-item__header">
              <span className="progress-bar-item__label">{t(labelKey)}</span>
              <span className="progress-bar-item__value">{display(projectData?.[key])}</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
