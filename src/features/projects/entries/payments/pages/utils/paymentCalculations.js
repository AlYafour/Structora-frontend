/**
 * Payment Calculations Utilities
 *
 * Financial calculations for payment allocations
 */

import { removeCommas } from '../../../../../../utils/formatters/number';

/**
 * Calculate total allocated amount from allocations array
 */
export function calculateTotalAllocated(allocations) {
  return allocations.reduce((sum, alloc) => {
    const amount = parseFloat(removeCommas(alloc.allocated_amount || '0')) || 0;
    return sum + amount;
  }, 0);
}

/**
 * Calculate credit balance (payment amount - total allocated)
 */
export function calculateCreditBalance(paymentAmount, totalAllocated) {
  return paymentAmount - totalAllocated;
}

/**
 * Auto-allocate payment to invoices using FIFO (First In, First Out)
 */
export function autoAllocatePayment(paymentAmount, invoices, formatNumberWithCommas) {
  if (!invoices || invoices.length === 0) return [];

  // Sort invoices by date (oldest first), then by ID
  const sortedInvoices = [...invoices].sort((a, b) => {
    const dateA = new Date(a.invoice_date);
    const dateB = new Date(b.invoice_date);
    return dateA - dateB || a.id - b.id;
  });

  let remainingPayment = paymentAmount;
  const allocations = [];

  for (const invoice of sortedInvoices) {
    if (remainingPayment <= 0.01) break;

    const invoiceRemaining = parseFloat(invoice.remaining_amount || 0);
    if (invoiceRemaining <= 0.01) continue;

    const allocationAmount = Math.min(remainingPayment, invoiceRemaining);
    allocations.push({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number || `#${invoice.id}`,
      total_amount: invoice.amount,
      remaining_amount: invoiceRemaining,
      allocated_amount: formatNumberWithCommas(String(allocationAmount))
    });

    remainingPayment -= allocationAmount;
  }

  return allocations;
}

/**
 * Calculate maximum allocation amount for an invoice
 */
export function calculateMaxAllocation(allocation, paymentAmount, totalAllocated) {
  const currentAllocation = parseFloat(removeCommas(allocation.allocated_amount || '0')) || 0;
  const availablePayment = paymentAmount - totalAllocated + currentAllocation;
  return Math.min(allocation.remaining_amount, availablePayment);
}

/**
 * Validate allocation amount
 */
export function validateAllocationAmount(value, maxAmount) {
  const numValue = parseFloat(removeCommas(value || '0')) || 0;
  return Math.min(Math.max(0, numValue), maxAmount);
}

/**
 * Normalize invoice data from API
 */
export function normalizeInvoices(invoices) {
  if (!Array.isArray(invoices)) return [];

  return invoices.map(inv => ({
    ...inv,
    paid_amount: parseFloat(inv.paid_amount || 0),
    remaining_amount: parseFloat(inv.remaining_amount || inv.amount || 0)
  }));
}

/**
 * Filter invoices with remaining balance
 */
export function filterAvailableInvoices(invoices) {
  return normalizeInvoices(invoices).filter(inv => inv.remaining_amount > 0.00001);
}

/**
 * Build allocations data for API submission
 */
export function buildAllocationsData(allocations, allocationMode, t) {
  return allocations
    .filter(alloc => {
      const amount = parseFloat(removeCommas(alloc.allocated_amount || '0')) || 0;
      return amount > 0.01;
    })
    .map(alloc => ({
      invoice_id: alloc.invoice_id,
      amount: parseFloat(removeCommas(alloc.allocated_amount || '0')) || 0,
      notes: allocationMode === 'auto'
        ? (t('auto_allocate_fifo_description') || 'تم التوزيع تلقائياً حسب FIFO')
        : (t('manual_allocate_description') || 'تم التوزيع يدوياً')
    }));
}

export { initializeAllocationsFromInvoices } from './paymentFormatters';
