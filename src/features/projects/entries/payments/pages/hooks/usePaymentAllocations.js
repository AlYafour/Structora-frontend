/**
 * usePaymentAllocations Hook
 *
 * Manages invoice allocations for payments
 */

import { useState, useCallback, useMemo } from 'react';
import { formatNumberWithCommas } from '../../../../../../utils/formatters/number';
import {
  calculateTotalAllocated,
  calculateCreditBalance,
  autoAllocatePayment,
  calculateMaxAllocation,
  validateAllocationAmount
} from '../utils/paymentCalculations';

/**
 * Hook for managing payment allocations
 */
export function usePaymentAllocations() {
  const [allocations, setAllocations] = useState([]);
  const [allocationMode, setAllocationMode] = useState('auto'); // 'auto' or 'manual'

  /**
   * Calculate total allocated amount
   */
  const totalAllocated = useMemo(() => {
    return calculateTotalAllocated(allocations);
  }, [allocations]);

  /**
   * Calculate credit balance
   */
  const getCreditBalance = useCallback(
    paymentAmount => {
      return calculateCreditBalance(paymentAmount, totalAllocated);
    },
    [totalAllocated]
  );

  /**
   * Auto-allocate payment using FIFO
   */
  const handleAutoAllocate = useCallback((paymentAmount, invoices) => {
    const newAllocations = autoAllocatePayment(paymentAmount, invoices, formatNumberWithCommas);
    setAllocations(newAllocations);
    setAllocationMode('auto');
  }, []);

  /**
   * Update allocation amount for specific invoice
   */
  const updateAllocationAmount = useCallback(
    (invoiceId, value, paymentAmount) => {
      setAllocations(prev =>
        prev.map(alloc => {
          if (alloc.invoice_id === invoiceId) {
            const maxAmount = calculateMaxAllocation(alloc, paymentAmount, totalAllocated);
            const validatedValue = validateAllocationAmount(value, maxAmount);
            return {
              ...alloc,
              allocated_amount: formatNumberWithCommas(String(validatedValue))
            };
          }
          return alloc;
        })
      );
    },
    [totalAllocated]
  );

  /**
   * Remove allocation
   */
  const removeAllocation = useCallback(invoiceId => {
    setAllocations(prev => prev.filter(alloc => alloc.invoice_id !== invoiceId));
  }, []);

  /**
   * Add invoice to allocations
   */
  const addInvoiceToAllocations = useCallback((invoice) => {
    if (!invoice) return;

    const exists = allocations.find(alloc => alloc.invoice_id === invoice.id);
    if (exists) return;

    setAllocations(prev => [
      ...prev,
      {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number || `#${invoice.id}`,
        total_amount: invoice.amount,
        remaining_amount: invoice.remaining_amount,
        allocated_amount: ''
      }
    ]);
    setAllocationMode('manual');
  }, [allocations]);

  /**
   * Initialize allocations from invoices (manual mode)
   */
  const initializeAllocations = useCallback(invoices => {
    setAllocations(
      invoices.map(inv => ({
        invoice_id: inv.id,
        invoice_number: inv.invoice_number || `#${inv.id}`,
        total_amount: inv.amount,
        remaining_amount: inv.remaining_amount,
        allocated_amount: ''
      }))
    );
    setAllocationMode('manual');
  }, []);

  /**
   * Clear all allocations
   */
  const clearAllocations = useCallback(() => {
    setAllocations([]);
    setAllocationMode('auto');
  }, []);

  return {
    allocations,
    allocationMode,
    totalAllocated,
    getCreditBalance,
    handleAutoAllocate,
    updateAllocationAmount,
    removeAllocation,
    addInvoiceToAllocations,
    initializeAllocations,
    clearAllocations,
    setAllocations,
    setAllocationMode
  };
}
