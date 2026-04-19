/**
 * PaymentClaimSection Component
 * Professional collapsible section with smooth animations
 */
import { memo, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaChevronRight, FaGripLines, FaPlus, FaSync } from 'react-icons/fa';
import PaymentClaimItemRow from './PaymentClaimItemRow';
import { formatMoney } from '../../../../../utils/formatters';
import Button from '../../../../../components/common/Button';
import './PaymentClaimComponents.css';

const PaymentClaimSection = memo(function PaymentClaimSection({
  section,
  isExpanded,
  selectedItems,
  draggedItemId,
  onToggleExpand,
  onFieldChange,
  onDelete,
  onSelect,
  onSelectAll,
  onAddItem,
  onSectionNameChange,
  onReloadSection,
  dragHandlers,
  readOnly = false,
}) {
  const { t } = useTranslation();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');

  const sectionItems = section.items || [];

  // Calculate section totals
  const sectionTotals = useMemo(() => {
    return sectionItems.reduce((acc, item) => ({
      amount: acc.amount + (parseFloat(item.amount) || 0),
      previous_amount: acc.previous_amount + (parseFloat(item.previous_amount) || 0),
      current_amount: acc.current_amount + (parseFloat(item.current_amount) || 0),
      total_amount: acc.total_amount + (parseFloat(item.total_amount) || 0),
    }), { amount: 0, previous_amount: 0, current_amount: 0, total_amount: 0 });
  }, [sectionItems]);

  // Check if all items in section are selected
  const allSelected = useMemo(() => {
    if (sectionItems.length === 0) return false;
    return sectionItems.every(item =>
      selectedItems.has(`${section.id}-${item.boq_item_id || item.id}`)
    );
  }, [sectionItems, selectedItems, section.id]);

  // Handlers
  const handleToggle = useCallback(() => {
    onToggleExpand(section.id);
  }, [section.id, onToggleExpand]);

  const handleSelectAllToggle = useCallback(() => {
    onSelectAll(section.id, sectionItems);
  }, [section.id, sectionItems, onSelectAll]);

  const handleAddItemAtEnd = useCallback(() => {
    onAddItem(section.id);
  }, [section.id, onAddItem]);

  const handleReloadSection = useCallback(async (e) => {
    e.stopPropagation();
    if (onReloadSection) {
      await onReloadSection(section.id);
    }
  }, [section.id, onReloadSection]);

  const handleStartEditName = useCallback((e) => {
    e.stopPropagation();
    setIsEditingName(true);
    setEditingName(section.section_name || '');
  }, [section.section_name]);

  const handleNameChange = useCallback((e) => {
    setEditingName(e.target.value);
  }, []);

  const handleNameBlur = useCallback(() => {
    setIsEditingName(false);
    if (editingName.trim() && editingName !== section.section_name) {
      onSectionNameChange(section.id, editingName.trim());
    }
  }, [editingName, section.id, section.section_name, onSectionNameChange]);

  const handleNameKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingName(false);
      setEditingName('');
    }
  }, [handleNameBlur]);

  return (
    <div className={`payment-section ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Section Header */}
      <div className="payment-section-header" role="button" tabIndex={0} aria-expanded={isExpanded} onClick={handleToggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}>
        <div className="section-header-left">
          <span className="section-toggle-icon">
            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
          </span>

          <span className="section-number">{section.bill_no || '#'}</span>

          {isEditingName ? (
            <input
              type="text"
              value={editingName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="section-name-input"
              autoFocus
            />
          ) : (
            <h3
              className="section-name"
              onDoubleClick={handleStartEditName}
              title={t('double_click_to_edit') || 'انقر مرتين للتعديل'}
            >
              {section.section_name || t('new_section')}
            </h3>
          )}

          <span className="section-badge">
            {sectionItems.length} {t('items') || 'بند'}
          </span>
        </div>

        <div className="section-header-right">
          <span
            className="section-drag-handle"
            onClick={(e) => e.stopPropagation()}
            title={t('drag_to_reorder') || 'اسحب للترتيب'}
          >
            <FaGripLines />
          </span>
          {onReloadSection && (
            <Button
              variant="ghost"
              size="sm"
              className="section-reload-button"
              onClick={handleReloadSection}
              title={t('reload_all_items') || 'إرجاع جميع العناصر من Excel'}
            >
              <FaSync />
            </Button>
          )}
          <div className="section-summary">
            <span className="summary-label">{t('total') || 'الإجمالي'}:</span>
            <span className="summary-value">{formatMoney(sectionTotals.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Section Body */}
      {isExpanded && (
        <div className="payment-section-body">
          {/* Table */}
          <div className="table-container">
            <table className="professional-table">
              <thead>
                <tr>
                  {!readOnly && <th className="th-checkbox">
                    <label className="checkbox-wrapper header-checkbox">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAllToggle}
                        title={t('select_all') || 'تحديد الكل'}
                      />
                      <span className="checkmark"></span>
                    </label>
                  </th>}
                  {!readOnly && <th className="th-drag"></th>}
                  <th className="th-description">{t('description') || 'الوصف'}</th>
                  <th className="th-unit">{t('unit') || 'الوحدة'}</th>
                  <th className="th-number">{t('qty') || 'الكمية'}</th>
                  <th className="th-number">{t('rate') || 'السعر'} (AED)</th>
                  <th className="th-amount">{t('amount') || 'المبلغ'} (AED)</th>
                  <th className="th-percent">% {t('previous') || 'سابق'}</th>
                  <th className="th-percent">% {t('current') || 'حالي'}</th>
                  {!readOnly ? (
                    <th className="th-percent ds-min-w-80">
                      % {t('total') || 'الإجمالي'}
                    </th>
                  ) : (
                  <th className="th-percent">% {t('total') || 'الإجمالي'}</th>
                  )}
                  <th className="th-amount">{t('previous_amount') || 'مبلغ سابق'} (AED)</th>
                  <th className="th-amount">{t('current_amount') || 'مبلغ حالي'} (AED)</th>
                  <th className="th-amount">{t('total_amount') || 'مبلغ إجمالي'} (AED)</th>
                  {!readOnly && <th className="th-action">{t('actions') || 'إجراءات'}</th>}
                </tr>
              </thead>
              <tbody>
                {sectionItems.map((item, index) => {
                  const itemId = item.boq_item_id || item.id;
                  const isSelected = selectedItems.has(`${section.id}-${itemId}`);
                  const isDragging = draggedItemId === itemId;

                  return (
                    <PaymentClaimItemRow
                      key={`${section.id}-${itemId}-${index}`}
                      item={item}
                      sectionId={section.id}
                      isSelected={isSelected}
                      isDragging={isDragging}
                      onFieldChange={onFieldChange}
                      onDelete={onDelete}
                      onSelect={onSelect}
                      onDragStart={dragHandlers?.handleItemDragStart}
                      onDragOver={dragHandlers?.handleItemDragOver}
                      onDrop={dragHandlers?.handleItemDrop}
                      onDragEnd={dragHandlers?.handleItemDragEnd}
                      readOnly={readOnly}
                    />
                  );
                })}
              </tbody>
              {/* Section Totals Footer */}
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={readOnly ? 2 : 4} className="totals-label">
                    {t('section_total') || 'إجمالي القسم'}
                  </td>
                  <td className="totals-value">{formatMoney(sectionTotals.amount)}</td>
                  {/* % Previous */}
                  <td className="totals-value">—</td>
                  {/* % Current */}
                  <td className="totals-value">—</td>
                  {/* % Total */}
                  <td className="totals-value">—</td>
                  {/* Previous Amount */}
                  <td className="totals-value">{formatMoney(sectionTotals.previous_amount)}</td>
                  {/* Current Amount */}
                  <td className="totals-value">{formatMoney(sectionTotals.current_amount)}</td>
                  {/* Total Amount */}
                  <td className="totals-value">{formatMoney(sectionTotals.total_amount)}</td>
                  {!readOnly && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add Item Button */}
          {!readOnly && (
          <div className="section-footer">
            <Button
              type="button"
              variant="secondary"
              size="medium"
              onClick={handleAddItemAtEnd}
              className="btn-add-item"
            >
              <FaPlus />
              <span>{t('add_item') || 'إضافة بند جديد'}</span>
            </Button>
          </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.section === nextProps.section &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.selectedItems === nextProps.selectedItems &&
    prevProps.draggedItemId === nextProps.draggedItemId
  );
});

export default PaymentClaimSection;
