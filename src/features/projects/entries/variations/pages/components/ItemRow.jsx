/**
 * ItemRow Component — Fixed
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../../../../../utils/formatters';
import DirhamsIcon from '../../../../../../components/common/DirhamsIcon';
import { useMachineAutoTranslate } from '../../../../../../hooks/useMachineAutoTranslate';
import SinglePresetSelectField from '../../../../../../components/common/SinglePresetSelectField';
import { UNIT_OPTIONS } from '../../utils/unitOptions';

const ItemRow = memo(
  ({
    item,
    index,
    isOmitted,
    isEditMode,
    onUpdate,
    onRemove,
    itemsCount,
    t,
    isExpanded,
    onToggleExpand,
    colSpan,
  }) => {
    const { i18n } = useTranslation();
    const isArabicPrimary = /^ar\b/i.test(i18n.language || '');
    const primaryDescriptionField = isArabicPrimary ? 'description_ar' : 'description';
    const secondaryDescriptionField = isArabicPrimary ? 'description' : 'description_ar';
    const primaryRemarkField = isArabicPrimary ? 'remarks_ar' : 'remarks';
    const secondaryRemarkField = isArabicPrimary ? 'remarks' : 'remarks_ar';
    const descriptionNeedsBootstrap = !String(item[primaryDescriptionField] || '').trim()
      && !!String(item[secondaryDescriptionField] || '').trim();
    const remarkNeedsBootstrap = !String(item[primaryRemarkField] || '').trim()
      && !!String(item[secondaryRemarkField] || '').trim();
    const descriptionSourceField = descriptionNeedsBootstrap ? secondaryDescriptionField : primaryDescriptionField;
    const descriptionTargetField = descriptionNeedsBootstrap ? primaryDescriptionField : secondaryDescriptionField;
    const remarkSourceField = remarkNeedsBootstrap ? secondaryRemarkField : primaryRemarkField;
    const remarkTargetField = remarkNeedsBootstrap ? primaryRemarkField : secondaryRemarkField;

    const { translating: translatingDescription } = useMachineAutoTranslate(
      item[descriptionSourceField],
      (translated) => onUpdate?.(item.id, descriptionTargetField, translated),
      {
        enabled: isEditMode,
        source: (isArabicPrimary !== descriptionNeedsBootstrap) ? 'ar' : 'en',
        target: (isArabicPrimary !== descriptionNeedsBootstrap) ? 'en' : 'ar',
      }
    );

    const { translating: translatingRemark } = useMachineAutoTranslate(
      item[remarkSourceField],
      (translated) => onUpdate?.(item.id, remarkTargetField, translated),
      {
        enabled: isEditMode,
        source: (isArabicPrimary !== remarkNeedsBootstrap) ? 'ar' : 'en',
        target: (isArabicPrimary !== remarkNeedsBootstrap) ? 'en' : 'ar',
      }
    );

    const formatCurrency = (value) => {
      const str = formatMoney(value, { lang: i18n.language });

      if (i18n.language === 'en') {
        const numPart = str.replace(/AED\s?/, '').trim();

        return (
          <span className="nvt-money">
            {numPart}
            <DirhamsIcon size={10} color="#374151" />
          </span>
        );
      }

      return str;
    };

    const hasRemarks = !!((item.remarks && item.remarks.trim()) || (item.remarks_ar && item.remarks_ar.trim()));
    const amount =
      typeof item.amount === 'number'
        ? item.amount
        : parseFloat(item.amount) || 0;

    return (
      <>
        <tr className={`nvi-row ${isExpanded ? 'nvi-row--expanded' : ''}`}>
          {/* Description */}
          <td className="nvi-td nvi-td--desc">
            {isEditMode ? (
              <div className="nvi-desc-wrap">
                <div className="nvi-desc-editor">
                  <input
                    type="text"
                    className="nvi-input nvi-input--text"
                    value={item[primaryDescriptionField] ?? ''}
                    onChange={(e) => {
                      onUpdate?.(item.id, primaryDescriptionField, e.target.value);
                      onUpdate?.(item.id, secondaryDescriptionField, '');
                    }}
                    dir={isArabicPrimary ? 'rtl' : 'ltr'}
                    autoComplete="off"
                  />

                  {(item[secondaryDescriptionField] || translatingDescription) && (
                    <div className="nvi-desc-ar-preview" dir={isArabicPrimary ? 'ltr' : 'rtl'}>
                      {translatingDescription && !item[secondaryDescriptionField]
                        ? `${t('translating', 'Translating')}...`
                        : item[secondaryDescriptionField]}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={`nvi-remark-btn no-print ${
                    hasRemarks ? 'nvi-remark-btn--has' : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleExpand?.(item.id);
                  }}
                  title={
                    hasRemarks || isExpanded
                      ? t('toggle_remarks')
                      : t('add_remarks')
                  }
                >
                  ✎
                </button>
              </div>
            ) : (
              <div className="nvi-desc-view">
                <span className="nvi-row-index">{index + 1}</span>
                <span className="nvi-desc-text">
                  {item[primaryDescriptionField] || '—'}
                </span>

                {item[secondaryDescriptionField] && (
                  <span className="nvi-desc-text-ar" dir={isArabicPrimary ? 'ltr' : 'rtl'}>
                    {item[secondaryDescriptionField]}
                  </span>
                )}

                {hasRemarks && (
                  <button
                    type="button"
                    className="nvi-remark-badge"
                    onClick={() => onToggleExpand?.(item.id)}
                    title={item.remarks}
                  >
                    ✎
                  </button>
                )}
              </div>
            )}
          </td>

          {/* Quantity */}
          <td className="nvi-td nvi-td--num nvt-td--qty">
            <input
              type="number"
              step="0.01"
              className="nvi-input nvi-input--num"
              value={item.qty ?? ''}
              onChange={(e) =>
                onUpdate?.(item.id, 'qty', e.target.value)
              }
              disabled={!isEditMode}
              autoComplete="off"
            />
          </td>

          {/* Unit */}
          <td className="nvi-td nvi-td--unit nvt-td--unit">
            <SinglePresetSelectField
              value={item.unit ?? ''}
              onChange={(val) => onUpdate?.(item.id, 'unit', val)}
              options={UNIT_OPTIONS}
              disabled={!isEditMode}
              className="nvi-unit-select"
            />
          </td>

          {/* Rate */}
          <td className="nvi-td nvi-td--num nvt-td--rate">
            <input
              type="number"
              step="0.01"
              className="nvi-input nvi-input--num"
              value={item.rate ?? ''}
              onChange={(e) =>
                onUpdate?.(item.id, 'rate', e.target.value)
              }
              disabled={!isEditMode}
              autoComplete="off"
            />
          </td>

          {/* OHP flag */}
          {isOmitted && (
            <td className="nvi-td nvi-td--ohp">
              {isEditMode ? (
                <label className="nvi-ohp-label no-print">
                  <input
                    type="checkbox"
                    className="nvi-ohp-checkbox"
                    checked={!!item.includesOverheadProfit}
                    onChange={(e) =>
                      onUpdate?.(
                        item.id,
                        'includesOverheadProfit',
                        e.target.checked
                      )
                    }
                  />

                  <span className="nvi-ohp-text">{t('yes')}</span>
                </label>
              ) : (
                <span
                  className={`nvi-ohp-badge ${
                    item.includesOverheadProfit
                      ? 'nvi-ohp-badge--yes'
                      : 'nvi-ohp-badge--no'
                  }`}
                >
                  {item.includesOverheadProfit ? t('yes') : t('no')}
                </span>
              )}
            </td>
          )}

          {/* Amount */}
          <td className="nvi-td nvi-td--amount">
            <span
              className={`nvi-amount ${
                isOmitted ? 'nvi-amount--neg' : 'nvi-amount--pos'
              }`}
            >
              {formatCurrency(amount)}
            </span>
          </td>

          {/* Delete */}
          {isEditMode && (
            <td className="nvi-td nvi-td--action no-print">
              <button
                type="button"
                className="nvi-del-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove?.(item.id);
                }}
                title={t('remove_item')}
                disabled={itemsCount === 0}
              >
                ×
              </button>
            </td>
          )}
        </tr>

        {isExpanded && (
          <tr className="nvi-remarks-row">
            <td colSpan={colSpan} className="nvi-td nvi-td--remarks">
              <div className="nvi-remarks-wrap">
                {isEditMode ? (
                  <div className="nvc-remarks-split-card" dir={isArabicPrimary ? 'rtl' : 'ltr'}>
                    {/* English pane — original input */}
                    <div
                      className={`nvc-remarks-split-pane ${isArabicPrimary ? 'nvc-remarks-split-pane--ar' : 'nvc-remarks-split-pane--en'}`}
                      dir={isArabicPrimary ? 'rtl' : 'ltr'}
                    >
                      <div className="nvc-remarks-split-pane__header">
                        <span className="nvc-remarks-split-pane__lang">{isArabicPrimary ? 'ع' : 'EN'}</span>
                        <span className="nvc-remarks-split-pane__label">
                          {isArabicPrimary ? t('arabic', 'Arabic') : t('english', 'English')}
                        </span>
                      </div>
                      <textarea
                        className="nvc-remarks-split-input"
                        value={item[primaryRemarkField] ?? ''}
                        onChange={(e) => {
                          onUpdate?.(item.id, primaryRemarkField, e.target.value);
                          onUpdate?.(item.id, secondaryRemarkField, '');
                        }}
                        placeholder={t('item_remarks_placeholder')}
                        dir={isArabicPrimary ? 'rtl' : 'ltr'}
                        autoComplete="off"
                      />
                    </div>

                    <div className="nvc-remarks-split-divider" />

                    {/* Arabic pane — auto-translated, read-only */}
                    <div
                      className={`nvc-remarks-split-pane ${isArabicPrimary ? 'nvc-remarks-split-pane--en' : 'nvc-remarks-split-pane--ar'}`}
                      dir={isArabicPrimary ? 'ltr' : 'rtl'}
                    >
                      <div className="nvc-remarks-split-pane__header">
                        <span className="nvc-remarks-split-pane__lang">{isArabicPrimary ? 'EN' : 'ع'}</span>
                        <span className="nvc-remarks-split-pane__label">
                          {translatingRemark ? (
                            <span className="nvc-remarks-split-pane__translating">
                              <span className="nvc-remarks-split-pane__dot" />
                              {t('translating', 'Translating')}...
                            </span>
                          ) : (isArabicPrimary ? t('english', 'English') : t('arabic', 'Arabic'))}
                        </span>
                      </div>
                      <textarea
                        className="nvc-remarks-split-input"
                        value={item[secondaryRemarkField] ?? ''}
                        onChange={(e) => onUpdate?.(item.id, secondaryRemarkField, e.target.value)}
                        placeholder={isArabicPrimary
                          ? t('auto_translated_english', 'Auto-translated English')
                          : t('auto_translated_arabic', 'Auto-translated Arabic')}
                        dir={isArabicPrimary ? 'ltr' : 'rtl'}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                ) : (
                  (item.remarks && item.remarks_ar) ? (
                    <div className="nvc-remarks-split-view-grid" dir={isArabicPrimary ? 'rtl' : 'ltr'}>
                      <div className={`nvc-remarks-split-view-col ${isArabicPrimary ? 'nvc-remarks-split-view-col--ar' : ''}`} dir={isArabicPrimary ? 'rtl' : 'ltr'}>
                        <div className="nvi-remarks-text">{item[primaryRemarkField] || <span className="nvi-remarks-empty">—</span>}</div>
                      </div>
                      <div className="nvc-remarks-split-view-divider" />
                      <div className={`nvc-remarks-split-view-col ${isArabicPrimary ? '' : 'nvc-remarks-split-view-col--ar'}`} dir={isArabicPrimary ? 'ltr' : 'rtl'}>
                        <div className="nvi-remarks-text">{item[secondaryRemarkField]}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="nvi-remarks-text">
                      {item[primaryRemarkField] || item[secondaryRemarkField] || <span className="nvi-remarks-empty">—</span>}
                    </div>
                  )
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  },
  (p, n) =>
    p.item.id === n.item.id &&
    p.item.description === n.item.description &&
    p.item.description_ar === n.item.description_ar &&
    p.item.qty === n.item.qty &&
    p.item.unit === n.item.unit &&
    p.item.rate === n.item.rate &&
    p.item.amount === n.item.amount &&
    p.item.remarks === n.item.remarks &&
    p.item.remarks_ar === n.item.remarks_ar &&
    p.item.includesOverheadProfit === n.item.includesOverheadProfit &&
    p.isEditMode === n.isEditMode &&
    p.itemsCount === n.itemsCount &&
    p.isExpanded === n.isExpanded
);

ItemRow.displayName = 'ItemRow';

export default ItemRow;
