/**
 * PaymentClaimItemRow Component
 * Professional row with smooth drag & drop
 */
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../../../../contexts/NotificationContext';
import { FaGripVertical, FaTrash } from 'react-icons/fa';
import { formatMoney, formatPercent } from '../../../../../utils/formatters';
import Button from '../../../../../components/common/Button';
import { isZeroValue } from '../../../../../utils/helpers/parsing';
import UnifiedSelect from '../../../../../components/common/Select';
import './PaymentClaimComponents.css';

// Allowed unit values
const ALLOWED_UNITS = ['LM', 'M3', 'M2', 'LN', 'NOS'];

const PaymentClaimItemRow = memo(function PaymentClaimItemRow({
  item,
  sectionId,
  isSelected,
  isDragging,
  onFieldChange,
  onDelete,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  readOnly = false,
}) {
  const { t } = useTranslation();
  const { error: showError } = useNotifications();
  const itemId = item.boq_item_id || item.id;
  const [isDropTarget, setIsDropTarget] = useState(false);

  // Memoized handlers
  // Note: Description is read-only from BOQItem
  // Unit, Qty and Rate are editable only in first payment claim
  // Only total_percent is editable

  const handleUnitChange = useCallback((value) => {
    onFieldChange(itemId, 'unit', value);
  }, [itemId, onFieldChange]);

  const handleQtyChange = useCallback((e) => {
    const value = e.target.value;
    onFieldChange(itemId, 'qty', isZeroValue(value) ? '' : value);
  }, [itemId, onFieldChange]);

  const handleRateChange = useCallback((e) => {
    const value = e.target.value;
    onFieldChange(itemId, 'rate', isZeroValue(value) ? '' : value);
  }, [itemId, onFieldChange]);

  const handleTotalPercentChange = useCallback((e) => {
    const inputValue = e.target.value;
    
    // Allow empty input (user is clearing the field)
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      onFieldChange(itemId, 'total_percent', '');
      return;
    }
    
    // Only allow integers (no decimals) - remove any decimal point and digits after it
    const integerValue = inputValue.replace(/\.\d*$/, '');
    
    // Update the field value to show only integer
    if (integerValue !== inputValue) {
      e.target.value = integerValue;
    }
    
    // Allow any input during typing - validation will happen on blur
    onFieldChange(itemId, 'total_percent', integerValue);
  }, [itemId, onFieldChange]);
  
  const handleTotalPercentBlur = useCallback((e) => {
    const inputValue = e.target.value;
    
    // If empty, treat as 0 but don't set it in the field
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      onFieldChange(itemId, 'total_percent', '');
      return;
    }
    
    // Parse as integer (no decimals)
    const value = parseInt(inputValue, 10);
    const previousPercent = parseInt(item.previous_percent || 0, 10);
    
    // Check if value is NaN or invalid
    if (isNaN(value)) {
      // Reset to empty or previous_percent
      const defaultValue = previousPercent > 0 ? previousPercent : '';
      e.target.value = defaultValue;
      onFieldChange(itemId, 'total_percent', defaultValue);
      return;
    }
    
    // Validate: cannot exceed 100%
    if (value > 100) {
      e.target.value = 100;
      onFieldChange(itemId, 'total_percent', 100);
      showError(t('cannot_exceed_100_percent') || 'لا يمكن أن تتجاوز نسبة الإنجاز 100%');
      return;
    }
    
    // Validate: cannot be less than previous_percent
    if (value < previousPercent) {
      e.target.value = previousPercent;
      onFieldChange(itemId, 'total_percent', previousPercent);
      // Show error message
      setTimeout(() => {
        showError(t('cannot_be_less_than_previous') || `لا يمكن أن تكون النسبة أقل من ${previousPercent}%`);
      }, 0);
      return;
    }
    
    // Value is valid, ensure it's saved as integer
    e.target.value = value;
    onFieldChange(itemId, 'total_percent', value);
  }, [itemId, item.previous_percent, onFieldChange, t]);

  const handleSelectToggle = useCallback((e) => {
    e.stopPropagation();
    onSelect(sectionId, itemId);
  }, [sectionId, itemId, onSelect]);

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    onDelete(sectionId, itemId);
  }, [sectionId, itemId, onDelete]);

  // Drag handlers
  const handleDragStartLocal = useCallback((e) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `item-${itemId}`);

    // Add dragging class after a small delay for smooth animation
    setTimeout(() => {
      if (e.target) {
        e.target.classList.add('is-dragging');
      }
    }, 0);

    onDragStart(e, sectionId, itemId);
  }, [sectionId, itemId, onDragStart]);

  const handleDragOverLocal = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
    onDragOver(e);
  }, [onDragOver]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDropTarget(false);
  }, []);

  const handleDropLocal = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);
    onDrop(e, sectionId, itemId);
  }, [sectionId, itemId, onDrop]);

  const handleDragEndLocal = useCallback((e) => {
    if (e.target) {
      e.target.classList.remove('is-dragging');
    }
    setIsDropTarget(false);
    onDragEnd(e);
  }, [onDragEnd]);

  return (
    <tr
      className={`payment-item-row ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      draggable={!readOnly}
      onDragStart={readOnly ? undefined : handleDragStartLocal}
      onDragEnd={readOnly ? undefined : handleDragEndLocal}
      onDragOver={readOnly ? undefined : handleDragOverLocal}
      onDragLeave={readOnly ? undefined : handleDragLeave}
      onDrop={readOnly ? undefined : handleDropLocal}
    >
      {/* Checkbox - First Column on LEFT */}
      {!readOnly && (
      <td className="cell-checkbox">
        <label className="checkbox-wrapper">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectToggle}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="checkmark"></span>
        </label>
      </td>
      )}

      {/* Drag Handle - Second Column on LEFT */}
      {!readOnly && (
      <td className="cell-drag">
        <span className="drag-handle" title={t('drag_to_reorder') || 'اسحب للترتيب'}>
          <FaGripVertical />
        </span>
      </td>
      )}

      {/* Description - First column after drag handle (read-only from BOQItem) */}
      <td className="cell-description">
        {readOnly ? (
          <span className="read-only-value">{item.description || '-'}</span>
        ) : (
        <input
          type="text"
          value={item.description || ''}
            readOnly={true}
            className="input-field read-only-field"
          placeholder={t('description') || 'الوصف'}
            title={t('read_only_from_boq') || 'قراءة فقط من BOQ'}
          />
        )}
        {item.item_code && item.item_code !== '-' && (
          <div className="item-code-badge-small payment-item-row__item-code">
            {item.item_code}
          </div>
        )}
      </td>

      {/* Unit - Dropdown, editable only in first payment claim */}
      <td className="cell-unit">
        {item.is_first_claim && !readOnly ? (
          <UnifiedSelect
            options={ALLOWED_UNITS.map(unit => ({ value: unit, label: unit }))}
          value={item.unit || ''}
          onChange={handleUnitChange}
            placeholder={t('select_unit') || 'اختر الوحدة'}
            isDisabled={false}
            isClearable={false}
            isSearchable={false}
            className="unit-select payment-item-row__unit-select"
          />
        ) : (
          <span className="read-only-value">{item.unit || '-'}</span>
        )}
      </td>

      {/* Qty - Editable only in first payment claim, then read-only */}
      <td className="cell-number">
        {item.is_first_claim && !readOnly ? (
        <input
          type="number"
          step="any"
          min="0"
          value={isZeroValue(item.qty) ? '' : item.qty}
          onChange={handleQtyChange}
          className="input-field input-number"
            placeholder="0"
        />
        ) : (
          <span className="read-only-value">
            {isZeroValue(item.qty) ? '-' : item.qty}
          </span>
        )}
      </td>

      {/* Rate - Editable only in first payment claim, then read-only */}
      <td className="cell-number">
        {item.is_first_claim && !readOnly ? (
        <input
          type="number"
          step="any"
          min="0"
          value={isZeroValue(item.rate) ? '' : item.rate}
          onChange={handleRateChange}
          className="input-field input-number"
            placeholder="0"
        />
        ) : (
          <span className="read-only-value">
            {isZeroValue(item.rate) ? '-' : item.rate}
          </span>
        )}
      </td>

      {/* Amount (calculated, read-only from BOQItem) */}
      <td className="cell-amount">
        <span className="read-only-value">{formatMoney(item.amount || 0)}</span>
      </td>

      {/* % Previous (read-only) */}
      <td className="cell-percent">
        <span className="read-only-value">
          {formatPercent(item.previous_percent || 0)}
        </span>
      </td>

      {/* % Current (read-only, calculated) - Show empty if 0 */}
      <td className="cell-percent">
        <span className="read-only-value">
          {(() => {
            const currentPercent = parseFloat(item.current_percent || 0);
            if (currentPercent === 0) {
              return '—';  // Show dash instead of 0.00%
            }
            return formatPercent(item.current_percent || 0);
          })()}
        </span>
      </td>

      {/* % Total (editable - user input) */}
      {!readOnly ? (
      <td className="cell-percent">
        <input
          type="number"
          step="1"
          min={item.previous_percent || 0}
          max="100"
            value={isZeroValue(item.total_percent) ? '' : parseInt(item.total_percent, 10)}
          onChange={handleTotalPercentChange}
          onBlur={handleTotalPercentBlur}
          className="input-field input-percent payment-item-row__total-percent-input"
          title={t('total_percent') || 'النسبة الكلية'}
            placeholder={!isZeroValue(item.previous_percent) ? String(parseInt(item.previous_percent, 10)) : '0'}
        />
      </td>
      ) : (
        <td className="cell-percent">
          <span className="read-only-value">
            {formatPercent(item.total_percent || 0)}
          </span>
        </td>
      )}

      {/* Previous Amount (read-only) */}
      <td className="cell-amount">
        <span className="read-only-value">
          {formatMoney(item.previous_amount || 0)}
        </span>
      </td>

      {/* Current Amount (read-only, calculated) */}
      <td className="cell-amount">
        <span className="read-only-value">
          {formatMoney(item.current_amount || 0)}
        </span>
      </td>

      {/* Total Amount (read-only, calculated) */}
      <td className="cell-amount">
        <span className="read-only-value">
          {formatMoney(item.total_amount || 0)}
        </span>
      </td>

      {/* Actions - Delete */}
      {!readOnly && (
      <td className="cell-action">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleDeleteClick}
          title={t('delete_item') || 'حذف'}
        >
          <FaTrash />
        </Button>
      </td>
      )}
    </tr>
  );
}, (prevProps, nextProps) => {
  const prevItem = prevProps.item;
  const nextItem = nextProps.item;

  return (
    (prevItem.boq_item_id || prevItem.id) === (nextItem.boq_item_id || nextItem.id) &&
    prevItem.description === nextItem.description &&
    prevItem.unit === nextItem.unit &&
    prevItem.qty === nextItem.qty &&
    prevItem.rate === nextItem.rate &&
    prevItem.amount === nextItem.amount &&
    prevItem.previous_percent === nextItem.previous_percent &&
    prevItem.current_percent === nextItem.current_percent &&
    prevItem.total_percent === nextItem.total_percent &&
    prevItem.previous_amount === nextItem.previous_amount &&
    prevItem.current_amount === nextItem.current_amount &&
    prevItem.total_amount === nextItem.total_amount &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDragging === nextProps.isDragging
  );
});

export default PaymentClaimItemRow;
