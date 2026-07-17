import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPaperclip, FaTimes, FaPlus, FaFile, FaCheckCircle, FaRegEye, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import RichTextEditor from '../../../../../../components/common/RichTextEditor';
import SinglePresetSelectField from '../../../../../../components/common/SinglePresetSelectField';
import { useLineSyncTranslate } from '../../../../../../hooks/useLineSyncTranslate';
import { normalizeRichTextForRender } from '../../../../../../utils/richText';
import { openFileInNewWindow, extractFileNameFromUrl, validateFileSize } from '../../../../../../utils/helpers/file';
import { ATTACHMENT_SECTIONS, ATTACHMENT_SECTIONS_AR, OTHER_ATTACHMENT_SECTION } from '../../utils/attachmentSections';
import { createIndexRow } from './VariationIndexSection';
import { recalculatePageRanges } from '../../utils/pageRange';
import { projectApi } from '../../../../../../services';

const ACCEPTED_ATTACHMENT_TYPES = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_ATTACHMENT_SIZE_MB = 50;

const generateLocalId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

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
function SavedAttachmentRow({ att, isEditMode, t, onFieldChange, onRemove }) {
  const fileUrl = att.url || att.file;
  const displayName = att.file_name || att.name || extractFileNameFromUrl(fileUrl) || t('file');

  const handleView = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileUrl) await openFileInNewWindow(fileUrl, displayName);
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
      <div className="nvc-attachment-row__file-bar">
        <FaFile className="nvc-attachment-row__icon" />
        <span className="nvc-attachment-row__filename" title={displayName}>{displayName}</span>
        <button
          type="button"
          className="nvc-attachment-row__icon-btn"
          onClick={handleView}
          title={t('view_file')}
        >
          <FaRegEye />
        </button>
      </div>
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
    </div>
  );
}

// Brand-new, not-yet-uploaded attachment — a full-width "choose file" bar on
// top (not the full-page <FileUpload> dropzone, which is far taller), with a
// short heading input directly below it.
function NewAttachmentRow({ att, t, onFileChange, onFieldChange, onRemove }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const hasFile = att.newFile instanceof File;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
        onChange={handleFileSelect}
        className="nvc-attachment-row__file-input-hidden"
      />
      <div
        className="nvc-attachment-row__file-bar nvc-attachment-row__file-bar--action"
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
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
          {hasFile ? att.newFile.name : t('file_upload_select_file', 'Choose file')}
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

function AttachmentRow({ att, isEditMode, t, onFileChange, onFieldChange, onRemove }) {
  const isSaved = !!(att.url || att.file);
  const isLegacyUnfiled = isEditMode && !ATTACHMENT_SECTIONS.includes(att.section);

  const row = isSaved ? (
    <SavedAttachmentRow att={att} isEditMode={isEditMode} t={t} onFieldChange={onFieldChange} onRemove={onRemove} />
  ) : isEditMode ? (
    <NewAttachmentRow att={att} t={t} onFileChange={onFileChange} onFieldChange={onFieldChange} onRemove={onRemove} />
  ) : null;

  // Already-categorized attachments show their section via the box title
  // above. Legacy/"Other" items still need a way to be filed into a proper
  // section, so they get an extra picker below the compact row.
  if (!isLegacyUnfiled) return row;

  return (
    <div className="nvc-attachment-row-group">
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

  // Group attachments by section for display, keeping each item's original
  // index in `variationAttachments` so mutation handlers below stay index-based
  // regardless of which box/list renders it.
  //  - sectionGroups: any attachment (new or saved) with a matching section.
  //  - otherItems: already-saved (has an id) attachments with no/unrecognized
  //    section — legacy data from before this feature existed.
  //  - pendingItems: brand-new, not-yet-saved attachments with no section chosen
  //    yet — rendered as a bare "choose a heading" prompt, not inside a box.
  const { sectionGroups, otherItems, pendingItems } = useMemo(() => {
    const indexed = (variationAttachments || []).map((att, i) => ({ att, i }));
    const groups = ATTACHMENT_SECTIONS.map((section) => ({
      key: section,
      items: indexed.filter(({ att }) => att.section === section),
    }));
    const others = indexed.filter(({ att }) => att.id && !ATTACHMENT_SECTIONS.includes(att.section));
    const pending = indexed.filter(({ att }) => !att.id && !ATTACHMENT_SECTIONS.includes(att.section));
    return { sectionGroups: groups, otherItems: others, pendingItems: pending };
  }, [variationAttachments]);

  // Keeps each auto-created Index row in sync with its linked attachment:
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

    const rangeSynced = recalculatePageRanges(headingSynced, estimatedNoticePages);

    const changed = rangeSynced.some((row, i) => row !== items[i]);
    if (changed) {
      onFormDataChange(prev => ({ ...prev, index_items: rangeSynced }));
    }
  }, [variationAttachments, formData.index_items, estimatedNoticePages, isEditMode, onFormDataChange]);

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

    setVariationAttachments(prev => prev.map((item) =>
      item.localId === localId
        ? { ...item, newFile: file, name: file?.name || item.name, aiExtracting: true, aiChecked: false }
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

  const renderBox = (key, items) => (
    <div key={key} className="nvc-attachment-section-box">
      <div className="nvc-attachment-section-box__header">
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
          />
        ))}
      </div>
    </div>
  );

  const hasAnyBoxContent = otherItems.length > 0 || sectionGroups.some(g => g.items.length > 0);
  const isCompletelyEmpty = !hasAnyBoxContent && pendingItems.length === 0;

  return (
    <div className="nvc-section nvc-section--remarks">
      {(isEditMode || formData.remarks) && (
        <div className="nvc-section-header">
          <h3>{t('remarks')}</h3>
        </div>
      )}
      <div className="nvc-remarks-grid">
        <div className="nvc-field nvc-field--full">
          {isEditMode ? (
            <div className="nvc-remarks-split-card">
              {/* English pane — original input */}
              <div className="nvc-remarks-split-pane nvc-remarks-split-pane--en">
                <div className="nvc-remarks-split-pane__header">
                  <span className="nvc-remarks-split-pane__lang">EN</span>
                  <span className="nvc-remarks-split-pane__label">{t('english', 'English')}</span>
                </div>
                <RichTextEditor
                  className="nvc-remarks-rich-editor"
                  value={formData.remarks ?? ''}
                  onChange={(html) => onFormDataChange({ ...formData, remarks: html })}
                  placeholder={`${t('remarks')} — ${t('one_point_per_line', 'one point per line')}`}
                  dir="ltr"
                  t={t}
                />
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
                .map(({ key, items }) => renderBox(key, items))}

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
