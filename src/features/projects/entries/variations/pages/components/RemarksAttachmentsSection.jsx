import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPaperclip, FaTimes, FaPlus, FaFile, FaCheckCircle, FaRegEye, FaSpinner, FaExclamationTriangle, FaGripVertical, FaExchangeAlt, FaRobot, FaImage } from 'react-icons/fa';
import RichTextEditor from '../../../../../../components/common/RichTextEditor';
import SinglePresetSelectField from '../../../../../../components/common/SinglePresetSelectField';
import Button from '../../../../../../components/common/Button';
import VoiceNoteButton from '../../../../../../components/common/VoiceNoteButton';
import { useLineSyncTranslate } from '../../../../../../hooks/useLineSyncTranslate';
import { useVoiceTranscription } from '../../../../../../hooks/useVoiceTranscription';
import useCompanySettings from '../../../../../../hooks/useCompanySettings';
import { useSuggestWording } from '../hooks/useSuggestWording';
import { useImageRemarkSuggestion, MAX_IMAGE_SIZE_MB, ACCEPTED_IMAGE_TYPES } from '../hooks/useImageRemarkSuggestion';
import { useRemarksOverlapCheck } from '../hooks/useRemarksOverlapCheck';
import { normalizeRichTextForRender, htmlToPlainText, plainTextToHtml } from '../../../../../../utils/richText';
import { openFileInNewWindow, extractFileNameFromUrl, validateFileSize } from '../../../../../../utils/helpers/file';
import { ATTACHMENT_SECTIONS, ATTACHMENT_SECTIONS_AR, OTHER_ATTACHMENT_SECTION } from '../../utils/attachmentSections';
import {
  getOrderedAttachmentSections,
  partitionAttachmentsBySection,
  getAttachmentDisplayOrder,
  reorderAttachmentsWithinSection,
  reorderIndexItemsForAttachmentOrder,
  moveArrayItem,
  generateLocalId,
} from '../../utils/attachmentOrder';
import { createIndexRow } from './VariationIndexSection';
import { recalculatePageRanges } from '../../utils/pageRange';
import { projectApi } from '../../../../../../services';

const ACCEPTED_ATTACHMENT_TYPES = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_ATTACHMENT_SIZE_MB = 50;

