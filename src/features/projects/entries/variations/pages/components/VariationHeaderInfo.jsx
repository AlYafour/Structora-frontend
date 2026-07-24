/**
 * VariationHeaderInfo Component — Redesigned
 */

import { memo } from 'react';
import { FaHashtag, FaCalendarAlt, FaMapMarkerAlt, FaTag, FaAlignLeft, FaRobot, FaHistory } from 'react-icons/fa';
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
  projectId,
  variationId,
  referenceIsAutomatic,
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
  const descriptionNeedsBootstrap = !primaryDescription.trim() && !!secondaryDescription.trim();
  const translationSourceDescription = descriptionNeedsBootstrap ? secondaryDescription : primaryDescription;
  const translationTargetField = descriptionNeedsBootstrap ? primaryDescriptionField : secondaryDescriptionField;
  const {
    suggestions,
    previousVariations,
    busy,
    error,
    requestSuggestion,
    discard,
  } = useSuggestWording({
    language: languageCode,
    context: 'variation_description',
    projectId,
    variationId,
  });
  const { translating: translatingDescription } = useMachineAutoTranslate(
    translationSourceDescription,
    (translated) => onFormDataChange(prev => ({
      ...prev,
      [translationTargetField]: translated,
    })),
    {
      enabled: isEditMode,
      source: (isArabicPrimary !== descriptionNeedsBootstrap) ? 'ar' : 'en',
      target: (isArabicPrimary !== descriptionNeedsBootstrap) ? 'en' : 'ar',
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

  const handleEnglishDescriptionChange = (event) => {
    if (!isArabicPrimary) {
      handleDescriptionChange(event);
      return;
    }
    discard();
    onFormDataChange(prev => ({ ...prev, variation_description: event.target.value }));
  };

  const handleArabicDescriptionChange = (event) => {
    if (isArabicPrimary) {
      handleDescriptionChange(event);
      return;
    }
    discard();
    onFormDataChange(prev => ({ ...prev, variation_description_ar: event.target.value }));
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
  const voiceActionLabel = recording
    ? t('stop_recording', 'Stop Recording')
    : transcribing
      ? t('transcribing_voice', 'Transcribing...')
      : t('record_voice_note', 'Record Voice Note');
  const suggestActionLabel = t('suggest_wording');

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
            {isEditMode && !referenceIsAutomatic ? (
              <input
                type="text"
                value={formData.reference_no ?? ''}
                onChange={(e) => onFormDataChange({ ...formData, reference_no: e.target.value })}
                className="nvh-inline-input"
                placeholder="VAR0001"
              />
            ) : (
              <span className="nvh-card__value nvh-card__value--mono">
                {formData.reference_no || (referenceIsAutomatic ? t('reference_generated_on_save') : '—')}
              </span>
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
      <div className="nvh-desc-card">
        <div className="nvh-desc-card__header">
          <span className="nvh-desc-card__title"><FaAlignLeft />{t('variation_description')}</span>
        </div>

        {isEditMode ? (
          <div className="nvh-desc-card__body" dir={isArabicPrimary ? 'rtl' : 'ltr'}>
            <textarea
              value={primaryDescription}
              onChange={isArabicPrimary ? handleArabicDescriptionChange : handleEnglishDescriptionChange}
              className="nvh-desc-card__textarea"
              dir={isArabicPrimary ? 'rtl' : 'ltr'}
              rows={2}
              placeholder={`${t('variation_description')} — ${isArabicPrimary ? t('arabic', 'Arabic') : t('english', 'English')}`}
            />
            <div className="nvh-desc-card__footer">
              <span className="nvh-desc-card__count">{primaryDescription.length} {t('characters', 'characters')}</span>
              <div className="nvh-desc-row__actions">
                <span className="nvh-action-tooltip">
                  <VoiceNoteButton
                    recording={recording}
                    transcribing={transcribing}
                    disabled={busy}
                    onClick={toggleRecording}
                    t={t}
                    iconOnly
                    showNativeTooltip={false}
                  />
                  <span className="nvh-action-tooltip__content" role="tooltip">
                    {voiceActionLabel}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="accent"
                  loading={busy}
                  disabled={!primaryDescription?.trim() || recording || transcribing}
                  startIcon={<FaRobot />}
                  onClick={handleSuggestWording}
                  className="nvh-desc-card__suggest-btn"
                >
                  {suggestActionLabel}
                </Button>
              </div>
            </div>

            <div className="nvh-desc-card__divider" />
            <div className="nvh-description-translation" dir={isArabicPrimary ? 'ltr' : 'rtl'}>
              <div className="nvh-description-translation__header">
                <span className="nvh-description-translation__label">
                  {translatingDescription
                    ? `${t('translating', 'Translating')}...`
                    : (isArabicPrimary ? t('english', 'English') : t('arabic', 'Arabic'))}
                </span>
                <span className={`nvh-description-translation__badge${isArabicPrimary ? '' : ' nvh-description-translation__badge--ar'}`}>
                  {isArabicPrimary ? 'EN' : 'ع'}
                </span>
              </div>
              <textarea
                value={secondaryDescription}
                onChange={isArabicPrimary ? handleEnglishDescriptionChange : handleArabicDescriptionChange}
                className="nvh-desc-card__textarea"
                dir={isArabicPrimary ? 'ltr' : 'rtl'}
                rows={2}
                placeholder={isArabicPrimary
                  ? t('auto_translated_english', 'Auto-translated English')
                  : t('auto_translated_arabic', 'Auto-translated Arabic')}
              />
            </div>
          </div>
        ) : (
          <div dir={isArabicPrimary ? 'rtl' : 'ltr'}>
            <div className="nvh-desc-row__text" dir={isArabicPrimary ? 'rtl' : 'ltr'}>
              {primaryDescription || <span className="nvh-desc-row__empty">—</span>}
            </div>
            {secondaryDescription && (
              <>
                <div className="nvh-desc-card__divider" />
                <div className="nvh-description-translation" dir={isArabicPrimary ? 'ltr' : 'rtl'}>
                  <div className="nvh-description-translation__text">{secondaryDescription}</div>
                </div>
              </>
            )}
          </div>
        )}

        {isEditMode && error && (
          <p className="nvh-suggest-error">{t(error) !== error ? t(error) : error}</p>
        )}

        {isEditMode && voiceError && (
          <p className="nvh-suggest-error">{t(voiceError) !== voiceError ? t(voiceError) : voiceError}</p>
        )}

        {isEditMode && previousVariations.length > 0 && (
          <div className="nvh-ai-suggestions nvh-ai-suggestions--history">
            <div className="nvh-ai-suggestions__heading">
              <FaHistory /> {t('used_in_previous_variations')}
            </div>
            <div className="nvh-ai-suggestions__list">
              {previousVariations.map((previousVariation) => (
                <button
                  key={`${previousVariation.variation_id}-${previousVariation.text}`}
                  type="button"
                  className="nvh-inline-suggestion nvh-inline-suggestion--history"
                  onClick={() => handleApplySuggestion(previousVariation.text)}
                >
                  <span className="nvh-inline-suggestion__badge">
                    {previousVariation.variation_number || previousVariation.variation_id}
                  </span>
                  <span className="nvh-inline-suggestion__text">{previousVariation.text}</span>
                </button>
              ))}
            </div>
          </div>
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
