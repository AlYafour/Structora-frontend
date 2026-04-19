/**
 * InvoiceAllocationTable Component
 *
 * Table for managing invoice allocations
 */

import { memo } from 'react';
import Button from '../../../../../../components/common/Button';
import CurrencyField from '../../../../../../components/forms/CurrencyField';
import { formatMoney } from '../../../../../../utils/formatters';
import { removeCommas } from '../../../../../../utils/formatters/number';
import './InvoiceAllocationTable.css';

function getRemainingStatusClass(remainingAfter) {
 if (remainingAfter === 0) return 'invoice-allocation__remaining-value--paid';
 if (remainingAfter > 0) return 'invoice-allocation__remaining-value--partial';
 return 'invoice-allocation__remaining-value--over';
}

const InvoiceAllocationTable = memo(({
 allocations,
 allocationMode,
 actualInvoices,
 onUpdateAmount,
 onRemoveAllocation,
 onAddInvoice,
 onClickRemaining,
 t
}) => {
 if (allocations.length === 0 && allocationMode !== 'manual') {
 return null;
 }

 return (
 <div className="invoice-allocation">
 {/* Add Invoice (Manual Mode) */}
 {allocationMode === 'manual' && actualInvoices && actualInvoices.length > 0 && (
  <div className="invoice-allocation__add-row">
   <label className="invoice-allocation__add-label">
    {t('add_invoice')}
   </label>
   <select
    className="prj-select w-full"
    value=""
    onChange={e => {
     if (e.target.value) {
      onAddInvoice(e.target.value);
      e.target.value = '';
     }
    }}
   >
    <option value="">{t('select_invoice_to_add')}</option>
    {actualInvoices
     .filter(inv => !allocations.find(alloc => alloc.invoice_id === inv.id))
     .map(invoice => (
      <option key={invoice.id} value={invoice.id}>
       {invoice.invoice_number || `${t('invoice')} #${invoice.id}`} -{' '}
       {formatMoney(invoice.amount)} ({t('remaining_amount')}:{' '}
       {formatMoney(invoice.remaining_amount || invoice.amount)})
      </option>
     ))}
   </select>
  </div>
 )}

 {/* Allocations Table */}
 {allocations.length > 0 && (
  <div className="invoice-allocation__table-wrap">
   <table className="invoice-allocation__table">
    <thead>
     <tr className="invoice-allocation__header-row">
      <th className="invoice-allocation__th">{t('invoice_number')}</th>
      <th className="invoice-allocation__th">{t('total_amount')}</th>
      <th className="invoice-allocation__th">{t('remaining_amount')}</th>
      <th className="invoice-allocation__th">{t('allocated_amount')}</th>
      <th className="invoice-allocation__th">{t('remaining_after_allocation')}</th>
      {allocationMode === 'manual' && (
       <th className="invoice-allocation__th invoice-allocation__th--center">
        {t('action')}
       </th>
      )}
     </tr>
    </thead>
    <tbody>
     {allocations.map(alloc => {
      const allocated = parseFloat(removeCommas(alloc.allocated_amount || '0')) || 0;
      const remainingAfter = Math.max(0, alloc.remaining_amount - allocated);
      const statusClass = getRemainingStatusClass(remainingAfter);

      return (
       <tr key={alloc.invoice_id} className="invoice-allocation__body-row">
        <td className="invoice-allocation__td invoice-allocation__invoice-number">
         {alloc.invoice_number}
        </td>
        <td className="invoice-allocation__td">
         {formatMoney(alloc.total_amount)}
        </td>
        <td className="invoice-allocation__td invoice-allocation__remaining-original">
         {allocationMode === 'manual' && onClickRemaining ? (
          <span
           className="invoice-allocation__remaining-clickable"
           title={t('click_to_fill_amount')}
           onClick={() => onClickRemaining(alloc.invoice_id, alloc.remaining_amount)}
          >
           {formatMoney(alloc.remaining_amount)}
          </span>
         ) : (
          formatMoney(alloc.remaining_amount)
         )}
        </td>
        <td className="invoice-allocation__td">
         {allocationMode === 'manual' ? (
          <CurrencyField
           value={alloc.allocated_amount}
           onChange={value => onUpdateAmount(alloc.invoice_id, value)}
           placeholder="0.00"
           showCurrency={false}
           showArabicWords={false}
          />
         ) : (
          <span className="invoice-allocation__allocated-display">
           {formatMoney(allocated)}
          </span>
         )}
        </td>
        <td className="invoice-allocation__td">
         <div className={`invoice-allocation__remaining-value ${statusClass}`}>
          {formatMoney(remainingAfter)}
         </div>
         {remainingAfter === 0 && (
          <div className="invoice-allocation__fully-paid">
           ✓ {t('fully_paid')}
          </div>
         )}
        </td>
        {allocationMode === 'manual' && (
         <td className="invoice-allocation__td invoice-allocation__td--center">
          <Button
           type="button"
           variant="danger"
           size="sm"
           onClick={() => onRemoveAllocation(alloc.invoice_id)}
          >
           {t('remove')}
          </Button>
         </td>
        )}
       </tr>
      );
     })}
    </tbody>
   </table>
  </div>
 )}
 </div>
 );
});

InvoiceAllocationTable.displayName = 'InvoiceAllocationTable';

export default InvoiceAllocationTable;
