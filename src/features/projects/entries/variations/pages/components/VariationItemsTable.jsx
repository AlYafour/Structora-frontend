import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../../../../../utils/formatters';
import ItemRow from './ItemRow';
import DirhamsIcon from '../../../../../../components/common/DirhamsIcon';

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
  const { i18n } = useTranslation();

  const formatCurrency = (value) => {
    const str = formatMoney(value, { lang: i18n.language });
    if (i18n.language === 'en') {
      const numPart = str.replace(/AED\s?/, '').trim();
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{numPart} <DirhamsIcon size={10} color="#374151" /></span>;
    }
    return str;
  };

  const isOmitted = activeTab === 'omitted';
  const items = isOmitted ? omittedItems : addedItems;
  const expanded = isOmitted ? expandedOmittedItems : expandedAddedItems;
  const onUpdate = isOmitted ? onUpdateOmittedItem : onUpdateAddedItem;
  const onRemove = isOmitted ? onRemoveOmittedItem : onRemoveAddedItem;
  const onAdd = isOmitted ? onAddOmittedItem : onAddAddedItem;
  const onToggle = isOmitted ? onToggleOmittedExpand : onToggleAddedExpand;

  const totalOmitted = omittedItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalAdded = addedItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const activeTotal = isOmitted ? totalOmitted : totalAdded;

  // colspan = desc + qty + unit + rate + [ohp if omit] + amount + [action if edit]
  const colSpan = isOmitted
    ? (isEditMode ? 7 : 6)
    : (isEditMode ? 6 : 5);

  return (
    <div className="nvt-wrapper nvc-section">
      <div className="nvt-header">
        <div className="nvt-toggle">
          <button
            type="button"
            className={`nvt-toggle__btn nvt-toggle__btn--omit ${isOmitted ? 'nvt-toggle__btn--active' : ''}`}
            onClick={() => setActiveTab('omitted')}
          >
            <span className="nvt-toggle__icon">−</span>
            <span className="nvt-toggle__label">{t('omitted_items')}</span>
            {totalOmitted > 0 && (
              <span className="nvt-toggle__total nvt-toggle__total--neg">
                {formatCurrency(totalOmitted)}
              </span>
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
              <span className="nvt-toggle__total nvt-toggle__total--pos">
                {formatCurrency(totalAdded)}
              </span>
            )}
            {addedItems.length > 0 && (
              <span className="nvt-toggle__count">{addedItems.length}</span>
            )}
          </button>
        </div>

        <div className="nvt-header__right">
          <div className="nvt-header__summary">
            <span className="nvt-header__summary-label">
              {isOmitted ? t('total_omitted') : t('total_added')}
            </span>
            <span className={`nvt-header__summary-value ${isOmitted ? 'nvt-val--neg' : 'nvt-val--pos'}`}>
              {formatCurrency(activeTotal)}
            </span>
          </div>
          {isEditMode && (
            <button
              type="button"
              className={`nvt-add-btn ${isOmitted ? 'nvt-add-btn--omit' : 'nvt-add-btn--add'}`}
              onClick={(e) => {
                e.preventDefault();
                onAdd();
              }}
            >
              + {t('add_item')}
            </button>
          )}
        </div>
      </div>

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
                      onClick={(e) => {
                        e.preventDefault();
                        onAdd();
                      }}
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

      <div className={`nvt-footer ${isOmitted ? 'nvt-footer--omit' : 'nvt-footer--add'}`}>
        <div className="nvt-footer__both">
          <span className="nvt-footer__pill nvt-footer__pill--neg">
            − {formatCurrency(totalOmitted)}
            <span className="nvt-footer__pill-lbl"> {t('omitted')}</span>
          </span>
          <span className="nvt-footer__sep">·</span>
          <span className="nvt-footer__pill nvt-footer__pill--pos">
            + {formatCurrency(totalAdded)}
            <span className="nvt-footer__pill-lbl"> {t('added')}</span>
          </span>
        </div>
        <div className="nvt-footer__active">
          <span className="nvt-footer__active-lbl">
            {isOmitted ? t('total_omitted') : t('total_added')}
          </span>
          <span className={`nvt-footer__active-val ${isOmitted ? 'nvt-val--neg' : 'nvt-val--pos'}`}>
            {formatCurrency(activeTotal)}
          </span>
        </div>
      </div>
    </div>
  );
});

VariationItemsTable.displayName = 'VariationItemsTable';

export default VariationItemsTable;