function RichRemarksView({ value, className = '', dir = 'ltr' }) {
  const html = normalizeRichTextForRender(value);
  if (!html) return null;

  return (
    <div
      className={`nvc-rich-remarks-view ${className}`.trim()}
      dir={dir}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// A brand-new (never-saved) attachment with no heading chosen yet renders as
// just the heading picker — the file picker/heading-label input only appear
// once one is chosen, matching the "dropdown first" flow.
function PendingAttachmentRow({ att, t, onFieldChange, onRemove }) {
  return (
    <div className="nvc-attachment-row nvc-attachment-row--pending">
      <button
        type="button"
        className="nvc-attachment-row__corner-remove"
        onClick={onRemove}
        title={t('remove')}
      >
        <FaTimes />
      </button>
      <span className="nvc-attachment-row__pending-label">{t('attachment_choose_section', 'Choose a heading...')}</span>
      <SinglePresetSelectField
        value={att.section || ''}
        onChange={(val) => onFieldChange('section', val)}
        options={ATTACHMENT_SECTIONS}
        optionLabelsAr={ATTACHMENT_SECTIONS_AR}
        placeholder={t('attachment_choose_section', 'Choose a heading...')}
        className="nvc-attachment-row__heading-select"
      />
    </div>
  );
}

// Saved attachment — a full-width file bar (icon + filename + view action)
// on top, with a short heading input directly below it. Deliberately doesn't
// use <FileAttachmentView> (a fixed icon+filename+view+download block) since
// that leaves no room to add the heading input under it.
function SavedAttachmentRow({ att, isEditMode, t, onFileChange, onFieldChange, onRemove, dragHandleProps }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const fileUrl = att.url || att.file;
  const hasReplacement = att.replacementFile instanceof File;
  const displayName = hasReplacement
    ? att.replacementFile.name
    : att.file_name || att.name || extractFileNameFromUrl(fileUrl) || t('file');

  const handleView = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasReplacement) {
      const blobUrl = URL.createObjectURL(att.replacementFile);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }
    if (fileUrl) await openFileInNewWindow(fileUrl, displayName);
  };

  const processFile = (file) => {
    if (!file) return;

    if (!validateFileSize(file, MAX_ATTACHMENT_SIZE_MB)) {
      setError(t('file_upload_too_large', { name: file.name, maxSize: MAX_ATTACHMENT_SIZE_MB }));
      return;
    }
    const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    if (!ACCEPTED_ATTACHMENT_TYPES.includes(ext)) {
      setError(t('file_upload_invalid_file_type', { types: ACCEPTED_ATTACHMENT_TYPES.join(', ') }));
      return;
    }
    setError('');
    onFileChange(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    processFile(file);
  };

  const handleFileDrag = (e, isOver) => {
    if (!isEditMode || !Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsFileDragOver(isOver);
  };

  const handleFileDrop = (e) => {
    if (!isEditMode || !Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="nvc-attachment-row nvc-attachment-row--stacked">
      {isEditMode && (
        <button
          type="button"
          className="nvc-attachment-row__corner-remove"
          onClick={onRemove}
          title={t('remove')}
        >
          <FaTimes />
        </button>
      )}
      {isEditMode && dragHandleProps && (
        <span
          className="nvc-attachment-row__drag-handle"
          draggable
          {...dragHandleProps}
          title={t('drag_to_reorder', 'Drag to reorder')}
        >
          <FaGripVertical />
        </span>
      )}
      {isEditMode && (
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
          onChange={handleFileSelect}
          className="nvc-attachment-row__file-input-hidden"
        />
      )}
      <div
        className={`nvc-attachment-row__file-bar ${isFileDragOver ? 'nvc-attachment-row__file-bar--file-drag-over' : ''}`.trim()}
        onDragEnter={(e) => handleFileDrag(e, true)}
        onDragOver={(e) => handleFileDrag(e, true)}
        onDragLeave={(e) => handleFileDrag(e, false)}
        onDrop={handleFileDrop}
      >
        {hasReplacement
          ? <FaCheckCircle className="nvc-attachment-row__icon nvc-attachment-row__icon--success" />
          : <FaFile className="nvc-attachment-row__icon" />}
        <span className="nvc-attachment-row__filename" title={displayName}>{displayName}</span>
        {att.aiExtracting && (
          <span className="nvc-attachment-row__ai-status" title={t('attachment_ai_extracting', 'Reading document...')}>
            <FaSpinner className="nvc-attachment-row__icon nvc-attachment-row__icon--spin" />
          </span>
        )}
        {isEditMode && (
          <button
            type="button"
            className="nvc-attachment-row__icon-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            title={t('replace_file', 'Replace file')}
          >
            <FaExchangeAlt />
          </button>
        )}
        <button
          type="button"
          className="nvc-attachment-row__icon-btn"
          onClick={handleView}
          title={t('view_file')}
        >
          <FaRegEye />
        </button>
      </div>
      {att.aiChecked && (!att.ai_ref_no || !att.ai_date) && (
        <span className="nvc-attachment-row__ai-warning">
          <FaExclamationTriangle />
          {t('attachment_ai_extract_incomplete', "Couldn't detect ref no/date automatically - please check the Index table below.")}
        </span>
      )}
      {isEditMode ? (
        <input
          type="text"
          className="nvc-attachment-row__heading-input"
          value={att.heading ?? ''}
          onChange={(e) => onFieldChange('heading', e.target.value)}
          placeholder={t('attachment_heading', 'Heading')}
        />
      ) : (
        att.heading && <div className="nvc-attachment-row__heading-text">{att.heading}</div>
      )}
      {error && <span className="nvc-attachment-row__error">{error}</span>}
    </div>
  );
}

// Brand-new, not-yet-uploaded attachment — a full-width "choose file" bar on
// top (not the full-page <FileUpload> dropzone, which is far taller), with a
// short heading input directly below it.
function NewAttachmentRow({ att, t, onFileChange, onFieldChange, onRemove, dragHandleProps }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const hasFile = att.newFile instanceof File;

  const processFile = (file) => {
    if (!file) return;

    if (!validateFileSize(file, MAX_ATTACHMENT_SIZE_MB)) {
      setError(t('file_upload_too_large', { name: file.name, maxSize: MAX_ATTACHMENT_SIZE_MB }));
      return;
    }
    const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    if (!ACCEPTED_ATTACHMENT_TYPES.includes(ext)) {
      setError(t('file_upload_invalid_file_type', { types: ACCEPTED_ATTACHMENT_TYPES.join(', ') }));
      return;
    }
    setError('');
    onFileChange(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    processFile(file);
  };

  const handleFileDrag = (e, isOver) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsFileDragOver(isOver);
  };

  const handleFileDrop = (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  // The picked file lives only in memory until saved — open it from a local
  // blob URL so the user can confirm it's the right one right away, without
  // waiting for an actual upload.
  const handleViewSelected = (e) => {
    e.stopPropagation();
    if (!hasFile) return;
    const blobUrl = URL.createObjectURL(att.newFile);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  return (
    <div className="nvc-attachment-row nvc-attachment-row--stacked">
      <button
        type="button"
        className="nvc-attachment-row__corner-remove"
        onClick={onRemove}
        title={t('remove')}
      >
        <FaTimes />
      </button>
      {dragHandleProps && (
        <span
          className="nvc-attachment-row__drag-handle"
          draggable
          {...dragHandleProps}
          title={t('drag_to_reorder', 'Drag to reorder')}
        >
          <FaGripVertical />
        </span>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
        onChange={handleFileSelect}
        className="nvc-attachment-row__file-input-hidden"
      />
      <div
        className={`nvc-attachment-row__file-bar nvc-attachment-row__file-bar--action ${isFileDragOver ? 'nvc-attachment-row__file-bar--file-drag-over' : ''}`.trim()}
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(e) => handleFileDrag(e, true)}
        onDragOver={(e) => handleFileDrag(e, true)}
        onDragLeave={(e) => handleFileDrag(e, false)}
        onDrop={handleFileDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        {hasFile
          ? <FaCheckCircle className="nvc-attachment-row__icon nvc-attachment-row__icon--success" />
          : <FaFile className="nvc-attachment-row__icon" />}
        <span className="nvc-attachment-row__filename">
          {isFileDragOver
            ? t('attachment_drop_file', 'Drop file here')
            : hasFile
              ? att.newFile.name
              : t('attachment_drag_or_choose_file', 'Drag a file here or click to choose')}
        </span>
        {att.aiExtracting && (
          <span className="nvc-attachment-row__ai-status" title={t('attachment_ai_extracting', 'Reading document...')}>
            <FaSpinner className="nvc-attachment-row__icon nvc-attachment-row__icon--spin" />
          </span>
        )}
        {hasFile && !att.aiExtracting && (
          <button
            type="button"
            className="nvc-attachment-row__icon-btn"
            onClick={handleViewSelected}
            title={t('view_file')}
          >
            <FaRegEye />
          </button>
        )}
      </div>
      {att.aiChecked && (!att.ai_ref_no || !att.ai_date) && (
        <span className="nvc-attachment-row__ai-warning">
          <FaExclamationTriangle />
          {t('attachment_ai_extract_incomplete', "Couldn't detect ref no/date automatically — please check the Index table below.")}
        </span>
      )}
      <input
        type="text"
        className="nvc-attachment-row__heading-input"
        value={att.heading ?? ''}
        onChange={(e) => onFieldChange('heading', e.target.value)}
        placeholder={t('attachment_heading', 'Heading')}
      />
      {error && <span className="nvc-attachment-row__error">{error}</span>}
    </div>
  );
}

// Numbered, clickable candidate lines — shared between the "Suggest Wording"
// and "Generate remark from photo" AI features, which both resolve to the
// same action (apply one line into the English Remarks editor).
function AiSuggestionsList({ suggestions, onApply, label }) {
  if (!suggestions.length) return null;

  return (
    <div className="nvh-ai-suggestions">
      <div className="nvh-ai-suggestions__heading">
        <FaRobot /> {label}
      </div>
      <div className="nvh-ai-suggestions__list">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion}-${index}`}
            type="button"
            className="nvh-inline-suggestion"
            onClick={() => onApply(suggestion)}
          >
            <span className="nvh-inline-suggestion__badge">{index + 1}</span>
            <span className="nvh-inline-suggestion__text">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AttachmentRow({ att, isEditMode, t, onFileChange, onFieldChange, onRemove, dragHandleProps, rowDropProps, isDragging, isDragOver }) {
  const isSaved = !!(att.url || att.file);
  const isLegacyUnfiled = isEditMode && !ATTACHMENT_SECTIONS.includes(att.section);

  const row = isSaved ? (
    <SavedAttachmentRow att={att} isEditMode={isEditMode} t={t} onFileChange={onFileChange} onFieldChange={onFieldChange} onRemove={onRemove} dragHandleProps={dragHandleProps} />
  ) : isEditMode ? (
    <NewAttachmentRow att={att} t={t} onFileChange={onFileChange} onFieldChange={onFieldChange} onRemove={onRemove} dragHandleProps={dragHandleProps} />
  ) : null;

  const dropClass = [
    isDragging ? 'nvc-attachment-row-dropzone--dragging' : '',
    isDragOver ? 'nvc-attachment-row-dropzone--drag-over' : '',
  ].filter(Boolean).join(' ');

  // Already-categorized attachments show their section via the box title
  // above. Legacy/"Other" items still need a way to be filed into a proper
  // section, so they get an extra picker below the compact row.
  if (!isLegacyUnfiled) {
    return rowDropProps ? (
      <div className={`nvc-attachment-row-dropzone ${dropClass}`.trim()} {...rowDropProps}>
        {row}
      </div>
    ) : row;
  }

  return (
    <div className={`nvc-attachment-row-group ${dropClass}`.trim()} {...(rowDropProps || {})}>
      {row}
      <SinglePresetSelectField
        value=""
        onChange={(val) => onFieldChange('section', val)}
        options={ATTACHMENT_SECTIONS}
        optionLabelsAr={ATTACHMENT_SECTIONS_AR}
        placeholder={t('attachment_section', 'Section')}
        className="nvc-attachment-row__heading-select"
      />
    </div>
  );
}

const RemarksAttachmentsSection = memo(({
  formData,
  isEditMode,
  onFormDataChange,
  existingVariationAttachment,
  // new multi-attachment props
  variationAttachments,
  setVariationAttachments,
  estimatedNoticePages,
  t
}) => {
  const { i18n } = useTranslation();
  const isRTL = /^ar\b/i.test(i18n.language || '');
  const getSectionLabel = (section) => (isRTL && ATTACHMENT_SECTIONS_AR[section]) || section;

  // Company-wide General Remarks — always shown read-only, above the
  // per-variation Remarks editor below. Fetched once and cached/shared via
  // React Query, not stored per-variation.
  const { data: companySettings } = useCompanySettings();
  const generalRemarksEn = companySettings?.general_remarks_en || '';
  const generalRemarksAr = companySettings?.general_remarks_ar || '';

  // Suggest Wording + Voice Note for the English remarks pane — mirrors the
  // same two AI affordances on the Variation Description field. The English
  // pane is always the authored source of truth (unrelated to UI locale), so
  // both hooks are fixed to 'en'. Neither ever touches formData.remarks_ar —
  // the useLineSyncTranslate effect below reacts to any formData.remarks
  // change and re-syncs Arabic on its own.
  const {
    suggestions: remarksSuggestions,
    busy: remarksSuggestBusy,
    error: remarksSuggestError,
    requestSuggestion: requestRemarksSuggestion,
    discard: discardRemarksSuggestions,
  } = useSuggestWording({ language: 'en' });

  const handleSuggestRemarksWording = async () => {
    await requestRemarksSuggestion(htmlToPlainText(formData.remarks));
  };

  const handleApplyRemarksSuggestion = (suggestion) => {
    if (!suggestion) return;
    onFormDataChange(prev => ({ ...prev, remarks: plainTextToHtml(suggestion) }));
    discardRemarksSuggestions();
  };

  const handleRemarksChange = (html) => {
    discardRemarksSuggestions();
    onFormDataChange(prev => ({ ...prev, remarks: html }));
  };

  // Remarks are incremental bullet points, so voice notes append as a new
  // paragraph rather than replacing existing content.
  const appendRemarksTranscript = (transcript) => {
    discardRemarksSuggestions();
    onFormDataChange(prev => ({
      ...prev,
      remarks: `${prev.remarks || ''}${plainTextToHtml(transcript)}`,
    }));
  };

  const {
    recording: remarksRecording,
    transcribing: remarksTranscribing,
    error: remarksVoiceError,
    toggleRecording: toggleRemarksRecording,
  } = useVoiceTranscription({
    language: 'en',
    field: 'variation remarks',
    onTranscribed: appendRemarksTranscript,
  });
  const remarksVoiceActionLabel = remarksRecording
    ? t('stop_recording', 'Stop Recording')
    : remarksTranscribing
      ? t('transcribing_voice', 'Transcribing...')
      : t('record_voice_note', 'Record Voice Note');
  const remarksSuggestActionLabel = t('suggest_wording');

  // "Generate remark from photo" — user uploads an image (site condition,
  // defect, progress, a printed/handwritten note, ...) and Claude Vision
  // drafts candidate remark lines. Applying one appends it as a new
  // paragraph, same as a voice-note transcript, since it's new content being
  // added rather than a reword of existing text.
  const imageRemarkInputRef = useRef(null);
  const [imageRemarkClientError, setImageRemarkClientError] = useState('');
  const {
    suggestions: imageRemarkSuggestions,
    busy: imageRemarkBusy,
    error: imageRemarkError,
    requestSuggestion: requestImageRemarkSuggestion,
    discard: discardImageRemarkSuggestions,
    removeSuggestion: removeImageRemarkSuggestion,
  } = useImageRemarkSuggestion({ language: 'en' });

  const handleImageRemarkButtonClick = () => {
    imageRemarkInputRef.current?.click();
  };

  const handleImageRemarkFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    if (!ACCEPTED_IMAGE_TYPES.includes(ext)) {
      setImageRemarkClientError(t('file_upload_invalid_file_type', { types: ACCEPTED_IMAGE_TYPES.join(', ') }));
      return;
    }
    if (!validateFileSize(file, MAX_IMAGE_SIZE_MB)) {
      setImageRemarkClientError(t('file_upload_too_large', { name: file.name, maxSize: MAX_IMAGE_SIZE_MB }));
      return;
    }
    setImageRemarkClientError('');
    discardRemarksSuggestions();
    discardImageRemarkSuggestions();
    await requestImageRemarkSuggestion(file);
  };

  // Points are independent observations rather than alternative rewordings of
  // the same remark, so applying one only removes that point from the pending
  // list (see useImageRemarkSuggestion.removeSuggestion) — the rest stay
  // clickable so the user can add several from the same photo.
  const handleApplyImageRemarkSuggestion = (suggestion) => {
    if (!suggestion) return;
    onFormDataChange(prev => ({
      ...prev,
      remarks: `${prev.remarks || ''}${plainTextToHtml(suggestion)}`,
    }));
    removeImageRemarkSuggestion(suggestion);
  };

  const imageRemarkActionLabel = imageRemarkBusy
    ? t('reading_image', 'Reading image...')
    : t('generate_remark_from_photo', 'Generate remark from photo');

  // Arabic remarks stay in line-level sync with English: only lines that were
  // actually added/edited get (re)translated, plainly (no styling). Lines the
  // user hasn't touched in English are left completely alone in Arabic, so
  // any manual wording/styling applied there directly (via the Arabic
  // editor's own toolbar) persists indefinitely — see useLineSyncTranslate.
  const { translating } = useLineSyncTranslate(
    formData.remarks,
    formData.remarks_ar,
    (html) => onFormDataChange(prev => ({ ...prev, remarks_ar: html })),
    { enabled: isEditMode }
  );

  const handleArabicRemarksChange = (html) => {
    onFormDataChange(prev => ({ ...prev, remarks_ar: html }));
  };

  // Soft, dismissible warning if a new/edited English remark line looks like
  // it already means the same thing as something in General Remarks above.
  // Never blocks saving — see useRemarksOverlapCheck.
  const {
    warnings: remarksOverlapWarnings,
    dismissWarning: dismissRemarksOverlapWarning,
  } = useRemarksOverlapCheck(formData.remarks, generalRemarksEn, { enabled: isEditMode });

  // Every known section, in this variation's own drag-customized order
  // (falls back to the catalog order until the user reorders the boxes).
  const orderedSections = useMemo(
    () => getOrderedAttachmentSections(formData.attachment_section_order),
    [formData.attachment_section_order]
  );

  // Group attachments by section for display, keeping each item's original
  // index in `variationAttachments` so mutation handlers below stay index-based
  // regardless of which box/list renders it.
  //  - sectionGroups: any attachment (new or saved) with a matching section,
  //    in `orderedSections` order (drag-and-drop reorders the boxes below).
  //  - otherItems: already-saved (has an id) attachments with no/unrecognized
  //    section — legacy data from before this feature existed.
  //  - pendingItems: brand-new, not-yet-saved attachments with no section chosen
  //    yet — rendered as a bare "choose a heading" prompt, not inside a box.
  const { sectionGroups, otherItems, pendingItems } = useMemo(
    () => partitionAttachmentsBySection(variationAttachments, orderedSections),
    [variationAttachments, orderedSections]
  );

  // Drag-and-drop state — two independent interactions, both native HTML5 DnD:
  //  - row-level: reorder attachments inside a single section box. Dropping
  //    outside the section the drag started in is ignored (cross-section
  //    re-filing already exists via the heading dropdown, so drag is kept to
  //    reordering only).
  //  - section-level: reorder the boxes themselves, persisted as
  //    formData.attachment_section_order.
  const [draggingRowIndex, setDraggingRowIndex] = useState(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState(null);
  const rowDragSectionRef = useRef(null);

  const handleRowDragStart = (sectionKey, index) => (e) => {
    rowDragSectionRef.current = sectionKey;
    setDraggingRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleRowDragEnd = () => {
    rowDragSectionRef.current = null;
    setDraggingRowIndex(null);
    setDragOverRowIndex(null);
  };

  const handleRowDragOver = (sectionKey, index) => (e) => {
    if (rowDragSectionRef.current !== sectionKey) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverRowIndex !== index) setDragOverRowIndex(index);
  };

  const handleRowDrop = (sectionKey, index) => (e) => {
    if (rowDragSectionRef.current !== sectionKey || draggingRowIndex === null) return;
    e.preventDefault();
    const fromIndex = draggingRowIndex;
    setVariationAttachments(prev => reorderAttachmentsWithinSection(prev, fromIndex, index));
    handleRowDragEnd();
  };

  const [draggingSection, setDraggingSection] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);

  const handleSectionDragStart = (sectionKey) => (e) => {
    setDraggingSection(sectionKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionKey);
  };

  const handleSectionDragEnd = () => {
    setDraggingSection(null);
    setDragOverSection(null);
  };

  const handleSectionDragOver = (sectionKey) => (e) => {
    if (!draggingSection || draggingSection === sectionKey) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSection !== sectionKey) setDragOverSection(sectionKey);
  };

  const handleSectionDrop = (sectionKey) => (e) => {
    if (!draggingSection || draggingSection === sectionKey) return;
    e.preventDefault();
    const fromIdx = orderedSections.indexOf(draggingSection);
    const toIdx = orderedSections.indexOf(sectionKey);
    const nextOrder = moveArrayItem(orderedSections, fromIdx, toIdx);
    onFormDataChange(prev => ({ ...prev, attachment_section_order: nextOrder }));
    handleSectionDragEnd();
  };

  // Keeps each auto-created Index row in sync with its linked attachment:
  //  - "Order" follows the attachment's current on-screen position (box order,
  //    then drag order within the box) — dragging an attachment reorders its
  //    linked Index row the same way, without moving manually-added rows.
  //  - "Attachment" mirrors the heading, however it's later edited (in either
  //    order — before or after the file is picked).
  //  - "Attachment Pages" is recalculated to start right after the Notice +
  //    Index pages (estimatedNoticePages) plus every earlier row's page span,
  //    so attachment numbering always reflects where each file actually lands
  //    in the exported PDF instead of restarting at page 1. Runs whenever the
  //    notice's own page count changes too, since that shifts every attachment
  //    after it. Only rows tagged with linked_attachment_id are touched —
  //    manually added rows keep whatever the user typed.
  useEffect(() => {
    if (!isEditMode) return;
    const items = Array.isArray(formData.index_items) ? formData.index_items : [];
    if (!items.length) return;

    const headingSynced = items.map(row => {
      if (!row.linked_attachment_id) return row;
      const att = variationAttachments?.find(a => a.localId === row.linked_attachment_id);
      if (!att) return row;
      const heading = att.heading || '';
      return row.attachment === heading ? row : { ...row, attachment: heading };
    });

    const displayOrderIds = getAttachmentDisplayOrder(variationAttachments, orderedSections)
      .map(att => att.localId)
      .filter(Boolean);
    const orderSynced = reorderIndexItemsForAttachmentOrder(headingSynced, displayOrderIds);

    const rangeSynced = recalculatePageRanges(orderSynced, estimatedNoticePages);

    const changed = rangeSynced.some((row, i) => row !== items[i]);
    if (changed) {
      onFormDataChange(prev => ({ ...prev, index_items: rangeSynced }));
    }
  }, [variationAttachments, orderedSections, formData.index_items, estimatedNoticePages, isEditMode, onFormDataChange]);

  if (!isEditMode && !formData.remarks && !existingVariationAttachment && !variationAttachments?.length) {
    return null;
  }

  const handleAddAttachment = () => {
    setVariationAttachments(prev => [
      ...prev,
      { id: null, url: null, name: '', newFile: null, section: '', heading: '', localId: generateLocalId() },
    ]);
  };

  const handleRemoveAttachment = (index) => {
    const removed = variationAttachments?.[index];
    setVariationAttachments(prev => prev.filter((_, i) => i !== index));
    // Drop the linked Index row along with its attachment so nothing orphans.
    // Rows the user added manually (no link) are never touched here.
    if (removed?.localId) {
      onFormDataChange(prev => ({
        ...prev,
        index_items: (Array.isArray(prev.index_items) ? prev.index_items : [])
          .filter(row => row.linked_attachment_id !== removed.localId),
      }));
    }
  };

  const handleAttachmentFileChange = async (index, file) => {
    const localId = variationAttachments?.[index]?.localId;
    const isSavedAttachment = !!variationAttachments?.[index]?.id;

    setVariationAttachments(prev => prev.map((item) =>
      item.localId === localId
        ? {
          ...item,
          ...(isSavedAttachment
            ? { replacementFile: file, replacementName: file?.name || item.replacementName }
            : { newFile: file, name: file?.name || item.name }),
          aiExtracting: true,
          aiChecked: false,
        }
        : item
    ));

    if (!file || !localId) return;

    let result = null;
    try {
      result = await projectApi.extractVariationIndexData(file);
    } catch (_error) {
      result = null;
    }

    const refNo = result?.ref_no || '';
    const date = result?.date || '';
    const pageCount = result?.page_count || 1;

    setVariationAttachments(prev => prev.map((item) =>
      item.localId === localId
        ? { ...item, aiExtracting: false, aiChecked: true, ai_ref_no: refNo, ai_date: date, ai_page_count: pageCount }
        : item
    ));

    onFormDataChange(prev => {
      const items = Array.isArray(prev.index_items) ? [...prev.index_items] : [];
      const existingRowIndex = items.findIndex(row => row.linked_attachment_id === localId);
      if (existingRowIndex >= 0) {
        items[existingRowIndex] = {
          ...items[existingRowIndex],
          ref_no: refNo,
          date,
          page_count: pageCount,
        };
      } else {
        items.push(createIndexRow(items.length, {
          ref_no: refNo,
          date,
          page_count: pageCount,
          linked_attachment_id: localId,
        }));
      }
      // page_numbers (the displayed range, e.g. "3-5") is derived from
      // page_count + estimatedNoticePages by the sync effect above — not set
      // directly here, so it always reflects the notice's current page count.
      return { ...prev, index_items: recalculatePageRanges(items, estimatedNoticePages) };
    });
  };

  const handleAttachmentFieldChange = (index, field, value) => {
    setVariationAttachments(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const renderBox = (key, items, { orderable = false } = {}) => {
    const boxDragProps = (isEditMode && orderable) ? {
      onDragOver: handleSectionDragOver(key),
      onDrop: handleSectionDrop(key),
    } : {};
    const boxDragClass = orderable ? [
      draggingSection === key ? 'nvc-attachment-section-box--dragging' : '',
      dragOverSection === key && draggingSection !== key ? 'nvc-attachment-section-box--drag-over' : '',
    ].filter(Boolean).join(' ') : '';

    return (
      <div key={key} className={`nvc-attachment-section-box ${boxDragClass}`.trim()} {...boxDragProps}>
        <div className="nvc-attachment-section-box__header">
          {isEditMode && orderable && (
            <span
              className="nvc-attachment-section-box__drag-handle"
              draggable
              onDragStart={handleSectionDragStart(key)}
              onDragEnd={handleSectionDragEnd}
              title={t('drag_to_reorder_section', 'Drag to reorder section')}
            >
              <FaGripVertical />
            </span>
          )}
          <FaPaperclip className="nvc-attachment-section-box__icon" />
          <span className="nvc-attachment-section-box__title">{getSectionLabel(key)}</span>
          <span className="nvc-attachment-section-box__count">{items.length}</span>
        </div>
        <div className="nvc-attachment-section-box__list">
          {items.map(({ att, i }) => (
            <AttachmentRow
              key={att.id ?? `new-${i}`}
              att={att}
              isEditMode={isEditMode}
              t={t}
              onFileChange={(file) => handleAttachmentFileChange(i, file)}
              onFieldChange={(field, value) => handleAttachmentFieldChange(i, field, value)}
              onRemove={() => handleRemoveAttachment(i)}
              dragHandleProps={isEditMode ? {
                onDragStart: handleRowDragStart(key, i),
                onDragEnd: handleRowDragEnd,
              } : null}
              rowDropProps={isEditMode ? {
                onDragOver: handleRowDragOver(key, i),
                onDrop: handleRowDrop(key, i),
              } : null}
              isDragging={draggingRowIndex === i}
              isDragOver={dragOverRowIndex === i && draggingRowIndex !== i}
            />
          ))}
        </div>
      </div>
    );
  };

  const hasAnyBoxContent = otherItems.length > 0 || sectionGroups.some(g => g.items.length > 0);
  const isCompletelyEmpty = !hasAnyBoxContent && pendingItems.length === 0;

  return (
    <div className="nvc-section nvc-section--remarks">
      {(generalRemarksEn || generalRemarksAr) && (
        <div className="nvc-field nvc-field--full nvc-general-remarks">
          <div className="nvc-section-header">
            <h3>{t('general_remarks_title', 'General Remarks')}</h3>
          </div>
          <div className="nvc-remarks-split-view-grid">
            <div className="nvc-remarks-split-view-col" style={{ whiteSpace: 'pre-wrap' }}>
              {generalRemarksEn}
            </div>
            <div className="nvc-remarks-split-view-divider" />
            <div className="nvc-remarks-split-view-col nvc-remarks-split-view-col--ar" style={{ whiteSpace: 'pre-wrap' }} dir="rtl">
              {generalRemarksAr}
            </div>
          </div>
        </div>
      )}

      {(isEditMode || formData.remarks) && (
        <div className="nvc-section-header">
          <h3>{t('remarks')}</h3>
        </div>
      )}
      <div className="nvc-remarks-grid">
        <div className="nvc-field nvc-field--full">
          {isEditMode ? (
            <>
            <div className="nvc-remarks-split-card">
              {/* English pane — original input */}
              <div className="nvc-remarks-split-pane nvc-remarks-split-pane--en" dir="ltr">
                <div className="nvc-remarks-split-pane__header">
                  <span className="nvc-remarks-split-pane__lang">EN</span>
                  <span className="nvc-remarks-split-pane__label">{t('english', 'English')}</span>
                </div>
                <div className="nvc-remarks-editor">
                  <RichTextEditor
                    className="nvc-remarks-rich-editor"
                    value={formData.remarks ?? ''}
                    onChange={handleRemarksChange}
                    placeholder={`${t('remarks')} — ${t('one_point_per_line', 'one point per line')}`}
                    dir="ltr"
                    t={t}
                  />
                  <div className="nvh-desc-row__actions">
                    <span className="nvh-action-tooltip">
                      <VoiceNoteButton
                        recording={remarksRecording}
                        transcribing={remarksTranscribing}
                        disabled={remarksSuggestBusy || imageRemarkBusy}
                        onClick={toggleRemarksRecording}
                        t={t}
                        iconOnly
                        showNativeTooltip={false}
                      />
                      <span className="nvh-action-tooltip__content" role="tooltip">
                        {remarksVoiceActionLabel}
                      </span>
                    </span>
                    <span className="nvh-action-tooltip">
                      <Button
                        size="icon"
                        variant="ghost"
                        loading={remarksSuggestBusy}
                        disabled={!htmlToPlainText(formData.remarks).trim() || remarksRecording || remarksTranscribing || imageRemarkBusy}
                        startIcon={<FaRobot />}
                        onClick={handleSuggestRemarksWording}
                        aria-label={remarksSuggestActionLabel}
                      />
                      <span className="nvh-action-tooltip__content" role="tooltip">
                        {remarksSuggestActionLabel}
                      </span>
                    </span>
                    <span className="nvh-action-tooltip">
                      <input
                        ref={imageRemarkInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageRemarkFileSelected}
                        className="nvc-attachment-row__file-input-hidden"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        loading={imageRemarkBusy}
                        disabled={remarksRecording || remarksTranscribing || remarksSuggestBusy}
                        startIcon={<FaImage />}
                        onClick={handleImageRemarkButtonClick}
                        aria-label={imageRemarkActionLabel}
                      />
                      <span className="nvh-action-tooltip__content" role="tooltip">
                        {imageRemarkActionLabel}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="nvc-remarks-split-divider" />

              {/* Arabic pane — auto-translated + auto-formatted to mirror
                  English by default, but freely editable/stylable on its own;
                  editing it here stops the auto-mirroring for this field (see
                  handleArabicRemarksChange) so manual work is never undone. */}
              <div className="nvc-remarks-split-pane nvc-remarks-split-pane--ar">
                <div className="nvc-remarks-split-pane__header">
                  <span className="nvc-remarks-split-pane__lang">ع</span>
                  <span className="nvc-remarks-split-pane__label">
                    {translating ? (
                      <span className="nvc-remarks-split-pane__translating">
                        <span className="nvc-remarks-split-pane__dot" />
                        {t('translating', 'Translating')}...
                      </span>
                    ) : t('arabic', 'Arabic')}
                  </span>
                </div>
                <RichTextEditor
                  className="nvc-remarks-rich-editor"
                  value={formData.remarks_ar ?? ''}
                  onChange={handleArabicRemarksChange}
                  placeholder={t('auto_translated_arabic', 'ترجمة تلقائية...')}
                  dir="rtl"
                  t={t}
                />
              </div>
            </div>

            {remarksSuggestError && (
              <p className="nvh-suggest-error">
                {t(remarksSuggestError) !== remarksSuggestError ? t(remarksSuggestError) : remarksSuggestError}
              </p>
            )}

            {remarksVoiceError && (
              <p className="nvh-suggest-error">
                {t(remarksVoiceError) !== remarksVoiceError ? t(remarksVoiceError) : remarksVoiceError}
              </p>
            )}

            {imageRemarkClientError && (
              <p className="nvh-suggest-error">{imageRemarkClientError}</p>
            )}

            {imageRemarkError && (
              <p className="nvh-suggest-error">
                {t(imageRemarkError) !== imageRemarkError ? t(imageRemarkError) : imageRemarkError}
              </p>
            )}

            {remarksOverlapWarnings.length > 0 && (
              <div className="nvh-remarks-overlap-warnings">
                <div className="nvh-remarks-overlap-warnings__heading">
                  <FaExclamationTriangle /> {t('remarks_overlap_heading', 'May already be covered in General Remarks')}
                </div>
                {remarksOverlapWarnings.map((w) => (
                  <div key={w.line} className="nvh-remarks-overlap-warning">
                    <div className="nvh-remarks-overlap-warning__text">
                      <span className="nvh-remarks-overlap-warning__line">&ldquo;{w.line}&rdquo;</span>
                      {' '}{t('remarks_overlap_matches', 'matches General Remarks:')}{' '}
                      <span className="nvh-remarks-overlap-warning__matched">&ldquo;{w.matchedPoint}&rdquo;</span>
                    </div>
                    <button
                      type="button"
                      className="nvh-remarks-overlap-warning__dismiss"
                      onClick={() => dismissRemarksOverlapWarning(w.line)}
                      title={t('dismiss', 'Dismiss')}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <AiSuggestionsList
              suggestions={remarksSuggestions}
              onApply={handleApplyRemarksSuggestion}
              label={t('ai_suggestions')}
            />

            <AiSuggestionsList
              suggestions={imageRemarkSuggestions}
              onApply={handleApplyImageRemarkSuggestion}
              label={t('ai_points_from_image', 'Points detected in photo — click to add each')}
            />
            </>
          ) : formData.remarks ? (
            formData.remarks_ar ? (
              <div className="nvc-remarks-split-view-grid">
                <div className="nvc-remarks-split-view-col">
                  <RichRemarksView value={formData.remarks} />
                </div>
                <div className="nvc-remarks-split-view-divider" />
                <div className="nvc-remarks-split-view-col nvc-remarks-split-view-col--ar" dir="rtl">
                  <RichRemarksView value={formData.remarks_ar} dir="rtl" />
                </div>
              </div>
            ) : (
              <RichRemarksView value={formData.remarks} />
            )
          ) : null}
        </div>

        {/* Multi-file attachments, grouped into fixed sections */}
        <div className="nvc-field nvc-field--full no-print">
          {(isEditMode || variationAttachments?.length > 0) && (
            <label className="nvc-attachments-label">
              <FaPaperclip style={{ marginRight: 6 }} />
              {t('pdf_attachments')}
              <span className="nvc-attachments-hint"> — {t('pdf_attachments_hint')}</span>
            </label>
          )}

          {(hasAnyBoxContent || (isEditMode && pendingItems.length > 0)) && (
            <div className="nvc-attachment-sections-grid">
              {sectionGroups
                .filter(({ items }) => items.length > 0)
                .map(({ key, items }) => renderBox(key, items, { orderable: true }))}

              {otherItems.length > 0 && renderBox(
                t('attachment_other_section', OTHER_ATTACHMENT_SECTION),
                otherItems
              )}

              {isEditMode && pendingItems.map(({ att, i }) => (
                <PendingAttachmentRow
                  key={`pending-${i}`}
                  att={att}
                  t={t}
                  onFieldChange={(field, value) => handleAttachmentFieldChange(i, field, value)}
                  onRemove={() => handleRemoveAttachment(i)}
                />
              ))}
            </div>
          )}

          {isEditMode && isCompletelyEmpty && (
            <p className="nvc-attachments-empty-hint">
              {t('attachment_empty_hint', 'No attachments yet — click "Add Attachment" to get started.')}
            </p>
          )}

          {isEditMode && (
            <button
              type="button"
              className="nvc-attachment-add-btn"
              onClick={handleAddAttachment}
            >
              <FaPlus style={{ marginRight: 6 }} />
              {t('add_attachment')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

RemarksAttachmentsSection.displayName = 'RemarksAttachmentsSection';

export default RemarksAttachmentsSection;
