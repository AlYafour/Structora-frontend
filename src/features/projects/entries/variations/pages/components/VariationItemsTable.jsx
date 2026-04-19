/**
 * VariationItemsTable — Unified table with omit/add toggle
 *
 * State stays split (omittedItems / addedItems) for backend compatibility.
 * UI shows one table at a time; user switches with a toggle.
 */

import { memo, useState } from 'react';
import { formatMoney } from '../../../../../../utils/formatters';
import ItemRow from './ItemRow';

const VariationItemsTable = memo(({
  /* omitted */
  omittedItems,
  expandedOmittedItems,
  onUpdateOmittedItem,
  onRemoveOmittedItem,
  onAddOmittedItem,
  onToggleOmittedExpand,
  /* added */
  addedItems,
  expandedAddedItems,
  onUpdateAddedItem,
  onRemoveAddedItem,
  onAddAddedItem,
  onToggleAddedExpand,
  /* shared */
  isEditMode,
  t,
}) => {
  const [activeTab, setActiveTab] = useState('omitted');

  const isOmitted   = activeTab === 'omitted';
  const items       = isOmitted ? omittedItems  : addedItems;
  const expanded    = isOmitted ? expandedOmittedItems : expandedAddedItems;
  const onUpdate    = isOmitted ? onUpdateOmittedItem  : onUpdateAddedItem;
  const onRemove    = isOmitted ? onRemoveOmittedItem  : onRemoveAddedItem;
  const onAdd       = isOmitted ? onAddOmittedItem     : onAddAddedItem;
  const onToggle    = isOmitted ? onToggleOmittedExpand : onToggleAddedExpand;

  const totalOmitted = omittedItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalAdded   = addedItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const activeTotal  = isOmitted ? totalOmitted : totalAdded;

  // colspan = desc + qty + unit + rate + [ohp if omit] + amount + [action if edit]
  const colSpan = isOmitted
    ? (isEditMode ? 7 : 6)
    : (isEditMode ? 6 : 5);

  return (
    <div className="nvt-wrapper nvc-section">

      {/* ══════════ HEADER ══════════ */}
      <div className="nvt-header">

        {/* Toggle pills */}
        <div className="nvt-toggle">
          <button
            type="button"
            className={`nvt-toggle__btn nvt-toggle__btn--omit ${isOmitted ? 'nvt-toggle__btn--active' : ''}`}
            onClick={() => setActiveTab('omitted')}
          >
            <span className="nvt-toggle__icon">−</span>
            <span className="nvt-toggle__label">{t('omitted_items')}</span>
            {totalOmitted > 0 && (
              <span className="nvt-toggle__total nvt-toggle__total--neg">{formatMoney(totalOmitted)}</span>
            )}
            {omittedItems.length > 0 && (
              <span className="nvt-toggle__count">{omittedItems.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`nvt-toggle__btn nvt-toggle__btn--add ${!isOmitted ? 'nvt-toggle__btn--active' : ''}`}
            onClick={() => setActiveTab('added')}
          >
            <span className="nvt-toggle__icon">+</span>
            <span className="nvt-toggle__label">{t('added_items')}</span>
            {totalAdded > 0 && (
              <span className="nvt-toggle__total nvt-toggle__total--pos">{formatMoney(totalAdded)}</span>
            )}
            {addedItems.length > 0 && (
              <span className="nvt-toggle__count">{addedItems.length}</span>
            )}
          </button>
        </div>

        {/* Right: total + add button */}
        <div className="nvt-header__right">
          <div className="nvt-header__summary">
            <span className="nvt-header__summary-label">
              {isOmitted ? t('total_omitted') : t('total_added')}
            </span>
            <span className={`nvt-header__summary-value ${isOmitted ? 'nvt-val--neg' : 'nvt-val--pos'}`}>
              {formatMoney(activeTotal)}
            </span>
          </div>
          {isEditMode && (
            <button
              type="button"
              className={`nvt-add-btn ${isOmitted ? 'nvt-add-btn--omit' : 'nvt-add-btn--add'}`}
              onClick={(e) => { e.preventDefault(); onAdd(); }}
            >
              + {t('add_item')}
            </button>
          )}
        </div>

      </div>

      {/* ══════════ TABLE ══════════ */}
      <div className="nvt-table-wrap">
        <table className="nvt-table">
          <thead>
            <tr className={`nvt-thead ${isOmitted ? 'nvt-thead--omit' : 'nvt-thead--add'}`}>
              <th className="nvt-th nvt-th--desc">{t('item_description')}</th>
              <th className="nvt-th nvt-th--num">{t('quantity')}</th>
              <th className="nvt-th nvt-th--unit">{t('unit')}</th>
              <th className="nvt-th nvt-th--rate">{t('rate')}</th>
              {isOmitted && (
                <th className="nvt-th nvt-th--ohp">{t('omitted_includes_overhead_profit')}</th>
              )}
              <th className="nvt-th nvt-th--amount">{t('amount')}</th>
              {isEditMode && <th className="nvt-th nvt-th--action no-print" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="nvt-td nvt-empty">
                  <span className="nvt-empty__icon">{isOmitted ? '⊖' : '⊕'}</span>
                  <span className="nvt-empty__text">{t('no_items')}</span>
                  {isEditMode && (
                    <button
                      type="button"
                      className={`nvt-add-btn ${isOmitted ? 'nvt-add-btn--omit' : 'nvt-add-btn--add'} no-print`}
                      onClick={(e) => { e.preventDefault(); onAdd(); }}
                    >
                      + {t('add_item')}
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <ItemRow
                  key={`${activeTab}-${item.id}`}
                  item={item}
                  index={index}
                  isOmitted={isOmitted}
                  isEditMode={isEditMode}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  itemsCount={items.length}
                  t={t}
                  isExpanded={expanded.has(item.id)}
                  onToggleExpand={onToggle}
                  colSpan={colSpan}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ══════════ FOOTER ══════════ */}
      <div className={`nvt-footer ${isOmitted ? 'nvt-footer--omit' : 'nvt-footer--add'}`}>
        {/* mini summary of both sides */}
        <div className="nvt-footer__both">
          <span className="nvt-footer__pill nvt-footer__pill--neg">
            − {formatMoney(totalOmitted)}
            <span className="nvt-footer__pill-lbl"> {t('omitted')}</span>
          </span>
          <span className="nvt-footer__sep">·</span>
          <span className="nvt-footer__pill nvt-footer__pill--pos">
            + {formatMoney(totalAdded)}
            <span className="nvt-footer__pill-lbl"> {t('added')}</span>
          </span>
        </div>
        <div className="nvt-footer__active">
          <span className="nvt-footer__active-lbl">
            {isOmitted ? t('total_omitted') : t('total_added')}
          </span>
          <span className={`nvt-footer__active-val ${isOmitted ? 'nvt-val--neg' : 'nvt-val--pos'}`}>
            {formatMoney(activeTotal)}
          </span>
        </div>
      </div>

    </div>
  );
});

VariationItemsTable.displayName = 'VariationItemsTable';

export default VariationItemsTable;
