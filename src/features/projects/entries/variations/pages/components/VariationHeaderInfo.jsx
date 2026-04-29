/**
 * VariationHeaderInfo Component — Redesigned
 */

import { memo } from 'react';
import { FaHashtag, FaCalendarAlt, FaMapMarkerAlt, FaTag, FaAlignLeft } from 'react-icons/fa';

const VariationHeaderInfo = memo(({
  formData,
  isEditMode,
  onFormDataChange,
  getProjectNumber,
  getProjectLocation,
  t
}) => {
  return (
    <div className="nvh-wrapper">

      {/* ── SECTION HEADER ── */}
      <div className="nvh-section-title">
        <span className="nvh-section-title__line" />
        <span className="nvh-section-title__text">
          {t('project_information')} / {t('variation_details')}
        </span>
        <span className="nvh-section-title__line" />
      </div>

      {/* ── ROW 1: Key IDs ── */}
      <div className="nvh-row nvh-row--top">

        {/* Project No */}
        <div className="nvh-card">
          <div className="nvh-card__icon"><FaHashtag /></div>
          <div className="nvh-card__body">
            <span className="nvh-card__label">{t('project_no')}</span>
            <span className="nvh-card__value">{getProjectNumber() || '—'}</span>
          </div>
        </div>

        {/* Reference No */}
        <div className="nvh-card">
          <div className="nvh-card__icon"><FaTag /></div>
          <div className="nvh-card__body">
            <span className="nvh-card__label">{t('reference_no')}</span>
            {isEditMode ? (
              <input
                type="text"
                value={formData.reference_no ?? ''}
                onChange={(e) => onFormDataChange({ ...formData, reference_no: e.target.value })}
                className="nvh-inline-input"
                placeholder="VAR0001"
              />
            ) : (
              <span className="nvh-card__value nvh-card__value--mono">{formData.reference_no || '—'}</span>
            )}
          </div>
        </div>

        {/* Document Date */}
        <div className="nvh-card">
          <div className="nvh-card__icon"><FaCalendarAlt /></div>
          <div className="nvh-card__body">
            <span className="nvh-card__label">{t('document_date')}</span>
            {isEditMode ? (
              <input
                type="date"
                value={formData.document_date ?? ''}
                onChange={(e) => onFormDataChange({ ...formData, document_date: e.target.value })}
                className="nvh-inline-input"
              />
            ) : (
              <span className="nvh-card__value">{formData.document_date || '—'}</span>
            )}
          </div>
        </div>

        {/* First Variation Date */}
        <div className="nvh-card">
          <div className="nvh-card__icon"><FaCalendarAlt /></div>
          <div className="nvh-card__body">
            <span className="nvh-card__label">{t('first_variation_date')}</span>
            {isEditMode ? (
              <input
                type="date"
                value={formData.first_variation_date ?? ''}
                onChange={(e) => onFormDataChange({ ...formData, first_variation_date: e.target.value })}
                className="nvh-inline-input"
              />
            ) : (
              <span className="nvh-card__value">{formData.first_variation_date || '—'}</span>
            )}
          </div>
        </div>

      </div>

      {/* ── ROW 2: Details strip ── */}
      <div className="nvh-strip">
        <div className="nvh-strip__item">
          <span className="nvh-strip__label">{t('trade_discipline')}</span>
          {isEditMode ? (
            <input
              type="text"
              value={formData.trade_discipline ?? ''}
              onChange={(e) => onFormDataChange({ ...formData, trade_discipline: e.target.value })}
              className="nvc-input"
              placeholder={t('trade_discipline')}
            />
          ) : (
            <span className="nvh-strip__value">{formData.trade_discipline || '—'}</span>
          )}
        </div>

        <div className="nvh-strip__item">
          <span className="nvh-strip__label">{t('variation_cause')}</span>
          {isEditMode ? (
            <input
              type="text"
              value={formData.item_description ?? ''}
              onChange={(e) => onFormDataChange({ ...formData, item_description: e.target.value })}
              className="nvc-input"
              placeholder={t('variation_cause')}
            />
          ) : (
            <span className="nvh-strip__value">{formData.item_description || '—'}</span>
          )}
        </div>

        <div className="nvh-strip__item">
          <span className="nvh-strip__label">{t('additional_time')}</span>
          {isEditMode ? (
            <input
              type="text"
              value={formData.additional_time ?? ''}
              onChange={(e) => onFormDataChange({ ...formData, additional_time: e.target.value })}
              className="nvc-input"
              placeholder={t('additional_time')}
            />
          ) : (
            <span className="nvh-strip__value">{formData.additional_time || '—'}</span>
          )}
        </div>

        <div className="nvh-strip__item">
          <span className="nvh-strip__label"><FaMapMarkerAlt style={{marginInlineEnd:4,opacity:.6}} />{t('project_address')}</span>
          <span className="nvh-strip__value">{getProjectLocation() || '—'}</span>
        </div>
      </div>

      {/* ── ROW 3: Description ── */}
      <div className="nvh-desc-row">
        <span className="nvh-desc-row__label"><FaAlignLeft />{t('variation_description')}</span>
        {isEditMode ? (
          <textarea
            value={formData.variation_description ?? ''}
            onChange={(e) => onFormDataChange({ ...formData, variation_description: e.target.value })}
            className="nvc-input nvc-textarea nvh-desc-row__textarea"
            rows={2}
            placeholder={t('variation_description')}
          />
        ) : (
          <div className="nvh-desc-row__text">
            {formData.variation_description || <span className="nvh-desc-row__empty">—</span>}
          </div>
        )}
      </div>

    </div>
  );
});

VariationHeaderInfo.displayName = 'VariationHeaderInfo';

export default VariationHeaderInfo;