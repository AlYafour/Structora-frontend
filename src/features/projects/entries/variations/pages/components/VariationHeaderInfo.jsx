/**
 * VariationHeaderInfo Component — Redesigned
 */

import { memo } from 'react';
import { FaHashtag, FaCalendarAlt, FaMapMarkerAlt, FaTag, FaAlignLeft, FaRobot } from 'react-icons/fa';
import MultiPresetSelectField from '../../../../../../components/common/MultiPresetSelectField';
import AdditionalTimeSelectField from '../../../../../../components/common/AdditionalTimeSelectField';
import Button from '../../../../../../components/common/Button';
import VoiceNoteButton from '../../../../../../components/common/VoiceNoteButton';
import { VARIATION_CAUSE_OPTIONS, VARIATION_CAUSE_OPTIONS_AR } from '../../utils/variationCauseOptions';
import { BOQ_OPTIONS, BOQ_OPTIONS_AR } from '../../utils/boqOptions';
import { useLanguage } from '../../../../../../hooks/useLanguage';
import { useMachineAutoTranslate } from '../../../../../../hooks/useMachineAutoTranslate';
import { useVoiceTranscription } from '../../../../../../hooks/useVoiceTranscription';
import { useSuggestWording } from '../hooks/useSuggestWording';

const VariationHeaderInfo = memo(({
  formData,
  isEditMode,
  onFormDataChange,
  getProjectNumber,
  getProjectLocation,
  t
}) => {
  const { languageCode } = useLanguage();
  const isArabicPrimary = languageCode === 'ar';
  const primaryDescriptionField = isArabicPrimary ? 'variation_description_ar' : 'variation_description';
  const secondaryDescriptionField = isArabicPrimary ? 'variation_description' : 'variation_description_ar';
  const primaryDescription = formData[primaryDescriptionField] ?? '';
  const secondaryDescription = formData[secondaryDescriptionField] ?? '';
  const secondaryDescriptionLabel = isArabicPrimary
    ? t('auto_translated_english', 'Auto-translated English')
    : t('auto_translated_arabic', 'Auto-translated Arabic');
  const { suggestions, busy, error, requestSuggestion, discard } = useSuggestWording({ language: languageCode });
  const { translating: translatingDescription } = useMachineAutoTranslate(
    primaryDescription,
    (translated) => onFormDataChange(prev => ({
      ...prev,
      [secondaryDescriptionField]: translated,
    })),
    {
      enabled: isEditMode,
      source: isArabicPrimary ? 'ar' : 'en',
      target: isArabicPrimary ? 'en' : 'ar',
    }
  );

  const handleSuggestWording = async () => {
    await requestSuggestion(primaryDescription);
  };

  const handleApplySuggestion = (suggestion) => {
    if (suggestion) {
      onFormDataChange({
        ...formData,
        [primaryDescriptionField]: suggestion,
        [secondaryDescriptionField]: '',
      });
      discard();
    }
  };

  const handleDescriptionChange = (event) => {
    discard();
    onFormDataChange({
      ...formData,
      [primaryDescriptionField]: event.target.value,
      [secondaryDescriptionField]: '',
    });
  };

  const appendDescriptionTranscript = (transcript) => {
    discard();
    onFormDataChange(prev => {
      const current = prev[primaryDescriptionField]?.trim();
      return {
        ...prev,
        [primaryDescriptionField]: current ? `${current}\n${transcript}` : transcript,
        [secondaryDescriptionField]: '',
      };
    });
  };

  const {
    recording,
    transcribing,
    error: voiceError,
    toggleRecording,
  } = useVoiceTranscription({
    language: languageCode,
    field: primaryDescriptionField,
    onTranscribed: appendDescriptionTranscript,
  });

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
            <MultiPresetSelectField
              value={Array.isArray(formData.trade_discipline) ? formData.trade_discipline : (formData.trade_discipline ? [formData.trade_discipline] : [])}
              onChange={(val) => onFormDataChange({ ...formData, trade_discipline: val })}
              options={BOQ_OPTIONS}
              optionLabelsAr={BOQ_OPTIONS_AR}
              placeholder={t('search_from_list')}
              className="nvh-boq-select"
            />
          ) : (
            <span className="nvh-strip__value">
              {(Array.isArray(formData.trade_discipline)
                ? formData.trade_discipline.map(item => (isArabicPrimary ? (BOQ_OPTIONS_AR[item] || item) : item)).join(', ')
                : formData.trade_discipline) || '—'}
            </span>
          )}
        </div>

        <div className="nvh-strip__item">
          <span className="nvh-strip__label">{t('variation_cause')}</span>
          {isEditMode ? (
            <MultiPresetSelectField
              value={Array.isArray(formData.variation_cause) ? formData.variation_cause : (formData.variation_cause ? [formData.variation_cause] : [])}
              onChange={(val) => onFormDataChange({ ...formData, variation_cause: val })}
              options={VARIATION_CAUSE_OPTIONS}
              optionLabelsAr={VARIATION_CAUSE_OPTIONS_AR}
              placeholder={t('search_from_list')}
              className="nvh-variation-cause-select"
            />
          ) : (
            <span className="nvh-strip__value">
              {(Array.isArray(formData.variation_cause)
                ? formData.variation_cause.map(cause => (isArabicPrimary ? (VARIATION_CAUSE_OPTIONS_AR[cause] || cause) : cause)).join(', ')
                : formData.variation_cause) || '—'}
            </span>
          )}
        </div>

        <div className="nvh-strip__item">
          <span className="nvh-strip__label">{t('additional_time')}</span>
          {isEditMode ? (
            <AdditionalTimeSelectField
              value={formData.additional_time ?? ''}
              onChange={(val) => onFormDataChange({ ...formData, additional_time: val })}
              placeholder={t('search_from_list')}
              className="nvh-additional-time-select"
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
        <div className="nvh-desc-row__header">
          <span className="nvh-desc-row__label"><FaAlignLeft />{t('variation_description')}</span>
          {isEditMode && (
            <div className="nvh-desc-row__actions">
              <VoiceNoteButton
                recording={recording}
                transcribing={transcribing}
                disabled={busy}
                onClick={toggleRecording}
                t={t}
              />
              <Button
                size="sm"
                variant="ghost"
                loading={busy}
                disabled={!primaryDescription?.trim() || recording || transcribing}
                startIcon={<FaRobot />}
                onClick={handleSuggestWording}
              >
                {t('suggest_wording')}
              </Button>
            </div>
          )}
        </div>

        {isEditMode ? (
          <textarea
            value={primaryDescription}
            onChange={handleDescriptionChange}
            className="nvc-input nvc-textarea nvh-desc-row__textarea"
            dir={isArabicPrimary ? 'rtl' : 'ltr'}
            rows={2}
            placeholder={t('variation_description')}
          />
        ) : (
          <div
            className="nvh-desc-row__text"
            dir={isArabicPrimary ? 'rtl' : 'ltr'}
          >
            {primaryDescription || <span className="nvh-desc-row__empty">—</span>}
          </div>
        )}

        {(isEditMode || secondaryDescription) && (
          <div
            className="nvh-description-translation"
            dir={isArabicPrimary ? 'ltr' : 'rtl'}
          >
            <div className="nvh-description-translation__label">
              {translatingDescription
                ? `${t('translating', 'Translating')}...`
                : secondaryDescriptionLabel}
            </div>
            <div className="nvh-description-translation__text">
              {secondaryDescription || (
                <span className="nvh-desc-row__empty">
                  {secondaryDescriptionLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {isEditMode && error && (
          <p className="nvh-suggest-error">{t(error) !== error ? t(error) : error}</p>
        )}

        {isEditMode && voiceError && (
          <p className="nvh-suggest-error">{t(voiceError) !== voiceError ? t(voiceError) : voiceError}</p>
        )}

        {isEditMode && suggestions.length > 0 && (
          <div className="nvh-ai-suggestions">
            <div className="nvh-ai-suggestions__heading">
              <FaRobot /> {t('ai_suggestions')}
            </div>
            <div className="nvh-ai-suggestions__list">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  className="nvh-inline-suggestion"
                  onClick={() => handleApplySuggestion(suggestion)}
                >
                  <span className="nvh-inline-suggestion__badge">
                    {index + 1}
                  </span>
                  <span className="nvh-inline-suggestion__text">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
});

VariationHeaderInfo.displayName = 'VariationHeaderInfo';

export default VariationHeaderInfo;
