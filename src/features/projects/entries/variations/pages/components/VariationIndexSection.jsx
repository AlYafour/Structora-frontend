import { memo } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { formatIndexDate } from '../../utils/formatIndexDate';

// Exported so attachment-upload code (RemarksAttachmentsSection) can create
// index rows using the exact same shape when auto-filling from an upload.
export const createIndexRow = (index = 0, overrides = {}) => ({
  serial_no: String(index + 1),
  attachment: '',
  ref_no: '',
  date: '',
  page_numbers: '',
  purpose: '',
  linked_attachment_id: null,
  page_count: null,
  ...overrides,
});

const normalizeIndexRow = (row = {}, index = 0) => ({
  serial_no: String(row.serial_no || index + 1),
  attachment: row.attachment ?? row.content ?? row.content_type ?? '',
  ref_no: row.ref_no ?? row.quotation_reference_number ?? row.drawing_reference ?? '',
  date: row.date ?? '',
  page_numbers: row.page_numbers ?? '',
  purpose: row.purpose ?? row.remark ?? row.supplier_name ?? '',
  linked_attachment_id: row.linked_attachment_id ?? null,
  page_count: row.page_count ?? null,
});

const getIndexRows = (formData) => (
  Array.isArray(formData?.index_items)
    ? formData.index_items.map(normalizeIndexRow)
    : []
);

const hasVisibleData = (row) => (
  row?.serial_no ||
  row?.attachment ||
  row?.ref_no ||
  row?.date ||
  row?.page_numbers ||
  row?.purpose
);

const renderCell = (value) => value || '-';

