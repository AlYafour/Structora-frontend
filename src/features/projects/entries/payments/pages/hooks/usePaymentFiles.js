/**
 * usePaymentFiles Hook
 *
 * Manages payment file attachments
 */

import { useState, useCallback } from 'react';

/**
 * Hook for managing payment file attachments
 */
export function usePaymentFiles() {
  // New file uploads
  const [depositSlip, setDepositSlip] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [receiptVoucher, setReceiptVoucher] = useState(null);
  const [bankPaymentAttachments, setBankPaymentAttachments] = useState(null);

  // Existing file URLs (for edit mode)
  const [existingDepositSlip, setExistingDepositSlip] = useState(null);
  const [existingInvoiceFile, setExistingInvoiceFile] = useState(null);
  const [existingReceiptVoucher, setExistingReceiptVoucher] = useState(null);
  const [existingBankPaymentAttachments, setExistingBankPaymentAttachments] = useState(null);

  // Backend field names explicitly removed by the user
  const [deletedFiles, setDeletedFiles] = useState(new Set());

  const markFileDeleted = useCallback((backendFieldName) => {
    setDeletedFiles(prev => new Set([...prev, backendFieldName]));
  }, []);

  /**
   * Load existing files from payment data
   */
  const loadExistingFiles = useCallback(data => {
    if (data.deposit_slip) setExistingDepositSlip(data.deposit_slip);
    if (data.invoice_file) setExistingInvoiceFile(data.invoice_file);
    if (data.receipt_voucher) setExistingReceiptVoucher(data.receipt_voucher);
    if (data.bank_payment_attachments)
      setExistingBankPaymentAttachments(data.bank_payment_attachments);
  }, []);

  /**
   * Clear all files
   */
  const clearAllFiles = useCallback(() => {
    setDepositSlip(null);
    setInvoiceFile(null);
    setReceiptVoucher(null);
    setBankPaymentAttachments(null);
    setExistingDepositSlip(null);
    setExistingInvoiceFile(null);
    setExistingReceiptVoucher(null);
    setExistingBankPaymentAttachments(null);
    setDeletedFiles(new Set());
  }, []);

  /**
   * Get files object for FormData
   */
  const getFilesForSubmission = useCallback(() => {
    return {
      depositSlip,
      invoiceFile,
      receiptVoucher,
      bankPaymentAttachments,
      deletedFiles,
    };
  }, [depositSlip, invoiceFile, receiptVoucher, bankPaymentAttachments, deletedFiles]);

  return {
    // New files
    depositSlip,
    setDepositSlip,
    invoiceFile,
    setInvoiceFile,
    receiptVoucher,
    setReceiptVoucher,
    bankPaymentAttachments,
    setBankPaymentAttachments,
    // Existing files
    existingDepositSlip,
    setExistingDepositSlip,
    existingInvoiceFile,
    setExistingInvoiceFile,
    existingReceiptVoucher,
    setExistingReceiptVoucher,
    existingBankPaymentAttachments,
    setExistingBankPaymentAttachments,
    // Helper functions
    loadExistingFiles,
    clearAllFiles,
    getFilesForSubmission,
    markFileDeleted,
  };
}
