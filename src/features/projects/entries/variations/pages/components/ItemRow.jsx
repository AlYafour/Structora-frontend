/**
 * ItemRow Component — Fixed
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../../../../../utils/formatters';
import DirhamsIcon from '../../../../../../components/common/DirhamsIcon';
import { useAutoTranslate } from '../../../../../../hooks/useAutoTranslate';

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

    const { translating: translatingDescription } = useAutoTranslate(
      item.description,
      (ar) => onUpdate?.(item.id, 'description_ar', ar),
      { enabled: isEditMode && !item.description_ar }
    );

    const { translating: translatingRemark } = useAutoTranslate(
      item.remarks,
      (ar) => onUpdate?.(item.id, 'remarks_ar', ar),
      { enabled: isEditMode }
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

    const hasRemarks = !!(item.remarks && item.remarks.trim());
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
                    value={item.description ?? ''}
                    onChange={(e) =>
                      onUpdate?.(item.id, 'description', e.target.value)
                    }
                    autoComplete="off"
                  />

                  {(item.description_ar || translatingDescription) && (
                    <div className="nvi-desc-ar-preview" dir="rtl">
                      {translatingDescription && !item.description_ar
                        ? `${t('translating', 'Translating')}...`
                        : item.description_ar}
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
                  {item.description || '—'}
                </span>

                {item.description_ar && (
                  <span className="nvi-desc-text-ar" dir="rtl">
                    {item.description_ar}
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
            <input
              type="text"
              className="nvi-input nvi-input--unit"
              value={item.unit ?? ''}
              onChange={(e) =>
                onUpdate?.(item.id, 'unit', e.target.value)
              }
              disabled={!isEditMode}
              autoComplete="off"
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
                  <div className="nvc-remarks-split-card">
                    {/* English pane — original input */}
                    <div className="nvc-remarks-split-pane nvc-remarks-split-pane--en">
                      <div className="nvc-remarks-split-pane__header">
                        <span className="nvc-remarks-split-pane__lang">EN</span>
                        <span className="nvc-remarks-split-pane__label">{t('english', 'English')}</span>
                      </div>
                      <textarea
                        className="nvc-remarks-split-input"
                        value={item.remarks ?? ''}
                        onChange={(e) => onUpdate?.(item.id, 'remarks', e.target.value)}
                        placeholder={t('item_remarks_placeholder')}
                        autoComplete="off"
                      />
                    </div>

                    <div className="nvc-remarks-split-divider" />

                    {/* Arabic pane — auto-translated, read-only */}
                    <div className="nvc-remarks-split-pane nvc-remarks-split-pane--ar">
                      <div className="nvc-remarks-split-pane__header">
                        <span className="nvc-remarks-split-pane__lang">ع</span>
                        <span className="nvc-remarks-split-pane__label">
                          {translatingRemark ? (
                            <span className="nvc-remarks-split-pane__translating">
                              <span className="nvc-remarks-split-pane__dot" />
                              {t('translating', 'Translating')}...
                            </span>
                          ) : t('arabic', 'Arabic')}
                        </span>
                      </div>
                      <div className="nvc-remarks-split-ar-view" dir="rtl">
                        {item.remarks_ar
                          ? item.remarks_ar
                          : <span className="nvc-remarks-split-placeholder">{t('auto_translated_arabic', 'ترجمة تلقائية...')}</span>
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  item.remarks_ar ? (
                    <div className="nvc-remarks-split-view-grid">
                      <div className="nvc-remarks-split-view-col">
                        <div className="nvi-remarks-text">{item.remarks || <span className="nvi-remarks-empty">—</span>}</div>
                      </div>
                      <div className="nvc-remarks-split-view-divider" />
                      <div className="nvc-remarks-split-view-col nvc-remarks-split-view-col--ar" dir="rtl">
                        <div className="nvi-remarks-text">{item.remarks_ar}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="nvi-remarks-text">
                      {item.remarks || <span className="nvi-remarks-empty">—</span>}
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