const VariationIndexSection = memo(({
  formData,
  isEditMode,
  onFormDataChange,
  estimatedNoticePages,
  t,
}) => {
  const indexItems = getIndexRows(formData);
  const visibleRows = indexItems.filter(hasVisibleData);

  if (!isEditMode && visibleRows.length === 0) return null;

  const updateRows = (rows) => {
    onFormDataChange(prev => ({
      ...prev,
      index_items: rows,
    }));
  };

  const handleAddRow = () => {
    updateRows([...indexItems, createIndexRow(indexItems.length)]);
  };

  const handleUpdateRow = (rowIndex, field, value) => {
    updateRows(indexItems.map((row, index) => (
      index === rowIndex ? { ...row, [field]: value } : row
    )));
  };

  const handleRemoveRow = (rowIndex) => {
    updateRows(indexItems.filter((_, index) => index !== rowIndex));
  };

  const handleUpdateNote = (field, value) => {
    onFormDataChange(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const rowsToRender = isEditMode ? indexItems : visibleRows;

  return (
    <section className="nvc-section nvc-index-section">
      <div className="nvc-section-header nvc-section-header--flex">
        <div className="nvc-index-title-group">
          <h3>{t('index', 'Index')}</h3>
          {isEditMode && (
            <span className="nvc-index-page-estimate">
              {t('estimated_notice_index_pages', 'Estimated Notice + Index pages')}: {estimatedNoticePages || 1}
            </span>
          )}
        </div>
        {isEditMode && (
          <button type="button" className="nvc-index-add-btn" onClick={handleAddRow}>
            <FaPlus />
            {t('add_index_row', 'Add row')}
          </button>
        )}
      </div>

      <div className="nvc-index-table-wrap">
        <table className="nvc-index-table">
          <thead>
            <tr>
              <th className="nvc-index-th nvc-index-th--serial">{t('no', 'No.')}</th>
              <th className="nvc-index-th nvc-index-th--attachment">{t('attachment', 'Attachment')}</th>
              <th className="nvc-index-th nvc-index-th--ref">{t('ref_no', 'Ref. No.')}</th>
              <th className="nvc-index-th nvc-index-th--date">{t('date', 'Date')}</th>
              <th className="nvc-index-th nvc-index-th--pages">{t('attachment_pages', 'Attachment Pages')}</th>
              <th className="nvc-index-th nvc-index-th--purpose">{t('remark', 'Remark')}</th>
              {isEditMode && <th className="nvc-index-th nvc-index-th--action no-print" />}
            </tr>
          </thead>
          <tbody>
            {rowsToRender.map((row, index) => (
              <tr key={index}>
                <td className="nvc-index-td nvc-index-td--serial">
                  {isEditMode ? (
                    <input
                      className="nvc-input nvc-index-input nvc-index-input--serial"
                      value={row.serial_no ?? ''}
                      onChange={(e) => handleUpdateRow(index, 'serial_no', e.target.value)}
                      placeholder={String(index + 1)}
                    />
                  ) : (
                    renderCell(row.serial_no || String(index + 1))
                  )}
                </td>
                <td className="nvc-index-td nvc-index-td--attachment">
                  {isEditMode ? (
                    <input
                      className="nvc-input nvc-index-input"
                      value={row.attachment ?? ''}
                      onChange={(e) => handleUpdateRow(index, 'attachment', e.target.value)}
                      placeholder={t('attachment', 'Attachment')}
                    />
                  ) : (
                    renderCell(row.attachment)
                  )}
                </td>
                <td className="nvc-index-td nvc-index-td--ref">
                  {isEditMode ? (
                    <input
                      className="nvc-input nvc-index-input"
                      value={row.ref_no ?? ''}
                      onChange={(e) => handleUpdateRow(index, 'ref_no', e.target.value)}
                      placeholder={t('ref_no', 'Ref. No.')}
                    />
                  ) : (
                    renderCell(row.ref_no)
                  )}
                </td>
                <td className="nvc-index-td nvc-index-td--date">
                  {isEditMode ? (
                    <input
                      type="date"
                      className="nvc-input nvc-index-input"
                      value={row.date ?? ''}
                      onChange={(e) => handleUpdateRow(index, 'date', e.target.value)}
                    />
                  ) : (
                    renderCell(formatIndexDate(row.date))
                  )}
                </td>
                <td className="nvc-index-td nvc-index-td--pages">
                  {isEditMode ? (
                    <input
                      className="nvc-input nvc-index-input nvc-index-input--pages"
                      value={row.page_numbers ?? ''}
                      onChange={(e) => handleUpdateRow(index, 'page_numbers', e.target.value)}
                      placeholder="1-2"
                    />
                  ) : (
                    renderCell(row.page_numbers)
                  )}
                </td>
                <td className="nvc-index-td nvc-index-td--purpose">
                  {isEditMode ? (
                    <input
                      className="nvc-input nvc-index-input"
                      value={row.purpose ?? ''}
                      onChange={(e) => handleUpdateRow(index, 'purpose', e.target.value)}
                      placeholder={t('remark', 'Remark')}
                    />
                  ) : (
                    renderCell(row.purpose)
                  )}
                </td>
                {isEditMode && (
                  <td className="nvc-index-td nvc-index-td--action no-print">
                    <button
                      type="button"
                      className="nvc-index-remove"
                      onClick={() => handleRemoveRow(index)}
                      title={t('remove', 'Remove')}
                    >
                      <FaTrash />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {isEditMode && indexItems.length === 0 && (
              <tr>
                <td colSpan={7} className="nvc-index-empty">
                  <button type="button" className="nvc-index-empty-btn" onClick={handleAddRow}>
                    <FaPlus />
                    {t('add_index_row', 'Add row')}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isEditMode && (
        <div className="nvc-index-note-editor">
          <label className="nvc-index-note-field">
            <span>{t('index_discrepancy_note_en', 'Discrepancy note (English)')}</span>
            <textarea
              className="nvc-input nvc-index-note-textarea"
              value={formData.index_discrepancy_note ?? ''}
              onChange={(e) => handleUpdateNote('index_discrepancy_note', e.target.value)}
              rows={3}
            />
          </label>
          <label className="nvc-index-note-field">
            <span>{t('index_discrepancy_note_ar', 'Discrepancy note (Arabic)')}</span>
            <textarea
              className="nvc-input nvc-index-note-textarea nvc-index-note-textarea--ar"
              dir="rtl"
              value={formData.index_discrepancy_note_ar ?? ''}
              onChange={(e) => handleUpdateNote('index_discrepancy_note_ar', e.target.value)}
              rows={3}
            />
          </label>
        </div>
      )}
    </section>
  );
});

VariationIndexSection.displayName = 'VariationIndexSection';

export default VariationIndexSection;
