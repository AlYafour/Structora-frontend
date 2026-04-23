/**
 * ItemRow Component — Redesigned
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../../../../../utils/formatters';
import Button from '../../../../../../components/common/Button';
import DirhamsIcon from '../../../../../../components/common/DirhamsIcon';

const ItemRow = memo(
  ({ item, index, isOmitted, isEditMode, onUpdate, onRemove, itemsCount, t, isExpanded, onToggleExpand, colSpan }) => {
    const { i18n } = useTranslation();
    const formatCurrency = (value) => {
      const str = formatMoney(value, { lang: i18n.language });
      if (i18n.language === 'en') {
        const numPart = str.replace(/AED\s?/, '').trim();
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{numPart} <DirhamsIcon size={10} color="#374151" /></span>;
      }
      return str;
    };

    const hasRemarks = !!(item.remarks && item.remarks.trim());
    const amount = typeof item.amount === 'number' ? item.amount : (parseFloat(item.amount) || 0);

    return (
      <>
        <tr className={`nvi-row ${isExpanded ? 'nvi-row--expanded' : ''}`}>

          {/* Description */}
          <td className="nvi-td nvi-td--desc">
            {isEditMode ? (
              <div className="nvi-desc-wrap">
                <input
                  type="text"
                  className="nvi-input nvi-input--text"
                  value={item.description ?? ''}
                  onChange={(e) => onUpdate && onUpdate(item.id, 'description', e.target.value)}
                  placeholder={t('item_description')}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className={`nvi-remark-btn no-print ${hasRemarks ? 'nvi-remark-btn--has' : ''}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleExpand && onToggleExpand(item.id); }}
                  title={hasRemarks || isExpanded ? t('toggle_remarks') : t('add_remarks')}
                >
                  ✎
                </button>
              </div>
            ) : (
              <div className="nvi-desc-view">
                <span className="nvi-row-index">{index + 1}</span>
                <span className="nvi-desc-text">{item.description || '—'}</span>
                {hasRemarks && (
                  <button
                    type="button"
                    className="nvi-remark-badge"
                    onClick={() => onToggleExpand && onToggleExpand(item.id)}
                    title={item.remarks}
                  >
                    ✎
                  </button>
                )}
              </div>
            )}
          </td>

          {/* Qty */}
          <td className="nvi-td nvi-td--num">
            <input
              type="number"
              step="0.01"
              className="nvi-input nvi-input--num"
              value={item.qty ?? ''}
              onChange={(e) => onUpdate && onUpdate(item.id, 'qty', e.target.value)}
              placeholder="1"
              disabled={!isEditMode}
              autoComplete="off"
            />
          </td>

          {/* Unit */}
          <td className="nvi-td nvi-td--unit">
            <input
              type="text"
              className="nvi-input nvi-input--unit"
              value={item.unit ?? ''}
              onChange={(e) => onUpdate && onUpdate(item.id, 'unit', e.target.value)}
              placeholder="LS"
              disabled={!isEditMode}
              autoComplete="off"
            />
          </td>

          {/* Rate */}
          <td className="nvi-td nvi-td--num">
            <input
              type="number"
              step="0.01"
              className="nvi-input nvi-input--num"
              value={item.rate ?? ''}
              onChange={(e) => onUpdate && onUpdate(item.id, 'rate', e.target.value)}
              placeholder="0.00"
              disabled={!isEditMode}
              autoComplete="off"
            />
          </td>

          {/* OHP flag (omitted only) */}
          {isOmitted && (
            <td className="nvi-td nvi-td--ohp">
              {isEditMode ? (
                <label className="nvi-ohp-label no-print">
                  <input
                    type="checkbox"
                    className="nvi-ohp-checkbox"
                    checked={!!item.includesOverheadProfit}
                    onChange={(e) => onUpdate && onUpdate(item.id, 'includesOverheadProfit', e.target.checked)}
                  />
                  <span className="nvi-ohp-text">{t('yes')}</span>
                </label>
              ) : (
                <span className={`nvi-ohp-badge ${item.includesOverheadProfit ? 'nvi-ohp-badge--yes' : 'nvi-ohp-badge--no'}`}>
                  {item.includesOverheadProfit ? t('yes') : t('no')}
                </span>
              )}
            </td>
          )}

          {/* Amount */}
          <td className="nvi-td nvi-td--amount">
            <span className={`nvi-amount ${isOmitted ? 'nvi-amount--neg' : 'nvi-amount--pos'}`}>
              {formatCurrency(amount)}
            </span>
          </td>

          {/* Delete */}
          {isEditMode && (
            <td className="nvi-td nvi-td--action no-print">
              <button
                type="button"
                className="nvi-del-btn"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove && onRemove(item.id); }}
                title={t('remove_item')}
                disabled={itemsCount === 0}
              >
                ×
              </button>
            </td>
          )}
        </tr>

        {/* Remarks row */}
        {isExpanded && (
          <tr className="nvi-remarks-row">
            <td colSpan={colSpan} className="nvi-td nvi-td--remarks">
              <div className="nvi-remarks-wrap">
                <span className="nvi-remarks-label">{t('remarks')}</span>
                {isEditMode ? (
                  <textarea
                    className="nvi-remarks-input"
                    value={item.remarks ?? ''}
                    onChange={(e) => onUpdate && onUpdate(item.id, 'remarks', e.target.value)}
                    placeholder={t('item_remarks_placeholder')}
                    rows={2}
                    autoComplete="off"
                  />
                ) : (
                  <div className="nvi-remarks-text">
                    {item.remarks || <span className="nvi-remarks-empty">—</span>}
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  },
  (p, n) => (
    p.item.id === n.item.id &&
    p.item.description === n.item.description &&
    p.item.qty === n.item.qty &&
    p.item.unit === n.item.unit &&
    p.item.rate === n.item.rate &&
    p.item.amount === n.item.amount &&
    p.item.remarks === n.item.remarks &&
    p.item.includesOverheadProfit === n.item.includesOverheadProfit &&
    p.isEditMode === n.isEditMode &&
    p.itemsCount === n.itemsCount &&
    p.isExpanded === n.isExpanded
  )
);

ItemRow.displayName = 'ItemRow';

export default ItemRow;