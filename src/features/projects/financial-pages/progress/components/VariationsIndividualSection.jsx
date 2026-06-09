import { useCallback, useMemo } from 'react';
import { FaCheckDouble } from 'react-icons/fa';
import Button from '../../../../../components/common/Button';
import Checkbox from '../../../../../components/forms/Checkbox';
import useTableActivity from '../../../../../hooks/useTableActivity';
import { sanitizePercentageInput } from '../utils/progressFormHelpers';
import { parseVariationProgress } from '../utils/progressCalculations';

function getVariationNumber(variation) {
  return variation.variation_number || variation.modification_number || `VAR-${variation.id}`;
}

function getVariationDescription(variation) {
  let variationDescription = variation.description || '';

  try {
    const parsed = JSON.parse(variationDescription);
    variationDescription = parsed.variation_description || parsed.description || variationDescription;
  } catch (_e) {
    // Plain text descriptions are valid.
  }

  return variationDescription;
}

function getVariationAmount(variation) {
  return Number(
    variation.final_amount ||
      variation.total_amount ||
      variation.amount ||
      variation.net_amount ||
      0
  );
}

function formatAmount(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '-';

  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function VariationsIndividualSection({
  variations,
  formData,
  latestProgress,
  setFormData,
  setError,
  error,
  isRTL,
  t,
  canApplySelectedTo100 = false,
  onApplySelectedTo100,
}) {
  const latestProgressForVariation = useMemo(
    () => parseVariationProgress(latestProgress?.variation_progress),
    [latestProgress]
  );

  const getId = useCallback((variation) => String(variation.id), []);
  const getSearchText = useCallback(
    (variation) => `${getVariationNumber(variation)} ${getVariationDescription(variation)}`,
    []
  );

  const sortAccessors = useMemo(
    () => ({
      number: getVariationNumber,
      description: getVariationDescription,
      amount: getVariationAmount,
      previous_actual: (variation) =>
        Number(latestProgressForVariation[String(variation.id)]?.actual_current || 0),
      actual_current: (variation) =>
        Number(formData.variation_progress[String(variation.id)]?.actual_current || 0),
      previous_technical: (variation) =>
        Number(latestProgressForVariation[String(variation.id)]?.technical_current || 0),
      technical_current: (variation) =>
        Number(formData.variation_progress[String(variation.id)]?.technical_current || 0),
    }),
    [formData.variation_progress, latestProgressForVariation]
  );

  const {
    searchQuery,
    setSearchQuery,
    clearSearch,
    visibleItems,
    sortBy,
    handleSort,
    getSortIcon,
    selectedIds,
    selectedVisibleIds,
    toggleSelect,
    toggleSelectAllVisible,
    clearSelection,
    isAllVisibleSelected,
  } = useTableActivity({
    items: variations || [],
    getId,
    getSearchText,
    sortAccessors,
    defaultSortBy: 'number',
  });

  if (!variations || variations.length === 0) {
    return null;
  }

  const updateVariationProgress = (variationId, field, rawValue) => {
    let value = sanitizePercentageInput(rawValue);

    if (value !== '' && value !== '.') {
      const numValue = parseFloat(value);
      if (Number.isNaN(numValue)) return;
      if (numValue > 100) value = '100';
    }

    if (error) setError(null);

    setFormData((prev) => ({
      ...prev,
      variation_progress: {
        ...prev.variation_progress,
        [variationId]: {
          ...prev.variation_progress[variationId],
          [field]: value,
        },
      },
    }));
  };

  const validateActualCurrent = (value) => {
    const normalized = value.replace('%', '').trim();
    if (normalized === '') {
      if (error) setError(null);
      return;
    }

    const numValue = parseFloat(normalized);
    if (Number.isNaN(numValue)) {
      setError(t('progress_validation_invalid_number'));
      return;
    }

    if (numValue > 100) {
      setError(t('progress_validation_exceeds_100'));
      return;
    }

    if (error) setError(null);
  };

  const validateTechnicalCurrent = (value, latestValue) => {
    const normalized = value.replace('%', '').trim();
    if (normalized === '') {
      if (error) setError(null);
      return;
    }

    const numValue = parseFloat(normalized);
    if (Number.isNaN(numValue)) {
      setError(t('progress_validation_invalid_number'));
      return;
    }

    const previousValue = latestValue ? parseFloat(latestValue) : 0;
    if (numValue < previousValue) {
      setError(t('progress_validation_below_previous', { current: numValue, previous: previousValue }));
      return;
    }

    if (numValue > 100) {
      setError(t('progress_validation_exceeds_100'));
      return;
    }

    if (error) setError(null);
  };

  const handleApplySelectedTo100 = () => {
    onApplySelectedTo100?.(selectedVisibleIds);
    clearSelection();
  };

  const renderSortableHeader = (column, label, className = '') => (
    <th
      className={`${className} ds-table__sortable ${sortBy === column ? 'active' : ''}`}
      onClick={() => handleSort(column)}
      title={`${label} - ${t('click_to_sort')}`}
    >
      {label}
      <span className="ds-table__sort-icon">{getSortIcon(column)}</span>
    </th>
  );

  return (
    <div className="progress-variations-table-section" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="progress-variations-table-toolbar">
        <div className="prj-toolbar__search progress-variations-table-search">
          <div className="prj-toolbar__search-box">
            <svg className="prj-toolbar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="prj-toolbar__search-input"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('progress_variation_search_placeholder') || t('general_search')}
            />
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={clearSearch} aria-label={t('clear')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        <div className="progress-variations-table-actions">
          <span className="progress-variations-table-count">
            {selectedVisibleIds.length > 0
              ? `${selectedVisibleIds.length} ${t('selected')}`
              : t('matching_total', { count: visibleItems.length, total: variations.length })}
          </span>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              {t('clear_selection')}
            </Button>
          )}
          {canApplySelectedTo100 && (
            <Button
              variant="ghost"
              size="sm"
              className="progress-panel__header-action"
              startIcon={<FaCheckDouble />}
              onClick={handleApplySelectedTo100}
              disabled={selectedVisibleIds.length === 0}
            >
              {t('progress_set_all_variations_100')}
            </Button>
          )}
        </div>
      </div>

      <div className="ds-table__wrap progress-variations-table-wrap">
        <table className="ds-table progress-variations-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <Checkbox
                  checked={isAllVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label={t('select_all')}
                  disabled={visibleItems.length === 0}
                />
              </th>
              <th className="col-number">#</th>
              {renderSortableHeader('number', t('invoice_item_variation_column'), 'col-code')}
              {renderSortableHeader('description', t('description'), 'col-name')}
              {renderSortableHeader('amount', t('amount'), 'col-amount')}
              {renderSortableHeader('previous_actual', t('progress_previous_actual'), 'col-pct')}
              {renderSortableHeader('actual_current', t('progress_actual_current'), 'col-pct')}
              {renderSortableHeader('previous_technical', t('progress_previous_technical'), 'col-pct')}
              {renderSortableHeader('technical_current', t('progress_buckets_technical_current'), 'col-pct')}
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="ds-table__empty">
                  {t('no_projects_match') || t('no_data_found')}
                </td>
              </tr>
            ) : (
              visibleItems.map((variation, index) => {
                const variationId = String(variation.id);
                const variationProgress = formData.variation_progress[variationId] || {};
                const technicalCurrent = variationProgress.technical_current || '';
                const actualCurrent = variationProgress.actual_current || '';
                const latestValue = latestProgressForVariation[variationId]?.technical_current;
                const latestActualValue = latestProgressForVariation[variationId]?.actual_current;
                const isSelected = selectedIds.has(variationId);

                return (
                  <tr key={variation.id} className={isSelected ? 'is-selected' : ''}>
                    <td className="col-checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(checked) => toggleSelect(variationId, checked)}
                        aria-label={`${t('select')} ${getVariationNumber(variation)}`}
                      />
                    </td>
                    <td className="col-number">{index + 1}</td>
                    <td className="col-code">
                      <span className="ds-table__code">{getVariationNumber(variation)}</span>
                    </td>
                    <td className="col-name">
                      <div className="ds-table__cell-stack">
                        <span
                          className="ds-table__cell-primary"
                          title={getVariationDescription(variation) || undefined}
                        >
                          {getVariationDescription(variation) || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="col-amount ds-text-end">
                      {formatAmount(getVariationAmount(variation))}
                    </td>
                    <td className="col-pct ds-text-center">
                      {latestActualValue ? `${latestActualValue}%` : '-'}
                    </td>
                    <td className="col-pct">
                      <div className="progress-field__input-wrap progress-variations-table__input-wrap">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`prj-input ${error && actualCurrent ? 'prj-input--error' : ''}`}
                          value={actualCurrent}
                          onChange={(event) =>
                            updateVariationProgress(variationId, 'actual_current', event.target.value)
                          }
                          onBlur={(event) => validateActualCurrent(event.target.value)}
                          max="100"
                          step="0.01"
                          placeholder={t('progress_current_placeholder')}
                        />
                        <span className="progress-field__suffix">%</span>
                      </div>
                    </td>
                    <td className="col-pct ds-text-center">
                      {latestValue ? `${latestValue}%` : '-'}
                    </td>
                    <td className="col-pct">
                      <div className="progress-field__input-wrap progress-variations-table__input-wrap">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`prj-input ${error && technicalCurrent ? 'prj-input--error' : ''}`}
                          value={technicalCurrent}
                          onChange={(event) =>
                            updateVariationProgress(variationId, 'technical_current', event.target.value)
                          }
                          onBlur={(event) => validateTechnicalCurrent(event.target.value, latestValue)}
                          min={latestValue || 0}
                          max="100"
                          step="0.01"
                          placeholder={latestValue
                            ? t('progress_enter_percentage_min', { value: latestValue })
                            : t('progress_enter_percentage')}
                        />
                        <span className="progress-field__suffix">%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9} className="ds-table__foot">
                {t('matching_total', { count: visibleItems.length, total: variations.length })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
